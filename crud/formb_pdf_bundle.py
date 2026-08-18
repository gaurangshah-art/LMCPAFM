from __future__ import annotations

from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError
from crud.formb_attachments import read_attachment_bytes
from crud.formb_application_pdf import render_cpcsea_form_b_application_pdf
from database.lmcpafm_models import FormB, FormBAttachment, IAECProject
from utils.pdf_merge import attachment_bytes_to_pdf, merge_pdf_documents


def render_form_b_complete_pdf(db: Session, project_id: int) -> bytes:
    from crud.formb_documents import render_study_plan_annexure_pdf
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError("Project not found")

    form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
    if form_b is None:
        raise CRUDNotFoundError("Form B not found for project")

    parts: list[bytes] = [render_cpcsea_form_b_application_pdf(db, project_id)]

    try:
        parts.append(render_study_plan_annexure_pdf(db, form_b.id))
    except Exception:
        pass

    funding_attachment = (
        db.query(FormBAttachment)
        .filter(
            FormBAttachment.form_b_id == form_b.id,
            FormBAttachment.category == "funding_proof",
        )
        .order_by(FormBAttachment.uploaded_at.desc())
        .first()
    )
    if funding_attachment is not None:
        content, filename, content_type = read_attachment_bytes(funding_attachment)
        funding_pdf = attachment_bytes_to_pdf(
            content,
            title="Annexure – Funding Proof / Sponsor Letter",
            content_type=content_type,
            filename=filename,
        )
        if funding_pdf:
            parts.append(funding_pdf)

    if len(parts) == 1:
        return parts[0]
    return merge_pdf_documents(*parts)
