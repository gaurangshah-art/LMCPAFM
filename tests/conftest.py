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

from database.database import init_db
from main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    # Initialize tables for the in-memory database
    # Filter expected deprecation warnings during tests
    warnings.filterwarnings("ignore", category=DeprecationWarning)

    init_db()
    with TestClient(app) as c:
        yield c


@pytest.fixture
def staff_auth_headers(client):
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
    )
    assert create_res.status_code == 201, create_res.text

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200, login_res.text

    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
