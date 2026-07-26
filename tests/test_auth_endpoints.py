from uuid import uuid4

import pytest


def test_login_returns_token(client, admin_auth_headers):
    unique_email = f"login_{uuid4().hex[:8]}@example.com"
    user_payload = {
        "name": "Login User",
        "email": unique_email,
        "password": "StrongPass@123",
        "roles": ["staff"],
        "status": True,
    }

    create_res = client.post("/users/", json=user_payload, headers=admin_auth_headers)
    assert create_res.status_code == 201, create_res.text

    login_res = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "StrongPass@123"},
    )

    assert login_res.status_code == 200, login_res.text
    data = login_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_users_me_returns_current_user(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    unique_email = f"me_{uuid4().hex[:8]}@lmcp.ac.in"
    user_payload = {
        "name": "Me User",
        "email": unique_email,
        "password": "StrongPass@123",
    }

    create_res = client.post("/auth/register-investigator", json=user_payload)
    assert create_res.status_code == 201, create_res.text

    login_res = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "StrongPass@123"},
    )
    assert login_res.status_code == 200, login_res.text

    token = login_res.json()["access_token"]
    me_res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert me_res.status_code == 200, me_res.text
    data = me_res.json()
    assert data["email"] == unique_email
    assert data["name"] == "Me User"


def test_login_invalid_password_returns_401(client, admin_auth_headers):
    unique_email = f"invalid_{uuid4().hex[:8]}@example.com"
    user_payload = {
        "name": "Invalid Login User",
        "email": unique_email,
        "password": "StrongPass@123",
        "roles": ["staff"],
        "status": True,
    }

    create_res = client.post("/users/", json=user_payload, headers=admin_auth_headers)
    assert create_res.status_code == 201, create_res.text

    login_res = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "WrongPass@123"},
    )

    assert login_res.status_code == 401, login_res.text
    assert login_res.json()["detail"] == "Invalid credentials"
