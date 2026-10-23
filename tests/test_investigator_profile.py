from uuid import uuid4

import pytest


def _register_investigator(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Dr. Profile Test",
        "email": f"profile_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }
    res = client.post("/auth/register-investigator", json=payload)
    assert res.status_code == 201, res.text

    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, payload["email"]


def test_registration_creates_profile_shell(client, monkeypatch):
    headers, email = _register_investigator(client, monkeypatch)

    profile_res = client.get("/investigator-profile/me", headers=headers)
    assert profile_res.status_code == 200, profile_res.text
    profile = profile_res.json()
    assert profile["institutional_email"] == email
    assert profile["is_lmcp_faculty"] is True
    assert profile["is_complete"] is False


def test_update_profile_marks_complete(client, monkeypatch):
    headers, _email = _register_investigator(client, monkeypatch)

    update_res = client.put(
        "/investigator-profile/me",
        json={
            "institution_name": "LMCP",
            "department": "Pharmacology",
            "designation": "Assistant Professor",
            "qualification": "MD, PhD",
            "years_experience": 8,
            "animal_handling_experience": "5 years rodent work",
        },
        headers=headers,
    )
    assert update_res.status_code == 200, update_res.text
    profile = update_res.json()
    assert profile["is_complete"] is True
    assert profile["department"] == "Pharmacology"


def test_profile_requires_investigator_role(client, staff_auth_headers):
    res = client.get("/investigator-profile/me", headers=staff_auth_headers)
    assert res.status_code == 403


def test_profile_rejects_non_institutional_email(client, monkeypatch):
    headers, _email = _register_investigator(client, monkeypatch)

    update_res = client.put(
        "/investigator-profile/me",
        json={"institutional_email": "outside@example.com"},
        headers=headers,
    )
    assert update_res.status_code == 400
    assert "LMCP domain" in update_res.json()["detail"]
