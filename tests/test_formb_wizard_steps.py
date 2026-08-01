from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import FormB, IAECProject, Species, Strain
from tests.formb_payloads import (
    STEP3_BODY,
    STEP3_REQUIREMENT,
    step1_body,
    step2_body,
    study_plan_body,
    upload_required_form_b_attachments,
    wizard_steps_after_step1,
)


def _register_and_login(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Dr. Wizard Steps",
        "email": f"wizard_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }
    client.post("/auth/register-investigator", json=payload)
    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, payload


def _complete_profile(client, headers):
    client.put(
        "/investigator-profile/me",
        json={
            "institution_name": "LMCP",
            "department": "Pharmacology",
            "designation": "Assistant Professor",
            "qualification": "PhD",
            "is_lmcp_faculty": True,
        },
        headers=headers,
    )


def _start_form_b(client, headers, payload):
    start_res = client.post("/formb/start", headers=headers)
    assert start_res.status_code == 200, start_res.text
    form_b_id = start_res.json()["id"]

    step1_res = client.post(
        "/formb/step-1",
        json=step1_body(form_b_id, payload),
        headers=headers,
    )
    assert step1_res.status_code == 200, step1_res.text
    return form_b_id


def _save_steps_2_to_7(client, headers, form_b_id, species_name=None, strain_name=None):
    suffix = uuid4().hex[:4]
    species_name = species_name or f"Rat-{suffix}"
    strain_name = strain_name or f"Wistar-{suffix}"

    with SessionLocal() as db:
        species = db.query(Species).filter(Species.name == species_name).first()
        if species is None:
            species = Species(name=species_name)
            db.add(species)
            db.flush()
        strain = (
            db.query(Strain)
            .filter(Strain.name == strain_name, Strain.species_id == species.id)
            .first()
        )
        if strain is None:
            strain = Strain(name=strain_name, species_id=species.id)
            db.add(strain)
        db.commit()
        species_id = species.id
        strain_id = strain.id

    for path, body in wizard_steps_after_step1(form_b_id):
        res = client.post(path, json=body, headers=headers)
        assert res.status_code == 200, res.text
        if path == "/formb/step-2":
            plan_res = client.put(
                f"/formb/{form_b_id}/study-plan",
                json=study_plan_body(form_b_id, species_id=species_id, strain_id=strain_id),
                headers=headers,
            )
            assert plan_res.status_code == 200, plan_res.text


def test_form_b_wizard_steps_review_and_submit(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    _complete_profile(client, headers)
    form_b_id = _start_form_b(client, headers, payload)

    suffix = uuid4().hex[:4]
    species_name = f"Rat-{suffix}"
    strain_name = f"Wistar-{suffix}"
    with SessionLocal() as db:
        species = Species(name=species_name)
        db.add(species)
        db.flush()
        db.add(Strain(name=strain_name, species_id=species.id))
        db.commit()

    _save_steps_2_to_7(client, headers, form_b_id, species_name, strain_name)

    review_res = client.get(f"/formb/{form_b_id}/review", headers=headers)
    assert review_res.status_code == 200, review_res.text
    review = review_res.json()
    assert review["form_b_id"] == form_b_id
    assert review["submitted"] is False
    assert review["step2"]["title"] == "Pain study"
    assert review["step3"]["requirements"][0]["species"] == species_name
    assert review["step7"]["cpcsea_adherence"] == "Yes"

    upload_required_form_b_attachments(client, headers, form_b_id)
    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 200, submit_res.text

    review_after = client.get(f"/formb/{form_b_id}/review", headers=headers).json()
    assert review_after["submitted"] is True

    with SessionLocal() as db:
        project = (
            db.query(IAECProject)
            .join(FormB, FormB.project_id == IAECProject.id)
            .filter(FormB.id == form_b_id)
            .first()
        )
        assert project is not None
        assert project.status == "submitted"
        assert project.title == "Pain study"

        form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
        assert form_b.submitted_at is not None
        assert len(form_b.animal_requirements) == 1
        assert form_b.animal_requirements[0].count == 20


def test_form_b_step3_supports_multiple_animal_requirements(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    _complete_profile(client, headers)
    form_b_id = _start_form_b(client, headers, payload)

    suffix = uuid4().hex[:4]
    rat_name = f"Rat-{suffix}"
    mouse_name = f"Mouse-{suffix}"
    wistar_name = f"Wistar-{suffix}"
    balbc_name = f"BALB-c-{suffix}"

    with SessionLocal() as db:
        rat = Species(name=rat_name)
        mouse = Species(name=mouse_name)
        db.add(rat)
        db.add(mouse)
        db.flush()
        wistar = Strain(name=wistar_name, species_id=rat.id)
        balbc = Strain(name=balbc_name, species_id=mouse.id)
        db.add(wistar)
        db.add(balbc)
        db.commit()
        rat_id = rat.id
        wistar_id = wistar.id
        mouse_id = mouse.id
        balbc_id = balbc.id

    from tests.formb_payloads import study_plan_animal_rationale, study_plan_body

    study_plan = study_plan_body(form_b_id, species_id=rat_id, strain_id=wistar_id)
    study_plan["animal_rationale"] = study_plan_animal_rationale(20)
    study_plan["phases"] = [
        {
            **study_plan["phases"][0],
            "animal_cap": 20,
            "groups": [
                {
                    **study_plan["phases"][0]["groups"][0],
                    "animal_count": 12,
                    "species_id": rat_id,
                    "strain_id": wistar_id,
                    "fates": [{**study_plan["phases"][0]["groups"][0]["fates"][0], "count": 12}],
                },
                {
                    **study_plan["phases"][0]["groups"][1],
                    "animal_count": 8,
                    "species_id": mouse_id,
                    "strain_id": balbc_id,
                    "fates": [{**study_plan["phases"][0]["groups"][1]["fates"][0], "count": 8}],
                },
            ],
        }
    ]
    plan_res = client.put(f"/formb/{form_b_id}/study-plan", json=study_plan, headers=headers)
    assert plan_res.status_code == 200, plan_res.text

    review = client.get(f"/formb/{form_b_id}/review", headers=headers).json()
    assert len(review["step3"]["requirements"]) == 2
    assert review["step3"]["requirements"][0]["number_required"] == 12
    assert review["step3"]["requirements"][1]["number_required"] == 8

    with SessionLocal() as db:
        form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
        assert len(form_b.animal_requirements) == 2
        counts = sorted(row.count for row in form_b.animal_requirements)
        assert counts == [8, 12]


def test_form_b_submit_requires_all_steps(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    _complete_profile(client, headers)
    form_b_id = _start_form_b(client, headers, payload)

    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 400
    assert "missing" in submit_res.json()["detail"].lower()


def test_form_b_cannot_edit_after_submit(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    _complete_profile(client, headers)
    form_b_id = _start_form_b(client, headers, payload)
    _save_steps_2_to_7(client, headers, form_b_id)

    upload_required_form_b_attachments(client, headers, form_b_id)
    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 200, submit_res.text

    edit_res = client.post(
        "/formb/step-2",
        json={
            **step2_body(form_b_id),
            "title": "Updated title",
            "duration_months": 6,
            "funding_agency": "ICMR",
            "summary": "Updated",
            "objectives": "Updated",
            "expected_outcomes": "Updated",
        },
        headers=headers,
    )
    assert edit_res.status_code == 400
    assert "submitted" in edit_res.json()["detail"].lower()
