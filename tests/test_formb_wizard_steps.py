from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import FormB, IAECProject, Species, Strain


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
        },
        headers=headers,
    )


def _start_form_b(client, headers, payload):
    start_res = client.post("/formb/start", headers=headers)
    assert start_res.status_code == 200, start_res.text
    form_b_id = start_res.json()["id"]

    step1_res = client.post(
        "/formb/step-1",
        json={
            "form_b_id": form_b_id,
            "establishment_name": "LMCP",
            "registration_number": "REG-001",
            "principal_investigator": payload["name"],
            "designation": "Assistant Professor",
            "department": "Pharmacology",
            "contact_email": payload["email"],
            "contact_phone": "9999999999",
            "qualifications": "PhD",
            "experience": "6 years",
        },
        headers=headers,
    )
    assert step1_res.status_code == 200, step1_res.text
    return form_b_id


def _save_steps_2_to_7(client, headers, form_b_id, species_name="Rat", strain_name="Wistar"):
    steps = [
        (
            "/formb/step-2",
            {
                "form_b_id": form_b_id,
                "title": "Pain study",
                "duration_months": 12,
                "funding_agency": "DST",
                "summary": "Study summary",
                "objectives": "Study objectives",
                "expected_outcomes": "Expected outcomes",
            },
        ),
        (
            "/formb/step-3",
            {
                "form_b_id": form_b_id,
                "species": species_name,
                "strain": strain_name,
                "sex": "Both",
                "age": "8-10 weeks",
                "weight": "200-250 g",
                "number_required": 20,
                "source": "In-house",
                "justification": "Required for study",
            },
        ),
        (
            "/formb/step-4",
            {
                "form_b_id": form_b_id,
                "procedure_description": "Behavioral testing",
                "pain_category": "B",
                "anaesthesia": "None",
                "analgesia": "Meloxicam",
                "euthanasia_method": "CO2",
                "alternatives_considered": "Cell culture",
                "rationale_3rs": "Replacement not feasible",
            },
        ),
        (
            "/formb/step-5",
            {
                "form_b_id": form_b_id,
                "housing_conditions": "Standard cages",
                "special_requirements": "None",
                "feeding": "Standard chow",
                "environmental_enrichment": "Nesting material",
            },
        ),
        (
            "/formb/step-6",
            {
                "form_b_id": form_b_id,
                "personnel_names": ["Alice", "Bob"],
                "training_level": "CPCSEA certified",
                "training_details": "Annual refresher",
                "competency_certification": "Yes",
            },
        ),
        (
            "/formb/step-7",
            {
                "form_b_id": form_b_id,
                "cpcsea_adherence": "Yes",
                "iaec_history": "None",
                "safety_measures": "PPE and SOPs",
                "endpoint_criteria": "Humane endpoints defined",
            },
        ),
    ]

    for path, body in steps:
        res = client.post(path, json=body, headers=headers)
        assert res.status_code == 200, res.text


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
    assert review["step3"]["species"] == species_name
    assert review["step7"]["cpcsea_adherence"] == "Yes"

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

    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 200, submit_res.text

    edit_res = client.post(
        "/formb/step-2",
        json={
            "form_b_id": form_b_id,
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
