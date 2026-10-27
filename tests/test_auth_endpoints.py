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


def test_change_password_updates_login(client, admin_auth_headers):
    unique_email = f"pwchange_{uuid4().hex[:8]}@example.com"
    old_password = "StrongPass@123"
    new_password = "NewStrongPass@456"
    user_payload = {
        "name": "Password Change User",
        "email": unique_email,
        "password": old_password,
        "roles": ["staff"],
        "status": True,
    }

    create_res = client.post("/users/", json=user_payload, headers=admin_auth_headers)
    assert create_res.status_code == 201, create_res.text

    login_res = client.post(
        "/auth/login",
        json={"email": unique_email, "password": old_password},
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad_res = client.post(
        "/auth/change-password",
        json={"current_password": "WrongPass@123", "new_password": new_password},
        headers=headers,
    )
    assert bad_res.status_code == 400, bad_res.text
    assert bad_res.json()["detail"] == "Current password is incorrect"

    change_res = client.post(
        "/auth/change-password",
        json={"current_password": old_password, "new_password": new_password},
        headers=headers,
    )
    assert change_res.status_code == 204, change_res.text

    old_login = client.post(
        "/auth/login",
        json={"email": unique_email, "password": old_password},
    )
    assert old_login.status_code == 401, old_login.text

    new_login = client.post(
        "/auth/login",
        json={"email": unique_email, "password": new_password},
    )
    assert new_login.status_code == 200, new_login.text


def test_change_password_requires_auth(client):
    res = client.post(
        "/auth/change-password",
        json={"current_password": "a", "new_password": "12345678"},
    )
    assert res.status_code == 401, res.text


def test_refresh_session_returns_new_token(client, admin_auth_headers):
    unique_email = f"refresh_{uuid4().hex[:8]}@example.com"
    user_payload = {
        "name": "Refresh User",
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
    token = login_res.json()["access_token"]

    refresh_res = client.post("/auth/refresh", headers={"Authorization": f"Bearer {token}"})
    assert refresh_res.status_code == 200, refresh_res.text
    data = refresh_res.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"
