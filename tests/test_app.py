def test_home(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json().get("message") == "LMCPAFM backend is running"


def test_health_endpoints(client):
    live = client.get("/health/live")
    assert live.status_code == 200
    assert live.json().get("status") == "ok"

    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json().get("checks", {}).get("database") == "ok"

    combined = client.get("/health")
    assert combined.status_code == 200
    assert combined.json().get("checks", {}).get("app") == "ok"
