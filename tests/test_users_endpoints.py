from uuid import uuid4

from fastapi.testclient import TestClient

from main import app


def test_create_user():
    unique_email = f"pytest_{uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Pytest User",
        "email": unique_email,
        "password": "StrongPass@123",
        "roles": ["staff"],
        "status": True,
    }

    with TestClient(app) as client:
        res = client.post("/users/", json=payload)

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["id"] > 0
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"]
    assert data["roles"] == payload["roles"]
    assert data["status"] is True
    assert "password" not in data
    assert "password_hash" not in data


def test_list_users_contains_created_user():
    unique_email = f"pytest_{uuid4().hex[:8]}@example.com"
    create_payload = {
        "name": "List User",
        "email": unique_email,
        "password": "StrongPass@123",
        "roles": ["investigator"],
        "status": True,
    }

    with TestClient(app) as client:
        create_res = client.post("/users/", json=create_payload)
        assert create_res.status_code == 201, create_res.text

        list_res = client.get("/users/")

    assert list_res.status_code == 200, list_res.text
    rows = list_res.json()
    assert isinstance(rows, list)
    assert any(u["email"] == unique_email for u in rows)
   

def test_create_user_duplicate_email_returns_400():
    unique_email = f"pytest_dup_{uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Dup User",
        "email": unique_email,
        "password": "StrongPass@123",
        "roles": ["staff"],
        "status": True,
    }

    with TestClient(app) as client:
        first = client.post("/users/", json=payload)
        assert first.status_code == 201, first.text

        second = client.post("/users/", json=payload)

    assert second.status_code == 400, second.text
    assert second.json()["detail"] == "Email already exists"