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
