def test_create_and_list_project(client):
    payload = {
        "title": "Test Project",
        "investigator_name": "Dr. Test",
        "objective": "Testing",
        "start_date": "2026-01-01"
    }
    resp = client.post("/iaec/project", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None

    # List projects
    resp2 = client.get("/iaec/project")
    assert resp2.status_code == 200
    items = resp2.json()
    assert any(p.get("title") == "Test Project" for p in items)
