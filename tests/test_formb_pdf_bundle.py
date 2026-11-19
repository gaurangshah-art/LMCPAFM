from datetime import datetime, timezone
from uuid import uuid4

from crud.formb_pdf_bundle import render_form_b_complete_pdf
from database.database import SessionLocal
from database.lmcpafm_models import FormB, FormBAttachment


def test_complete_pdf_skips_missing_funding_file_on_disk(client, monkeypatch):
    """Funding proof row without file should not block application PDF."""
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    from tests.test_formb_policy import _register_and_login, _start_and_complete_wizard

    headers, payload = _register_and_login(client, monkeypatch, faculty=True)
    form_b_id = _start_and_complete_wizard(client, headers, payload)

    with SessionLocal() as db:
        form_b = db.query(FormB).filter(FormB.id == form_b_id).first()
        assert form_b is not None
        db.add(
            FormBAttachment(
                form_b_id=form_b_id,
                category="funding_proof",
                original_filename="missing.pdf",
                stored_filename=f"{uuid4().hex}_missing.pdf",
                content_type="application/pdf",
                file_size=100,
                uploaded_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        pdf_bytes = render_form_b_complete_pdf(db, form_b.project_id)

    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 5000

    pdf_res = client.get(f"/formb/{form_b_id}/application.pdf", headers=headers)
    assert pdf_res.status_code == 200, pdf_res.text
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")