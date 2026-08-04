from datetime import date, datetime, timezone
from uuid import uuid4

import pytest

from database.lmcpafm_models import FormB, IAECMeeting, IAECProject
from crud.exceptions import CRUDValidationError
from crud.formb_internal import (
    assign_form_b_meeting,
    generate_form_b_protocol_number,
    upsert_form_b_meeting_decision,
)


def _seed_form_b(db):
    meeting = IAECMeeting(
        date=date(2026, 7, 23),
        meeting_number="3",
        meeting_time="10:30",
        venue="IAEC Conference Room",
        minutes="minutes",
    )
    project = IAECProject(title="Protocol Test", investigator_name="Dr Test")
    db.add_all([meeting, project])
    db.commit()
    db.refresh(meeting)
    db.refresh(project)
    form_b = FormB(
        project_id=project.id,
        date=date.today(),
        meeting_id=meeting.id,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(form_b)
    db.commit()
    db.refresh(form_b)
    return meeting, project, form_b


def test_form_b_meeting_workflow(client, iaec_auth_headers):
    from database.database import SessionLocal

    db = SessionLocal()
    meeting = IAECMeeting(
        date=date(2026, 7, 23),
        meeting_number="3",
        meeting_time="10:30",
        venue="IAEC Conference Room",
        minutes="m",
    )
    project = IAECProject(title="Workflow Project", investigator_name="Dr A")
    db.add_all([meeting, project])
    db.commit()
    db.refresh(meeting)
    db.refresh(project)
    form_b = FormB(
        project_id=project.id,
        date=date(2026, 7, 20),
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(form_b)
    db.commit()
    db.refresh(form_b)
    db.close()

    list_res = client.get("/iaec/form-b-with-meeting", headers=iaec_auth_headers)
    assert list_res.status_code == 200
    rows = list_res.json()
    assert any(row["form_b_id"] == form_b.id for row in rows)

    assign_res = client.patch(
        f"/iaec/form-b/{form_b.id}/meeting",
        json={"meeting_id": meeting.id},
        headers=iaec_auth_headers,
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["meeting_id"] == meeting.id

    protocol_res = client.post(
        f"/iaec/form-b/{form_b.id}/protocol-number",
        headers=iaec_auth_headers,
    )
    assert protocol_res.status_code == 400

    decision_res = client.put(
        f"/iaec/form-b/{form_b.id}/decision",
        json={
            "meeting_id": meeting.id,
            "decision": "approved",
            "remarks": "Approved in meeting",
        },
        headers=iaec_auth_headers,
    )
    assert decision_res.status_code == 200
    assert decision_res.json()["decision"] == "approved"

    protocol_res = client.post(
        f"/iaec/form-b/{form_b.id}/protocol-number",
        headers=iaec_auth_headers,
    )
    assert protocol_res.status_code == 200
    protocol_number = protocol_res.json()["protocol_number"]
    assert protocol_number == "LMCP/IAEC/2026/3/001"

    list_res = client.get("/iaec/form-b-with-meeting", headers=iaec_auth_headers)
    row = next(item for item in list_res.json() if item["form_b_id"] == form_b.id)
    assert row["protocol_number"] == protocol_number
    assert row["decision"] == "approved"

    summary_res = client.get(
        f"/iaec/meeting/{meeting.id}/form-b-summary",
        headers=iaec_auth_headers,
    )
    assert summary_res.status_code == 200
    assert len(summary_res.json()) >= 1

    cert_res = client.get(
        f"/iaec/meeting/{meeting.id}/certificate-data",
        headers=iaec_auth_headers,
    )
    assert cert_res.status_code == 200
    assert any(item["form_b_id"] == form_b.id for item in cert_res.json())


def test_protocol_serial_increments_per_meeting(client, iaec_auth_headers):
    from database.database import SessionLocal

    db = SessionLocal()
    meeting, _, form_b1 = _seed_form_b(db)

    project2 = IAECProject(title="Second", investigator_name="Dr B")
    db.add(project2)
    db.commit()
    db.refresh(project2)
    form_b2 = FormB(
        project_id=project2.id,
        date=date.today(),
        meeting_id=meeting.id,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(form_b2)
    db.commit()
    db.refresh(form_b2)
    db.close()

    for form_b_id in (form_b1.id, form_b2.id):
        client.put(
            f"/iaec/form-b/{form_b_id}/decision",
            json={"meeting_id": meeting.id, "decision": "approved"},
            headers=iaec_auth_headers,
        )
        res = client.post(
            f"/iaec/form-b/{form_b_id}/protocol-number",
            headers=iaec_auth_headers,
        )
        assert res.status_code == 200

    db = SessionLocal()
    p1 = db.query(IAECProject).filter(IAECProject.id == form_b1.project_id).first()
    p2 = db.query(IAECProject).filter(IAECProject.id == form_b2.project_id).first()
    assert p1.protocol_number == "LMCP/IAEC/2026/3/001"
    assert p2.protocol_number == "LMCP/IAEC/2026/3/002"
    db.close()


def test_assign_and_clear_meeting():
    from database.database import SessionLocal, init_db

    init_db()
    db = SessionLocal()
    meeting = IAECMeeting(
        date=date.today(),
        meeting_number="1",
        meeting_time="11:00",
        venue="IAEC Conference Room",
        minutes="m",
    )
    project = IAECProject(title="Assign Test", investigator_name="Dr X")
    db.add_all([meeting, project])
    db.commit()
    db.refresh(meeting)
    db.refresh(project)
    form_b = FormB(
        project_id=project.id,
        date=date.today(),
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(form_b)
    db.commit()
    db.refresh(form_b)

    updated = assign_form_b_meeting(db, form_b.id, meeting.id)
    assert updated["meeting_id"] == meeting.id

    cleared = assign_form_b_meeting(db, form_b.id, None)
    assert cleared["meeting_id"] is None
    db.close()


def test_protocol_requires_approved_decision():
    from database.database import SessionLocal, init_db

    init_db()
    db = SessionLocal()
    _, _, form_b = _seed_form_b(db)

    with pytest.raises(CRUDValidationError):
        generate_form_b_protocol_number(db, form_b.id)

    upsert_form_b_meeting_decision(
        db,
        form_b.id,
        form_b.meeting_id,
        "rejected",
    )
    with pytest.raises(CRUDValidationError):
        generate_form_b_protocol_number(db, form_b.id)

    upsert_form_b_meeting_decision(
        db,
        form_b.id,
        form_b.meeting_id,
        "approved",
    )
    _, protocol_number = generate_form_b_protocol_number(db, form_b.id)
    assert protocol_number.startswith("LMCP/IAEC/2026/3/")
    db.close()


def test_meeting_endpoints_require_iaec_role(client):
    res = client.get("/iaec/form-b-with-meeting")
    assert res.status_code == 401

    meeting_res = client.post(
        "/iaec/meeting",
        json={
            "date": "2026-07-23",
            "meeting_number": "9",
            "meeting_time": "10:00",
            "venue": "IAEC Room",
            "minutes": "",
        },
    )
    assert meeting_res.status_code == 401
