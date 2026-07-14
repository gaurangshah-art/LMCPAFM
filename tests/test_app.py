def test_home(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json().get("message") == "LMCPAFM backend is running"
