def test_create_and_get_requisition(client):
    payload = {
        "protocol_id": 1,
        "requester_name": "Alice",
        "requester_role": "Researcher",
        "date": "2026-01-02",
        "purpose": "Testing requisition",
        "items": [
            {"species_id": 1, "strain_id": 1, "requested_count": 2}
        ]
    }
    resp = client.post("/iaec/requisition", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None

    req_id = data.get("id")
    resp2 = client.get(f"/iaec/requisition/{req_id}")
    assert resp2.status_code == 200
    got = resp2.json()
    assert got.get("id") == req_id
