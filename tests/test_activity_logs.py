def test_admin_activity_logs_include_login(client, admin_auth_headers):
    login_res = client.post(
        "/auth/login",
        json={"email": "bootstrap-staff@example.com", "password": "StrongPass@123"},
    )
    assert login_res.status_code == 200, login_res.text

    logs_res = client.get("/admin/logs", headers=admin_auth_headers)
    assert logs_res.status_code == 200, logs_res.text
    logs = logs_res.json()
    assert isinstance(logs, list)
    assert any(log["action"] == "auth.login" for log in logs)
