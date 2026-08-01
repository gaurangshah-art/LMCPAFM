from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain
from tests.formb_payloads import (
    step1_body,
    study_plan_body,
    upload_required_form_b_attachments,
    wizard_steps_after_step1,
)


def _register_and_login(client, monkeypatch, faculty: bool = True):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Dr. Policy Test",
        "email": f"policy_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }
    client.post("/auth/register-investigator", json=payload)
    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    client.put(
        "/investigator-profile/me",
        json={
            "institution_name": "LMCP",
            "department": "Pharmacology",
            "designation": "Assistant Professor",
            "qualification": "PhD",
            "is_lmcp_faculty": faculty,
        },
        headers=headers,
    )
    return headers, payload


def _start_and_complete_wizard(client, headers, payload):
    start_res = client.post("/formb/start", headers=headers)
    form_b_id = start_res.json()["id"]
    client.post("/formb/step-1", json=step1_body(form_b_id, payload), headers=headers)

    suffix = uuid4().hex[:4]
    species_name = f"Rat-{suffix}"
    strain_name = f"Wistar-{suffix}"
    species_id = None
    strain_id = None
    with SessionLocal() as db:
        species = Species(name=species_name)
        db.add(species)
        db.flush()
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
    return form_b_id


def test_submit_requires_lmcp_faculty(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch, faculty=False)
    form_b_id = _start_and_complete_wizard(client, headers, payload)

    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 400
    assert "faculty" in submit_res.json()["detail"].lower()


def test_student_investigator_gets_limited_permissions(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch, faculty=True)
    start_res = client.post("/formb/start", headers=headers)
    form_b_id = start_res.json()["id"]

    add_res = client.post(
        "/formb/investigators",
        json={
            "form_b_id": form_b_id,
            "name": "Student Helper",
            "project_role": "student_contributor",
            "investigator_type": "student",
        },
        headers=headers,
    )
    assert add_res.status_code == 200, add_res.text
    student = add_res.json()
    assert student["can_view_status"] is False
    assert student["can_view_approval_letters"] is False
    assert student["can_submit_form_b"] is False
    assert student["can_edit_forms"] is True


def test_investigator_projects_are_membership_scoped(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch, faculty=True)
    form_b_id = _start_and_complete_wizard(client, headers, payload)
    upload_required_form_b_attachments(client, headers, form_b_id)
    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 200, submit_res.text

    me_res = client.get("/users/me", headers=headers)
    investigator_id = me_res.json()["id"]

    projects_res = client.get(f"/iaec/project/investigator/{investigator_id}", headers=headers)
    assert projects_res.status_code == 200, projects_res.text
    projects = projects_res.json()
    assert len(projects) >= 1
    assert projects[0]["title"] == "Pain study"


def test_form_b_application_pdf_download(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch, faculty=True)
    form_b_id = _start_and_complete_wizard(client, headers, payload)

    pdf_res = client.get(f"/formb/{form_b_id}/application.pdf", headers=headers)
    assert pdf_res.status_code == 200, pdf_res.text
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")
