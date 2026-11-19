def test_admin_created_user_must_change_password_on_first_login(client, admin_auth_headers):
    email = "mustchange.faculty@lmcp.ac.in"
    create_res = client.post(
        "/users/",
        json={
            "name": "Must Change Faculty",
            "email": email,
            "password": "TempPass@123",
            "roles": ["investigator"],
        },
        headers=admin_auth_headers,
    )
    assert create_res.status_code == 201
    assert create_res.json()["must_change_password"] is True

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": "TempPass@123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["must_change_password"] is True

    blocked_res = client.get("/users/iaec-only", headers=headers)
    assert blocked_res.status_code == 403

    change_res = client.post(
        "/auth/change-password",
        json={"current_password": "TempPass@123", "new_password": "NewStrongPass@456"},
        headers=headers,
    )
    assert change_res.status_code == 204

    me_after = client.get("/users/me", headers=headers)
    assert me_after.json()["must_change_password"] is False

    allowed_res = client.get("/users/investigator-only", headers=headers)
    assert allowed_res.status_code == 200


def test_self_registered_investigator_not_forced_to_change(client):
    email = "selfreg.faculty@lmcp.ac.in"
    register_res = client.post(
        "/auth/register-investigator",
        json={
            "name": "Self Reg Faculty",
            "email": email,
            "password": "SelfChosen@123",
        },
    )
    assert register_res.status_code == 201

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": "SelfChosen@123"},
    )
    token = login_res.json()["access_token"]
    me_res = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.json()["must_change_password"] is False
