from uuid import uuid4

from tests.formb_payloads import step1_body
from utils.institution import DEFAULT_CPCSEA_REGISTRATION_NUMBER


def _register_and_login(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Dr. Form B Autofill",
        "email": f"formb_{suffix}@lmcp.ac.in",
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


def test_form_b_step1_autofill_from_profile(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)

    autofill_res = client.get("/formb/autofill/step-1", headers=headers)
    assert autofill_res.status_code == 200, autofill_res.text
    autofill = autofill_res.json()
    assert autofill["principal_investigator"] == payload["name"]
    assert autofill["contact_email"] == payload["email"]
    assert autofill["profile_complete"] is False

    client.put(
        "/investigator-profile/me",
        json={
            "institution_name": "LMCP",
            "department": "Pharmacology",
            "designation": "Assistant Professor",
            "qualification": "PhD",
            "years_experience": 6,
            "animal_handling_experience": "Rodent handling",
        },
        headers=headers,
    )

    autofill_res = client.get("/formb/autofill/step-1", headers=headers)
    autofill = autofill_res.json()
    assert autofill["profile_complete"] is True
    assert autofill["department"] == "Pharmacology"
    assert autofill["designation"] == "Assistant Professor"
    assert autofill["qualifications"] == "PhD"
    assert autofill["registration_number"] == DEFAULT_CPCSEA_REGISTRATION_NUMBER
    assert autofill["establishment_address"]
    assert autofill["animal_housing_location"]
    assert "Rodent handling" in autofill["experience"]


def test_form_b_start_requires_complete_profile(client, monkeypatch):
    headers, _payload = _register_and_login(client, monkeypatch)

    start_res = client.post("/formb/start", headers=headers)
    assert start_res.status_code == 400
    assert "profile" in start_res.json()["detail"].lower()


def test_form_b_start_and_save_step1(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
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

    start_res = client.post("/formb/start", headers=headers)
    assert start_res.status_code == 200, start_res.text
    form_b_id = start_res.json()["id"]

    save_res = client.post(
        "/formb/step-1",
        json={
            **step1_body(form_b_id, payload),
        },
        headers=headers,
    )
    assert save_res.status_code == 200, save_res.text

    investigators_res = client.get(f"/formb/{form_b_id}/investigators", headers=headers)
    assert investigators_res.status_code == 200
    investigators = investigators_res.json()
    assert len(investigators) == 1
    assert investigators[0]["project_role"] == "principal_investigator"
