from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import ExperimentGroup, FormBStudyPhase, Species, Strain
from tests.formb_payloads import step1_body, step2_body, study_plan_body


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

    client.put(
        f"/formb/{form_b_id}/study-plan",
        json=study_plan_body(form_b_id, species_id=species_id, strain_id=strain_id),
        headers=inv_headers,
    )

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
