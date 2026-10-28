from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from crud.project_certificate import get_project_certificate_status
from database.lmcpafm_models import IAECProject, ProjectSignedCertificate
from models.user import User
from utils.project_certificate_storage import (
    delete_signed_certificate_file,
    resolve_signed_certificate_path,
    write_signed_certificate_file,
)


def signed_certificate_to_read(row: ProjectSignedCertificate, uploaded_by_name: str | None = None) -> dict:
    return {
        "id": row.id,
        "project_id": row.project_id,
        "original_filename": row.original_filename,
        "content_type": row.content_type,
        "file_size": row.file_size,
        "uploaded_by_user_id": row.uploaded_by_user_id,
        "uploaded_by_name": uploaded_by_name,
        "uploaded_at": row.uploaded_at.isoformat() if row.uploaded_at else None,
    }


def get_signed_certificate(db: Session, project_id: int) -> ProjectSignedCertificate | None:
    return (
        db.query(ProjectSignedCertificate)
        .filter(ProjectSignedCertificate.project_id == project_id)
        .first()
    )


def get_signed_certificate_read(db: Session, project_id: int) -> dict | None:
    row = get_signed_certificate(db, project_id)
    if row is None:
        return None
    uploaded_by_name = None
    if row.uploaded_by_user_id is not None:
        uploader = db.query(User).filter(User.id == row.uploaded_by_user_id).first()
        uploaded_by_name = uploader.name if uploader else None
    return signed_certificate_to_read(row, uploaded_by_name=uploaded_by_name)


def read_signed_certificate_bytes(db: Session, project_id: int) -> tuple[bytes, str, str | None]:
    row = get_signed_certificate(db, project_id)
    if row is None:
        raise CRUDNotFoundError("Signed certificate has not been uploaded for this project.")
    path = resolve_signed_certificate_path(project_id, row.stored_filename)
    return path.read_bytes(), row.original_filename, row.content_type


def upload_signed_certificate(
    db: Session,
    user: User,
    project_id: int,
    original_filename: str,
    content_type: str | None,
    content: bytes,
) -> dict:
    project = db.query(IAECProject).filter(IAECProject.id == project_id).first()
    if project is None:
        raise CRUDNotFoundError("Project not found")

    status = get_project_certificate_status(db, project_id)
    if not status.get("is_final"):
        raise CRUDValidationError(
            "Signed hard-copy certificates can only be uploaded after all experiment groups "
            "are planned and experiment records are complete in the system."
        )

    stored_filename, _path = write_signed_certificate_file(project_id, original_filename, content)
    existing = get_signed_certificate(db, project_id)
    if existing is not None:
        delete_signed_certificate_file(project_id, existing.stored_filename)
        existing.original_filename = original_filename
        existing.stored_filename = stored_filename
        existing.content_type = content_type
        existing.file_size = len(content)
        existing.uploaded_by_user_id = user.id
        existing.uploaded_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return signed_certificate_to_read(existing, uploaded_by_name=user.name)

    row = ProjectSignedCertificate(
        project_id=project_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        content_type=content_type,
        file_size=len(content),
        uploaded_by_user_id=user.id,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return signed_certificate_to_read(row, uploaded_by_name=user.name)
