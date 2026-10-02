from pathlib import Path
from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import IAECMeeting


def test_import_iaec_meetings_from_csv(client):
    suffix = uuid4().hex[:6]
    csv_path = Path(__file__).parent / f"_tmp_meetings_{suffix}.csv"
    csv_path.write_text(
        "date,meeting_number,meeting_time,venue,minutes\n"
        f"2024-06-01,IMP-{suffix},10:30,IAEC Room,Imported minutes\n",
        encoding="utf-8",
    )

    try:
        from scripts.import_iaec_meetings import import_meetings

        stats = import_meetings(csv_path, dry_run=False)
        assert stats["created"] == 1
        assert stats["errors"] == 0

        db = SessionLocal()
        try:
            meeting = (
                db.query(IAECMeeting)
                .filter(IAECMeeting.meeting_number == f"IMP-{suffix}")
                .first()
            )
            assert meeting is not None
            assert meeting.venue == "IAEC Room"
        finally:
            db.close()
    finally:
        if csv_path.exists():
            csv_path.unlink()
