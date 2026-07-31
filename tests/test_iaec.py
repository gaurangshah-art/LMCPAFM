def test_manual_project_creation_disabled(client, iaec_auth_headers):
    payload = {
        "title": "Test Project",
        "investigator_name": "Dr. Test",
        "objective": "Testing",
        "start_date": "2026-01-01",
    }
    unauth = client.post("/iaec/project", json=payload)
    assert unauth.status_code == 401

    resp = client.post("/iaec/project", json=payload, headers=iaec_auth_headers)
    assert resp.status_code == 403

    unauth_list = client.get("/iaec/project")
    assert unauth_list.status_code == 401

    resp2 = client.get("/iaec/project", headers=iaec_auth_headers)
    assert resp2.status_code == 200
    assert isinstance(resp2.json(), list)
