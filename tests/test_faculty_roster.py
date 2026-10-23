from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import FacultyRosterEntry


def _register_payload(email: str) -> dict:
    return {
        "name": "Roster Faculty",
        "email": email,
        "password": "StrongPass@123",
    }


def test_registration_allowed_when_on_roster_and_enforced(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    monkeypatch.setenv("LMCP_FACULTY_ROSTER_ENFORCE", "true")
    email = f"roster_ok_{uuid4().hex[:8]}@lmcp.ac.in"

    with SessionLocal() as db:
        db.add(FacultyRosterEntry(email=email, name="On Roster", active=True))
        db.commit()

    res = client.post("/auth/register-investigator", json=_register_payload(email))
    assert res.status_code == 201, res.text


def test_registration_blocked_when_not_on_roster_and_enforced(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    monkeypatch.setenv("LMCP_FACULTY_ROSTER_ENFORCE", "true")
    email = f"not_listed_{uuid4().hex[:8]}@lmcp.ac.in"

    res = client.post("/auth/register-investigator", json=_register_payload(email))
    assert res.status_code == 400
    assert "roster" in res.json()["detail"].lower()


def test_registration_ignores_roster_when_not_enforced(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    monkeypatch.setenv("LMCP_FACULTY_ROSTER_ENFORCE", "false")
    email = f"open_reg_{uuid4().hex[:8]}@lmcp.ac.in"

    res = client.post("/auth/register-investigator", json=_register_payload(email))
    assert res.status_code == 201, res.text
