from __future__ import annotations

import os
import re
import uuid
from pathlib import Path

from crud.exceptions import CRUDValidationError

DEFAULT_ATTACHMENT_ROOT = Path("data/form_b_attachments")
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}

FORM_B_ATTACHMENT_CATEGORIES = frozenset(
    {
        "funding_proof",
        "study_plan_annexure",
        "aerb_certificate",
        "ibsc_certificate",
        "rcgm_certificate",
        "other_hazardous_certificate",
    }
)


def attachment_root() -> Path:
    raw = os.getenv("FORMB_ATTACHMENT_DIR", str(DEFAULT_ATTACHMENT_ROOT))
    return Path(raw)


def _sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^\w.\- ()]", "_", name.strip())
    return cleaned[:200] or "attachment.bin"


def validate_attachment_upload(filename: str, content: bytes) -> None:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise CRUDValidationError(
            "Unsupported file type. Upload PDF, Word, JPG, or PNG files."
        )
    if not content:
        raise CRUDValidationError("Uploaded file is empty.")
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise CRUDValidationError("Attachment exceeds the 10 MB size limit.")


def write_attachment_file(form_b_id: int, original_filename: str, content: bytes) -> tuple[str, Path]:
    validate_attachment_upload(original_filename, content)
    safe_name = _sanitize_filename(original_filename)
    stored_filename = f"{uuid.uuid4().hex}_{safe_name}"
    target_dir = attachment_root() / str(form_b_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / stored_filename
    target_path.write_bytes(content)
    return stored_filename, target_path


def resolve_attachment_path(form_b_id: int, stored_filename: str) -> Path:
    target_path = attachment_root() / str(form_b_id) / stored_filename
    if not target_path.is_file():
        raise CRUDValidationError("Attachment file not found on disk.")
    return target_path


def delete_attachment_file(form_b_id: int, stored_filename: str) -> None:
    target_path = attachment_root() / str(form_b_id) / stored_filename
    if target_path.is_file():
        target_path.unlink()
