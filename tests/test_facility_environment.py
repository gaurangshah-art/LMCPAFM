from datetime import date
from uuid import uuid4


def _seed_room(client, admin_auth_headers, suffix: str):
    room_res = client.post(
        "/admin/facility/rooms",
        json={"code": f"ENV-{suffix}", "name": "Environment Room"},
        headers=admin_auth_headers,
    )
    assert room_res.status_code == 200, room_res.text
    return room_res.json()["id"]


def test_environment_log_and_operations_summary(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    room_id = _seed_room(client, admin_auth_headers, suffix)
    today = date.today().isoformat()

    env_res = client.post(
        "/facility/environment-logs",
        json={
            "room_id": room_id,
            "date": today,
            "temperature_c": 22.5,
            "humidity_pct": 55,
            "hvac_status": "normal",
            "light_cycle": "12:12",
            "notes": "Morning check",
        },
        headers=staff_auth_headers,
    )
    assert env_res.status_code == 200, env_res.text
    body = env_res.json()
    assert body["room_id"] == room_id
    assert body["temperature_c"] == 22.5

    summary_res = client.get("/admin/facility/operations-summary", headers=admin_auth_headers)
    assert summary_res.status_code == 200, summary_res.text
    summary = summary_res.json()
    assert summary["rooms_logged_today"] >= 1
    assert any(item["kind"] == "environment" for item in summary["recent_activity"])

    list_res = client.get("/facility/environment-logs", headers=staff_auth_headers)
    assert list_res.status_code == 200
    assert any(row["id"] == body["id"] for row in list_res.json())


def test_environment_log_requires_reading(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]
    room_id = _seed_room(client, admin_auth_headers, suffix)

    bad_res = client.post(
        "/facility/environment-logs",
        json={"room_id": room_id, "date": "2026-07-29", "hvac_status": "normal"},
        headers=staff_auth_headers,
    )
    assert bad_res.status_code == 400
