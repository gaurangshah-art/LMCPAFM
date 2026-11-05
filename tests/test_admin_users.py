from uuid import uuid4

from database.database import SessionLocal
from models.user import User


def _create_staff_user(client, admin_headers, email: str | None = None) -> dict:
    email = email or f"delete_me_{uuid4().hex[:8]}@example.com"
    create_res = client.post(
        "/users/",
        json={
            "name": "Delete Target",
            "email": email,
            "password": "StrongPass@123",
            "roles": ["iaec"],
            "status": True,
        },
        headers=admin_headers,
    )
    assert create_res.status_code == 201, create_res.text
    return create_res.json()


def test_admin_can_delete_user(client, admin_auth_headers):
    created = _create_staff_user(client, admin_auth_headers)
    user_id = created["id"]

    delete_res = client.delete(f"/admin/users/{user_id}", headers=admin_auth_headers)
    assert delete_res.status_code == 204, delete_res.text

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == user_id).first() is None


def test_admin_cannot_delete_self(client, admin_auth_headers):
    with SessionLocal() as db:
        admin = db.query(User).filter(User.email == "bootstrap-staff@example.com").first()
        admin_id = admin.id

    delete_res = client.delete(f"/admin/users/{admin_id}", headers=admin_auth_headers)
    assert delete_res.status_code == 400
    assert "your own account" in delete_res.json()["detail"].lower()


def test_staff_cannot_delete_user(client, staff_auth_headers, admin_auth_headers):
    created = _create_staff_user(client, admin_auth_headers)
    user_id = created["id"]

    delete_res = client.delete(f"/admin/users/{user_id}", headers=staff_auth_headers)
    assert delete_res.status_code == 403

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == user_id).first() is not None


def test_delete_user_requires_admin(client, admin_auth_headers):
    created = _create_staff_user(client, admin_auth_headers)
    delete_res = client.delete(f"/admin/users/{created['id']}")
    assert delete_res.status_code == 401


def test_admin_can_reset_user_password(client, admin_auth_headers):
    created = _create_staff_user(client, admin_auth_headers)
    user_id = created["id"]
    new_password = "ResetPass@456"

    reset_res = client.put(
        f"/admin/users/{user_id}/password",
        json={"new_password": new_password},
        headers=admin_auth_headers,
    )
    assert reset_res.status_code == 204, reset_res.text

    old_login = client.post(
        "/auth/login",
        json={"email": created["email"], "password": "StrongPass@123"},
    )
    assert old_login.status_code == 401, old_login.text

    new_login = client.post(
        "/auth/login",
        json={"email": created["email"], "password": new_password},
    )
    assert new_login.status_code == 200, new_login.text


def test_admin_cannot_reset_own_password_via_admin_endpoint(client, admin_auth_headers):
    with SessionLocal() as db:
        admin = db.query(User).filter(User.email == "bootstrap-staff@example.com").first()
        admin_id = admin.id

    reset_res = client.put(
        f"/admin/users/{admin_id}/password",
        json={"new_password": "AnotherPass@456"},
        headers=admin_auth_headers,
    )
    assert reset_res.status_code == 400
    assert "password page" in reset_res.json()["detail"].lower()


def test_staff_cannot_reset_user_password(client, staff_auth_headers, admin_auth_headers):
    created = _create_staff_user(client, admin_auth_headers)
    reset_res = client.put(
        f"/admin/users/{created['id']}/password",
        json={"new_password": "ResetPass@456"},
        headers=staff_auth_headers,
    )
    assert reset_res.status_code == 403
