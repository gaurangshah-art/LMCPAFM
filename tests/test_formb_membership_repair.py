from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import FormB, FormBInvestigator, IAECProject
from models.user import User

from tests.formb_payloads import step1_body


def _register_and_login(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Gaurang Shah",
        "email": f"gaurang_{suffix}@lmcp.ac.in",
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
            "designation": "Professor",
            "qualification": "PhD",
            "is_lmcp_faculty": True,
        },
        headers=headers,
    )
    return headers, payload


def test_form_b_membership_relinks_unlinked_principal_investigator(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    start_res = client.post("/formb/start", headers=headers)
    assert start_res.status_code == 200, start_res.text
    form_b_id = start_res.json()["id"]

    db = SessionLocal()
    try:
        investigator = (
            db.query(FormBInvestigator)
            .filter(FormBInvestigator.form_b_id == form_b_id)
            .first()
        )
        assert investigator is not None
        investigator.user_id = None
        investigator.investigator_profile_user_id = None
        db.commit()
    finally:
        db.close()

    save_res = client.post(
        "/formb/step-1",
        json={
            **step1_body(form_b_id, payload),
            "research_type": "Basic Research",
        },
        headers=headers,
    )
    assert save_res.status_code == 200, save_res.text

    db = SessionLocal()
    try:
        investigator = (
            db.query(FormBInvestigator)
            .filter(FormBInvestigator.form_b_id == form_b_id)
            .first()
        )
        assert investigator is not None
        assert investigator.user_id is not None
    finally:
        db.close()
