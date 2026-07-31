"""IAEC workflow gates incomplete Form B submissions."""

from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain

from tests.formb_payloads import (
    step1_body,
    step2_body,
    study_plan_body,
    upload_required_form_b_attachments,
    wizard_steps_after_step1,
)


def _register_investigator(client, monkeypatch, suffix: str):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    payload = {
        "name": f"Dr. Gate {suffix}",
        "email": f"gate_{suffix}@lmcp.ac.in",
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
    start_res = client.post("/formb/start", headers=headers)
    form_b_id = start_res.json()["id"]
    client.post("/formb/step-1", json=step1_body(form_b_id, payload), headers=headers)
    return headers, form_b_id


def _complete_wizard(client, headers, form_b_id):
    suffix = uuid4().hex[:4]
    species_name = f"Rat-{suffix}"
    strain_name = f"Wistar-{suffix}"
    with SessionLocal() as db:
        species = Species(name=species_name)
        db.add(species)
        db.flush()
        strain = Strain(name=strain_name, species_id=species.id)
        db.add(strain)
        db.commit()
        species_id = species.id
        strain_id = strain.id

    upload_required_form_b_attachments(client, headers, form_b_id)
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


def test_iaec_cannot_assign_meeting_to_unsubmitted_form_b(client, iaec_auth_headers, monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "")
    suffix = uuid4().hex[:8]
    headers, form_b_id = _register_investigator(client, monkeypatch, suffix)

    upload_required_form_b_attachments(client, headers, form_b_id)
    client.post("/formb/step-2", json=step2_body(form_b_id), headers=headers)

    meeting_res = client.post(
        "/iaec/meeting",
        json={"date": "2026-08-15", "meeting_number": "GATE-01"},
        headers=iaec_auth_headers,
    )
    assert meeting_res.status_code == 200, meeting_res.text
    meeting_id = meeting_res.json()["id"]

    assign_res = client.patch(
        f"/iaec/form-b/{form_b_id}/meeting",
        json={"meeting_id": meeting_id},
        headers=iaec_auth_headers,
    )
    assert assign_res.status_code == 400
    assert "submitted" in assign_res.json()["detail"].lower()


def test_iaec_lists_submitted_flag_after_full_submission(client, iaec_auth_headers, monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "")
    suffix = uuid4().hex[:8]
    headers, form_b_id = _register_investigator(client, monkeypatch, suffix)
    _complete_wizard(client, headers, form_b_id)

    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 200, submit_res.text

    rows_res = client.get("/iaec/form-b-with-meeting", headers=iaec_auth_headers)
    assert rows_res.status_code == 200
    row = next(item for item in rows_res.json() if item["form_b_id"] == form_b_id)
    assert row["is_submitted"] is True
    assert row["submitted_at"] is not None
