from uuid import uuid4

import pytest


def _create_staff_user(client, admin_headers, email: str | None = None) -> dict:
    email = email or f"reset_{uuid4().hex[:8]}@example.com"
    create_res = client.post(
        "/users/",
        json={
            "name": "Reset Target",
            "email": email,
            "password": "StrongPass@123",
            "roles": ["staff"],
            "status": True,
        },
        headers=admin_headers,
    )
    assert create_res.status_code == 201, create_res.text
    return create_res.json()


def test_forgot_password_returns_generic_message(client, admin_auth_headers):
    created = _create_staff_user(client, admin_auth_headers)

    with pytest.MonkeyPatch.context() as mp:
        mp.setenv("IAEC_SMTP_HOST", "smtp.example.com")
        mp.setattr(
            "crud.password_reset.send_plain_email",
            lambda **kwargs: None,
        )

        res = client.post("/auth/forgot-password", json={"email": created["email"]})

    assert res.status_code == 200, res.text
    assert "account exists" in res.json()["message"].lower()


def test_forgot_password_unknown_email_still_generic(client):
    res = client.post("/auth/forgot-password", json={"email": "missing@example.com"})
    assert res.status_code == 200, res.text


def test_reset_password_with_token(client, admin_auth_headers, monkeypatch):
    created = _create_staff_user(client, admin_auth_headers)
    captured: dict[str, str] = {}

    def fake_send(**kwargs):
        body = kwargs["body"]
        for line in body.splitlines():
            if "/reset-password?token=" in line:
                captured["url"] = line.strip()
                break

    monkeypatch.setenv("IAEC_SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr("crud.password_reset.send_plain_email", fake_send)

    forgot_res = client.post("/auth/forgot-password", json={"email": created["email"]})
    assert forgot_res.status_code == 200, forgot_res.text
    assert "url" in captured

    token = captured["url"].split("token=", 1)[1]
    reset_res = client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "NewStrongPass@456"},
    )
    assert reset_res.status_code == 204, reset_res.text

    old_login = client.post(
        "/auth/login",
        json={"email": created["email"], "password": "StrongPass@123"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/login",
        json={"email": created["email"], "password": "NewStrongPass@456"},
    )
    assert new_login.status_code == 200, new_login.text
