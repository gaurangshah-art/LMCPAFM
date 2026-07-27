from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from crud.formb_membership import get_editable_form_b, get_member_form_b
from database.lmcpafm_models import FormBAttachment
from models.user import User
from utils.formb_attachment_storage import (
    FORM_B_ATTACHMENT_CATEGORIES,
    delete_attachment_file,
    resolve_attachment_path,
    write_attachment_file,
)


def _normalize_category(category: str) -> str:
    normalized = category.strip().lower()
    if normalized not in FORM_B_ATTACHMENT_CATEGORIES:
        raise CRUDValidationError("Invalid attachment category.")
    return normalized


def attachment_to_read(attachment: FormBAttachment) -> dict:
    return {
        "id": attachment.id,
        "form_b_id": attachment.form_b_id,
        "category": attachment.category,
        "original_filename": attachment.original_filename,
        "content_type": attachment.content_type,
        "file_size": attachment.file_size,
        "uploaded_at": attachment.uploaded_at,
    }


def list_form_b_attachments(db: Session, user: User, form_b_id: int) -> list[dict]:
    get_member_form_b(db, user, form_b_id)
    rows = (
        db.query(FormBAttachment)
        .filter(FormBAttachment.form_b_id == form_b_id)
        .order_by(FormBAttachment.category.asc(), FormBAttachment.uploaded_at.desc())
        .all()
    )
    return [attachment_to_read(row) for row in rows]


def get_form_b_attachment(
    db: Session,
    user: User,
    form_b_id: int,
    attachment_id: int,
) -> FormBAttachment:
    get_member_form_b(db, user, form_b_id)
    attachment = (
        db.query(FormBAttachment)
        .filter(
            FormBAttachment.id == attachment_id,
            FormBAttachment.form_b_id == form_b_id,
        )
        .first()
    )
    if attachment is None:
        raise CRUDNotFoundError("Attachment not found")
    return attachment


def has_form_b_attachment(db: Session, form_b_id: int, category: str) -> bool:
    return (
        db.query(FormBAttachment)
        .filter(
            FormBAttachment.form_b_id == form_b_id,
            FormBAttachment.category == category,
        )
        .first()
        is not None
    )


def upload_form_b_attachment(
    db: Session,
    user: User,
    form_b_id: int,
    category: str,
    original_filename: str,
    content_type: str | None,
    content: bytes,
) -> dict:
    normalized_category = _normalize_category(category)
    get_editable_form_b(db, user, form_b_id)

    existing = (
        db.query(FormBAttachment)
        .filter(
            FormBAttachment.form_b_id == form_b_id,
            FormBAttachment.category == normalized_category,
        )
        .first()
    )
    if existing is not None:
        delete_attachment_file(form_b_id, existing.stored_filename)
        db.delete(existing)
        db.flush()

    stored_filename, _path = write_attachment_file(form_b_id, original_filename, content)
    attachment = FormBAttachment(
        form_b_id=form_b_id,
        category=normalized_category,
        original_filename=original_filename,
        stored_filename=stored_filename,
        content_type=content_type,
        file_size=len(content),
        uploaded_by_user_id=user.id,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment_to_read(attachment)


def delete_form_b_attachment(
    db: Session,
    user: User,
    form_b_id: int,
    attachment_id: int,
) -> None:
    get_editable_form_b(db, user, form_b_id)
    attachment = get_form_b_attachment(db, user, form_b_id, attachment_id)
    delete_attachment_file(form_b_id, attachment.stored_filename)
    db.delete(attachment)
    db.commit()


def read_attachment_bytes(attachment: FormBAttachment) -> tuple[bytes, str, str | None]:
    path = resolve_attachment_path(attachment.form_b_id, attachment.stored_filename)
    return path.read_bytes(), attachment.original_filename, attachment.content_type
