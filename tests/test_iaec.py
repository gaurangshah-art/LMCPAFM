def test_create_and_list_project(client, iaec_auth_headers):
    payload = {
        "title": "Test Project",
        "investigator_name": "Dr. Test",
        "objective": "Testing",
        "start_date": "2026-01-01"
    }
    unauth = client.post("/iaec/project", json=payload)
    assert unauth.status_code == 401

    resp = client.post("/iaec/project", json=payload, headers=iaec_auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None

    unauth_list = client.get("/iaec/project")
    assert unauth_list.status_code == 401

    resp2 = client.get("/iaec/project", headers=iaec_auth_headers)
    assert resp2.status_code == 200
    items = resp2.json()
    assert any(p.get("title") == "Test Project" for p in items)
