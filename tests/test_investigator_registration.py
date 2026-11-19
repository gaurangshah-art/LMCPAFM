from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def _register_payload(email: str | None = None) -> dict:
    suffix = uuid4().hex[:8]
    return {
        "name": "Dr. Faculty User",
        "email": email or f"faculty_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }


def test_register_investigator_success_and_login(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    payload = _register_payload()

    register_res = client.post("/auth/register-investigator", json=payload)
    assert register_res.status_code == 201, register_res.text
    data = register_res.json()
    assert data["email"] == payload["email"].lower()
    assert data["name"] == payload["name"]
    assert data["roles"] == ["investigator"]
    assert data["status"] is True
    assert "password" not in data

    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_res.status_code == 200, login_res.text

    token = login_res.json()["access_token"]
    me_res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200, me_res.text
    assert me_res.json()["roles"] == ["investigator"]

    profile_res = client.get(
        "/investigator-profile/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_res.status_code == 200, profile_res.text
    assert profile_res.json()["institutional_email"] == payload["email"].lower()
    assert profile_res.json()["is_complete"] is False


def test_register_investigator_rejects_non_institutional_email(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    payload = _register_payload(email=f"outside_{uuid4().hex[:8]}@example.com")

    register_res = client.post("/auth/register-investigator", json=payload)
    assert register_res.status_code == 400, register_res.text
    assert "LMCP institutional email" in register_res.json()["detail"]


def test_register_investigator_rejects_duplicate_email(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    payload = _register_payload()

    first = client.post("/auth/register-investigator", json=payload)
    assert first.status_code == 201, first.text

    second = client.post("/auth/register-investigator", json=payload)
    assert second.status_code == 400, second.text
    assert second.json()["detail"] == "Email already exists"


def test_register_investigator_rejects_short_password(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    payload = _register_payload()
    payload["password"] = "short"

    register_res = client.post("/auth/register-investigator", json=payload)
    assert register_res.status_code == 422, register_res.text


def test_register_student_scholar_accepts_non_institutional_email(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Scholar User",
        "email": f"scholar.{suffix}@gmail.com",
        "password": "StrongPass@123",
    }

    register_res = client.post("/auth/register-student", json=payload)
    assert register_res.status_code == 201, register_res.text
    data = register_res.json()
    assert data["email"] == payload["email"].lower()
    assert data["roles"] == ["investigator"]

    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_res.status_code == 200, login_res.text

    token = login_res.json()["access_token"]
    profile_res = client.get(
        "/investigator-profile/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_res.status_code == 200, profile_res.text
    assert profile_res.json()["is_lmcp_faculty"] is False
    assert profile_res.json()["is_self_registered_scholar"] is True


def test_collaborator_may_start_form_b_without_submit_permission(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    email = f"ext.pi.{suffix}@example.org"
    register_res = client.post(
        "/auth/register-student",
        json={
            "name": "External PI",
            "email": email,
            "password": "StrongPass@123",
        },
    )
    assert register_res.status_code == 201, register_res.text

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": "StrongPass@123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    profile_res = client.put(
        "/investigator-profile/me",
        json={
            "institution_name": "Affiliated College",
            "department": "Pharmacology",
            "designation": "Assistant Professor",
            "qualification": "M.Pharm",
        },
        headers=headers,
    )
    assert profile_res.status_code == 200, profile_res.text

    start_res = client.post("/formb/start", headers=headers)
    assert start_res.status_code == 200, start_res.text
    form_b_id = start_res.json()["id"]

    team_res = client.get(f"/formb/{form_b_id}/investigators", headers=headers)
    assert team_res.status_code == 200, team_res.text
    pi = next(
        row for row in team_res.json() if row["project_role"] == "principal_investigator"
    )
    assert pi["can_edit_forms"] is True
    assert pi["can_submit_form_b"] is False


def test_faculty_registration_still_rejects_gmail_via_investigator_endpoint(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Should Fail",
        "email": f"faculty.{suffix}@gmail.com",
        "password": "StrongPass@123",
        "account_type": "faculty",
    }

    register_res = client.post("/auth/register-investigator", json=payload)
    assert register_res.status_code == 400, register_res.text
    assert "LMCP institutional email" in register_res.json()["detail"]
