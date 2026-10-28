from datetime import date, datetime, timezone

from crud.iaec_meeting_review_checklist_pdf import render_iaec_meeting_review_agenda_pdf
from database.database import SessionLocal
from database.lmcpafm_models import FormB, IAECMeeting, IAECProject

from tests.planning_helpers import create_iaec_project_db


def test_meeting_review_agenda_pdf_bytes():
    project = create_iaec_project_db(title="Agenda PDF Test", protocol_number="IAEC-AG-1")
    db = SessionLocal()
    try:
        meeting = IAECMeeting(
            date=date(2026, 11, 1),
            meeting_number="3/2026",
            meeting_time="11:00",
            venue="IAEC Room",
            minutes="",
        )
        db.add(meeting)
        db.flush()
        db.add(
            FormB(
                project_id=project.id,
                date=date(2026, 10, 1),
                meeting_id=meeting.id,
                submitted_at=datetime.now(timezone.utc),
                application_data={"step1": {"principal_investigator": "Dr A"}},
            )
        )
        db.commit()
        pdf = render_iaec_meeting_review_agenda_pdf(db, meeting.id)
        assert pdf.startswith(b"%PDF")
        assert len(pdf) > 400
    finally:
        db.close()
