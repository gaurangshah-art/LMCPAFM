from uuid import uuid4

from database.database import SessionLocal
from models.user import User


def _certify(email: str) -> None:
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        user.is_certified_animal_handler = True
        db.commit()


def test_admin_create_investigator_with_certification_flag(client, admin_auth_headers):
    email = f"certified_{uuid4().hex[:8]}@lmcp.ac.in"
    res = client.post(
        "/users/",
        json={
            "name": "Certified Faculty",
            "email": email,
            "password": "TempPass@123",
            "roles": ["investigator"],
            "is_certified_animal_handler": True,
        },
        headers=admin_auth_headers,
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["is_certified_animal_handler"] is True
    assert body["admin_provisioned"] is True


def test_uncertified_investigator_cannot_post_requisition(client, admin_auth_headers):
    email = f"uncert_{uuid4().hex[:8]}@lmcp.ac.in"
    create_res = client.post(
        "/users/",
        json={
            "name": "Uncertified Faculty",
            "email": email,
            "password": "TempPass@123",
            "roles": ["investigator"],
            "is_certified_animal_handler": False,
        },
        headers=admin_auth_headers,
    )
    assert create_res.status_code == 201

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": "TempPass@123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    change_res = client.post(
        "/auth/change-password",
        json={"current_password": "TempPass@123", "new_password": "NewStrongPass@456"},
        headers=headers,
    )
    assert change_res.status_code == 204

    req_res = client.post(
        "/iaec/requisition",
        json={
            "project_id": 1,
            "date": "2026-01-15",
            "purpose": "Test",
            "items": [],
        },
        headers=headers,
    )
    assert req_res.status_code == 403
    assert "certified" in req_res.json()["detail"].lower()
