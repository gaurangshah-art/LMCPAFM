from datetime import date

from database.lmcpafm_models import FormB, IAECMeeting, IAECProject


def _seed_invitation_ready_form_b(db):
    meeting = IAECMeeting(date=date(2026, 7, 23), meeting_number="4", minutes="minutes")
    project = IAECProject(
        title="Email Test Project",
        investigator_name="Dr Email",
        principal_investigator="Dr Email",
        protocol_number="LMCP/IAEC/2026/4/001",
    )
    db.add_all([meeting, project])
    db.flush()
    form_b = FormB(
        project_id=project.id,
        date=date.today(),
        meeting_id=meeting.id,
        application_data={
            "step1": {
                "contact_email": "pi@lmcp.ac.in",
                "principal_investigator": "Dr Email",
            }
        },
    )
    db.add(form_b)
    db.commit()
    db.refresh(form_b)
    return meeting, form_b


def test_meeting_invitation_requires_step1_email(client, iaec_auth_headers):
    from database.database import SessionLocal

    db = SessionLocal()
    meeting = IAECMeeting(date=date(2026, 7, 23), meeting_number="5", minutes="m")
    project = IAECProject(
        title="Missing Email",
        investigator_name="Dr Missing",
        protocol_number="LMCP/IAEC/2026/5/001",
    )
    db.add_all([meeting, project])
    db.flush()
    form_b = FormB(project_id=project.id, date=date.today(), meeting_id=meeting.id, application_data={})
    db.add(form_b)
    db.commit()
    db.refresh(form_b)
    db.close()

    res = client.post(
        f"/iaec/form-b/{form_b.id}/send-meeting-invitation",
        headers=iaec_auth_headers,
    )
    assert res.status_code == 400
    assert "email" in res.json()["detail"].lower()


def test_meeting_invitation_queues_when_ready(client, iaec_auth_headers, monkeypatch):
    from database.database import SessionLocal

    db = SessionLocal()
    _meeting, form_b = _seed_invitation_ready_form_b(db)
    db.close()

    monkeypatch.setenv("IAEC_SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("IAEC_SENDER_EMAIL", "iaec@lmcp.ac.in")
    monkeypatch.setattr(
        "crud.formb_email._send_email_with_attachment",
        lambda *args, **kwargs: None,
    )

    res = client.post(
        f"/iaec/form-b/{form_b.id}/send-meeting-invitation",
        headers=iaec_auth_headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["queued"] is True


def test_meeting_summary_pdf_download(client, iaec_auth_headers):
    from database.database import SessionLocal

    db = SessionLocal()
    meeting, _form_b = _seed_invitation_ready_form_b(db)
    db.close()

    res = client.get(
        f"/iaec/meeting/{meeting.id}/summary/download",
        headers=iaec_auth_headers,
    )
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
