"""Schedule V PDF export and IAEC member roster."""


def test_schedule_v_download_endpoint(client, iaec_auth_headers):
    create_res = client.post(
        "/iaec/meeting",
        json={
            "date": "2026-10-02",
            "meeting_number": "2/2026",
            "meeting_time": "11:00",
            "venue": "IAEC Room",
            "minutes": "",
        },
        headers=iaec_auth_headers,
    )
    assert create_res.status_code == 200, create_res.text
    meeting_id = create_res.json()["id"]

    member_res = client.post(
        "/iaec/members",
        json={
            "full_name": "Dr Secretary",
            "designation": "Member Secretary",
            "display_order": 1,
        },
        headers=iaec_auth_headers,
    )
    assert member_res.status_code == 200, member_res.text
    member_id = member_res.json()["id"]

    attend_res = client.put(
        f"/iaec/meeting/{meeting_id}/attendance",
        json=[{"member_id": member_id, "present": True}],
        headers=iaec_auth_headers,
    )
    assert attend_res.status_code == 200, attend_res.text

    res = client.get(
        f"/iaec/meeting/{meeting_id}/schedule-v/download",
        headers=iaec_auth_headers,
    )
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
    assert len(res.content) > 500
