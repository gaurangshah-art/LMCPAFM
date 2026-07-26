import os
import pytest
import warnings
from uuid import uuid4

# Suppress known deprecation warnings during tests (TestClient/httpx2 guidance)
warnings.filterwarnings(
    "ignore",
    message=r"Using `httpx` with `starlette.testclient` is deprecated",
)

# Use an in-memory SQLite DB for tests to ensure schema matches models
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from database.database import SessionLocal, init_db
from main import app
from fastapi.testclient import TestClient
from models.role import Role
from models.user import User
from utils.security import hash_password


@pytest.fixture(scope="session")
def client():
    warnings.filterwarnings("ignore", category=DeprecationWarning)

    init_db()
    db = SessionLocal()
    try:
        staff_role = db.query(Role).filter(Role.name == "staff").first()
        if staff_role is None:
            staff_role = Role(name="staff")
            db.add(staff_role)
            db.flush()

        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if admin_role is None:
            admin_role = Role(name="admin")
            db.add(admin_role)
            db.flush()

        bootstrap = db.query(User).filter(User.email == "bootstrap-staff@example.com").first()
        if bootstrap is None:
            bootstrap = User(
                name="Bootstrap Staff",
                email="bootstrap-staff@example.com",
                password_hash=hash_password("StrongPass@123"),
                status=True,
                role="staff",
            )
            bootstrap.roles = [staff_role, admin_role]
            db.add(bootstrap)
            db.commit()
    finally:
        db.close()

    with TestClient(app) as c:
        yield c


def _login_headers(client, email: str, password: str = "StrongPass@123") -> dict[str, str]:
    login_res = client.post("/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(client):
    return _login_headers(client, "bootstrap-staff@example.com")


@pytest.fixture
def staff_auth_headers(client, admin_auth_headers):
    email = f"staff_{uuid4().hex[:8]}@example.com"
    password = "StrongPass@123"
    create_res = client.post(
        "/users/",
        json={
            "name": "Staff Test User",
            "email": email,
            "password": password,
            "roles": ["staff"],
            "status": True,
        },
        headers=admin_auth_headers,
    )
    assert create_res.status_code == 201, create_res.text
    return _login_headers(client, email, password)


@pytest.fixture
def iaec_auth_headers(client, admin_auth_headers):
    email = f"iaec_{uuid4().hex[:8]}@example.com"
    password = "StrongPass@123"
    create_res = client.post(
        "/users/",
        json={
            "name": "IAEC Test User",
            "email": email,
            "password": password,
            "roles": ["iaec"],
            "status": True,
        },
        headers=admin_auth_headers,
    )
    assert create_res.status_code == 201, create_res.text
    return _login_headers(client, email, password)
