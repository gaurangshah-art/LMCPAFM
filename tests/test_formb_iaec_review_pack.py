from datetime import date, datetime, timezone

from database.database import SessionLocal
from database.lmcpafm_models import FormB

from tests.planning_helpers import create_iaec_project_db


def test_form_b_iaec_review_pack_download(client, iaec_auth_headers):
    project = create_iaec_project_db(
        title="Review Pack Project",
        protocol_number="IAEC-REV-001",
    )
    db = SessionLocal()
    try:
        db.add(
            FormB(
                project_id=project.id,
                date=date(2026, 10, 1),
                application_data={
                    "step1": {
                        "principal_investigator": "Dr Review",
                        "project_title": "Review Pack Project",
                    },
                },
                submitted_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
    finally:
        db.close()

    res = client.get(
        f"/iaec/project/{project.id}/form-b/review-pack/download",
        headers=iaec_auth_headers,
    )
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
    assert len(res.content) > 800
