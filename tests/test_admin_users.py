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
