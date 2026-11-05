from uuid import uuid4


def test_users_me_returns_roles_from_user_roles_table(client, staff_auth_headers):
    email = f"roles_{uuid4().hex[:8]}@example.com"
    password = "StrongPass@123"
    create_res = client.post(
        "/users/",
        json={
            "name": "Role Source User",
            "email": email,
            "password": password,
            "roles": ["staff"],
            "status": True,
        },
        headers=staff_auth_headers,
    )
    assert create_res.status_code == 201, create_res.text

    login_res = client.post("/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    me_res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200, me_res.text
    payload = me_res.json()
    assert payload["roles"] == ["staff"]
    assert "role" not in payload
