from datetime import date, datetime, timezone

from database.lmcpafm_models import FormB, IAECMeeting, IAECProject


def _meeting(**overrides):
    values = {
        "date": date(2026, 7, 23),
        "meeting_number": "4",
        "meeting_time": "10:30",
        "venue": "IAEC Conference Room",
        "minutes": "minutes",
    }
    values.update(overrides)
    return IAECMeeting(**values)


def _seed_invitation_ready_form_b(db):
    meeting = _meeting()
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
        submitted_at=datetime.now(timezone.utc),
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
    meeting = _meeting(meeting_number="5", minutes="m")
    project = IAECProject(
        title="Missing Email",
        investigator_name="Dr Missing",
        protocol_number="LMCP/IAEC/2026/5/001",
    )
    db.add_all([meeting, project])
    db.flush()
    form_b = FormB(
        project_id=project.id,
        date=date.today(),
        meeting_id=meeting.id,
        submitted_at=datetime.now(timezone.utc),
        application_data={},
    )
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


def test_meeting_invitation_uses_linked_investigator_email(client, iaec_auth_headers, monkeypatch):
    from database.database import SessionLocal
    from database.lmcpafm_models import FormBInvestigator
    from models.user import User

    db = SessionLocal()
    meeting = _meeting(meeting_number="6", minutes="m")
    project = IAECProject(
        title="Linked PI Email",
        investigator_name="Dr Linked",
        principal_investigator="Dr Linked",
        protocol_number="LMCP/IAEC/2026/6/001",
    )
    user = User(
        name="Dr Linked",
        email="linked.pi@lmcp.ac.in",
        password_hash="hash",
        status=True,
    )
    db.add_all([meeting, project, user])
    db.flush()
    form_b = FormB(
        project_id=project.id,
        date=date.today(),
        meeting_id=meeting.id,
        submitted_at=datetime.now(timezone.utc),
        application_data={},
    )
    db.add(form_b)
    db.flush()
    db.add(
        FormBInvestigator(
            form_b_id=form_b.id,
            name="Dr Linked",
            project_role="principal_investigator",
            user_id=user.id,
            investigator_profile_user_id=user.id,
        )
    )
    db.commit()
    db.refresh(form_b)
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


def test_meeting_invitation_resolves_email_from_pi_name(client, iaec_auth_headers, monkeypatch):
    from database.database import SessionLocal
    from models.user import User

    db = SessionLocal()
    meeting = _meeting(meeting_number="7", minutes="m")
    user = User(
        name="Dr Name Match",
        email="name.match@lmcp.ac.in",
        password_hash="hash",
        status=True,
    )
    project = IAECProject(
        title="Name Match Project",
        investigator_name="Dr Name Match",
        principal_investigator="Dr Name Match",
        protocol_number="LMCP/IAEC/2026/7/001",
    )
    db.add_all([meeting, user, project])
    db.flush()
    form_b = FormB(
        project_id=project.id,
        date=date.today(),
        meeting_id=meeting.id,
        submitted_at=datetime.now(timezone.utc),
        application_data={
            "step1": {
                "principal_investigator": "Dr Name Match",
            }
        },
    )
    db.add(form_b)
    db.commit()
    db.refresh(form_b)
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


def test_meeting_invitation_sync_returns_sent_to(client, iaec_auth_headers, monkeypatch):
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
        f"/iaec/form-b/{form_b.id}/send-meeting-invitation/sync",
        headers=iaec_auth_headers,
    )
    assert res.status_code == 200, res.text
    payload = res.json()
    assert payload["ok"] is True
    assert payload["sent_to"] == "pi@lmcp.ac.in"


def test_meeting_invitation_without_protocol_number(client, iaec_auth_headers, monkeypatch):
    from database.database import SessionLocal

    db = SessionLocal()
    meeting = _meeting(meeting_number="8", minutes="m")
    project = IAECProject(
        title="Pre-meeting Invite",
        investigator_name="Dr Pre Meeting",
        principal_investigator="Dr Pre Meeting",
    )
    db.add_all([meeting, project])
    db.flush()
    form_b = FormB(
        project_id=project.id,
        date=date.today(),
        meeting_id=meeting.id,
        submitted_at=datetime.now(timezone.utc),
        application_data={
            "step1": {
                "contact_email": "pre.meeting@lmcp.ac.in",
                "principal_investigator": "Dr Pre Meeting",
            }
        },
    )
    db.add(form_b)
    db.commit()
    db.refresh(form_b)
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


def test_meeting_invitation_email_includes_schedule(client, iaec_auth_headers, monkeypatch):
    from crud.formb_email import _build_meeting_invitation_email_body, build_form_b_meeting_invitation_context
    from database.database import SessionLocal

    db = SessionLocal()
    _meeting, form_b = _seed_invitation_ready_form_b(db)
    context = build_form_b_meeting_invitation_context(db, form_b.id)
    body = _build_meeting_invitation_email_body(context)
    db.close()

    assert "10:30" in body
    assert "IAEC Conference Room" in body
    assert "23/07/2026" in body


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
