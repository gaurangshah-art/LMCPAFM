from uuid import uuid4

from fastapi.testclient import TestClient

from main import app


def test_staff_cannot_create_or_list_users(client, admin_auth_headers, staff_auth_headers):
    payload = {
        "name": "Blocked Staff Create",
        "email": f"blocked_{uuid4().hex[:8]}@example.com",
        "password": "StrongPass@123",
        "roles": ["staff"],
        "status": True,
    }
    create_res = client.post("/users/", json=payload, headers=staff_auth_headers)
    assert create_res.status_code == 403
    list_res = client.get("/users/", headers=staff_auth_headers)
    assert list_res.status_code == 403
    admin_list = client.get("/admin/users", headers=staff_auth_headers)
    assert admin_list.status_code == 403


def test_create_user_requires_admin(client, admin_auth_headers):
    unique_email = f"pytest_{uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Pytest User",
        "email": unique_email,
        "password": "StrongPass@123",
        "roles": ["staff"],
        "status": True,
    }

    unauth_res = client.post("/users/", json=payload)
    assert unauth_res.status_code == 401

    res = client.post("/users/", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["id"] > 0
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"]
    assert data["roles"] == payload["roles"]
    assert data["status"] is True
    assert "password" not in data
    assert "password_hash" not in data


def test_list_users_contains_created_user(client, admin_auth_headers):
    unique_email = f"pytest_{uuid4().hex[:8]}@example.com"
    create_payload = {
        "name": "List User",
        "email": unique_email,
        "password": "StrongPass@123",
        "roles": ["iaec"],
        "status": True,
    }

    create_res = client.post("/users/", json=create_payload, headers=admin_auth_headers)
    assert create_res.status_code == 201, create_res.text

    list_res = client.get("/users/", headers=admin_auth_headers)
    assert list_res.status_code == 200, list_res.text
    rows = list_res.json()
    assert isinstance(rows, list)
    assert any(u["email"] == unique_email for u in rows)


def test_create_user_duplicate_email_returns_400(client, admin_auth_headers):
    unique_email = f"pytest_dup_{uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Dup User",
        "email": unique_email,
        "password": "StrongPass@123",
        "roles": ["staff"],
        "status": True,
    }

    first = client.post("/users/", json=payload, headers=admin_auth_headers)
    assert first.status_code == 201, first.text

    second = client.post("/users/", json=payload, headers=admin_auth_headers)
    assert second.status_code == 400, second.text
    assert second.json()["detail"] == "Email already exists"


def test_admin_can_create_investigator_with_institutional_email(
    client, admin_auth_headers, monkeypatch
):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    email = f"faculty_{uuid4().hex[:8]}@lmcp.ac.in"
    payload = {
        "name": "Dr Pre Registered",
        "email": email,
        "password": "StrongPass@123",
        "roles": ["investigator"],
        "status": True,
    }
    res = client.post("/users/", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["email"] == email
    assert data["roles"] == ["investigator"]
    assert data["admin_provisioned"] is True

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": "StrongPass@123"},
    )
    assert login_res.status_code == 200, login_res.text
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    change_res = client.post(
        "/auth/change-password",
        json={"current_password": "StrongPass@123", "new_password": "NewStrongPass@456"},
        headers=headers,
    )
    assert change_res.status_code == 204
    profile_res = client.get("/investigator-profile/me", headers=headers)
    assert profile_res.status_code == 200, profile_res.text
    profile = profile_res.json()
    assert profile["is_lmcp_faculty"] is True
    assert profile["is_complete"] is False


def test_create_investigator_requires_institutional_email(client, admin_auth_headers):
    payload = {
        "name": "Bad Email Investigator",
        "email": f"blocked_{uuid4().hex[:8]}@example.com",
        "password": "StrongPass@123",
        "roles": ["investigator"],
        "status": True,
    }
    res = client.post("/users/", json=payload, headers=admin_auth_headers)
    assert res.status_code == 400
    assert "institutional" in res.json()["detail"].lower()
