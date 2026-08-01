from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import ExperimentGroup, FormBStudyPhase, Species, Strain
from tests.formb_payloads import step1_body, step2_body, study_plan_body, upload_required_form_b_attachments, wizard_steps_after_step1


def _register_and_login(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Dr. Study Plan Test",
        "email": f"studyplan_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }
    client.post("/auth/register-investigator", json=payload)
    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
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
    return headers, payload


def test_form_b_study_plan_save_and_annexure_pdf(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    start_res = client.post("/formb/start", headers=headers)
    form_b_id = start_res.json()["id"]
    client.post("/formb/step-1", json=step1_body(form_b_id, payload), headers=headers)
    client.post("/formb/step-2", json=step2_body(form_b_id), headers=headers)

    suffix = uuid4().hex[:4]
    with SessionLocal() as db:
        species = Species(name=f"Mouse-{suffix}")
        db.add(species)
        db.flush()
        strain = Strain(name=f"C57-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        species_id = species.id
        strain_id = strain.id

    save_res = client.put(
        f"/formb/{form_b_id}/study-plan",
        json=study_plan_body(form_b_id, species_id=species_id, strain_id=strain_id),
        headers=headers,
    )
    assert save_res.status_code == 200, save_res.text
    body = save_res.json()
    assert body["phase_count"] == 2
    assert body["group_count"] == 4
    assert body["total_animals"] == 20

    read_res = client.get(f"/formb/{form_b_id}/study-plan", headers=headers)
    assert read_res.status_code == 200, read_res.text
    assert len(read_res.json()["phases"]) == 2

    pdf_res = client.get(f"/formb/{form_b_id}/study-plan/annexure.pdf", headers=headers)
    assert pdf_res.status_code == 200, pdf_res.text
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")


def test_form_b_annexure_pdf_includes_animal_summary_table(client, monkeypatch):
    from crud.formb_documents import render_study_plan_annexure_pdf
    from crud.formb_study_plan import load_study_plan_for_pdf

    headers, payload = _register_and_login(client, monkeypatch)
    form_b_id = client.post("/formb/start", headers=headers).json()["id"]
    client.post("/formb/step-1", json=step1_body(form_b_id, payload), headers=headers)

    suffix = uuid4().hex[:4]
    with SessionLocal() as db:
        species = Species(name=f"Summary-{suffix}")
        db.add(species)
        db.flush()
        strain = Strain(name=f"Strain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        species_id = species.id
        strain_id = strain.id

    body = study_plan_body(form_b_id, species_id=species_id, strain_id=strain_id)
    body["phases"][0]["groups"][0]["fates"] = [
        {"fate_type": "sacrifice", "count": 3, "method_or_destination": "CO2", "timing": "Week 4"},
        {"fate_type": "rehabilitation", "count": 2, "method_or_destination": "Adoption", "timing": "Week 4"},
    ]
    body["phases"][0]["groups"][0]["animal_count"] = 5

    save_res = client.put(f"/formb/{form_b_id}/study-plan", json=body, headers=headers)
    assert save_res.status_code == 200, save_res.text

    with SessionLocal() as db:
        plan = load_study_plan_for_pdf(db, form_b_id)
        pdf_bytes = render_study_plan_annexure_pdf(db, form_b_id)

    assert pdf_bytes.startswith(b"%PDF")
    summary = plan["animal_summary"]
    assert summary["total_used"] == 20
    assert summary["sacrificed"] >= 13
    assert summary["rehabilitated"] >= 2

    read_res = client.get(f"/formb/{form_b_id}/study-plan", headers=headers)
    saved_endpoints = read_res.json()["phases"][0]["groups"][0]["endpoints"]
    assert saved_endpoints
    assert saved_endpoints[0]["parameter_name"]
    assert saved_endpoints[0]["schedule_detail"]


def test_form_b_study_plan_rejects_mismatched_fate_counts(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    form_b_id = client.post("/formb/start", headers=headers).json()["id"]
    client.post("/formb/step-1", json=step1_body(form_b_id, payload), headers=headers)

    suffix = uuid4().hex[:4]
    with SessionLocal() as db:
        species = Species(name=f"RatSP-{suffix}")
        db.add(species)
        db.flush()
        strain = Strain(name=f"WistarSP-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        species_id = species.id
        strain_id = strain.id

    invalid = study_plan_body(form_b_id, species_id=species_id, strain_id=strain_id)
    invalid["phases"][0]["groups"][0]["fates"][0]["count"] = 1

    save_res = client.put(f"/formb/{form_b_id}/study-plan", json=invalid, headers=headers)
    assert save_res.status_code == 400
    assert "fate counts" in save_res.json()["detail"].lower()


def test_experiment_groups_seeded_on_protocol_generation(client, monkeypatch, iaec_auth_headers):
    inv_headers, payload = _register_and_login(client, monkeypatch)
    start = client.post("/formb/start", headers=inv_headers).json()
    form_b_id = start["id"]
    project_id = start["project_id"]
    client.post("/formb/step-1", json=step1_body(form_b_id, payload), headers=inv_headers)

    suffix = uuid4().hex[:4]
    with SessionLocal() as db:
        species = Species(name=f"RatSP-{suffix}")
        db.add(species)
        db.flush()
        strain = Strain(name=f"WistarSP-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        species_id = species.id
        strain_id = strain.id

    upload_required_form_b_attachments(client, inv_headers, form_b_id)
    for path, body in wizard_steps_after_step1(form_b_id):
        res = client.post(path, json=body, headers=inv_headers)
        assert res.status_code == 200, res.text
        if path == "/formb/step-2":
            plan_res = client.put(
                f"/formb/{form_b_id}/study-plan",
                json=study_plan_body(form_b_id, species_id=species_id, strain_id=strain_id),
                headers=inv_headers,
            )
            assert plan_res.status_code == 200, plan_res.text

    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=inv_headers)
    assert submit_res.status_code == 200, submit_res.text

    meeting_res = client.post(
        "/iaec/meeting",
        json={"date": "2026-08-15", "meeting_number": f"SP-{suffix}", "minutes": "Study plan seed test"},
        headers=iaec_auth_headers,
    )
    meeting_id = meeting_res.json()["id"]
    client.patch(
        f"/iaec/form-b/{form_b_id}/meeting",
        json={"meeting_id": meeting_id},
        headers=iaec_auth_headers,
    )
    client.put(
        f"/iaec/form-b/{form_b_id}/decision",
        json={"meeting_id": meeting_id, "decision": "approved", "approved_animal_count": 20},
        headers=iaec_auth_headers,
    )
    protocol_res = client.post(
        f"/iaec/form-b/{form_b_id}/protocol-number",
        headers=iaec_auth_headers,
    )
    assert protocol_res.status_code == 200, protocol_res.text

    with SessionLocal() as db:
        groups = db.query(ExperimentGroup).filter(ExperimentGroup.project_id == project_id).all()
        phases = db.query(FormBStudyPhase).filter(FormBStudyPhase.form_b_id == form_b_id).count()
        assert phases == 2
        assert len(groups) == 4
        assert all(group.form_b_study_group_id is not None for group in groups)
