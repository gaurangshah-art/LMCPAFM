from __future__ import annotations

import os
import re
import uuid
from pathlib import Path

from crud.exceptions import CRUDValidationError

DEFAULT_SIGNED_CERT_ROOT = Path("data/project_signed_certificates")
MAX_SIGNED_CERT_BYTES = 15 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def signed_certificate_root() -> Path:
    raw = os.getenv("PROJECT_SIGNED_CERTIFICATE_DIR", str(DEFAULT_SIGNED_CERT_ROOT))
    return Path(raw)


def _sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^\w.\- ()]", "_", name.strip())
    return cleaned[:200] or "signed_certificate.pdf"


def validate_signed_certificate_upload(filename: str, content: bytes) -> None:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise CRUDValidationError(
            "Unsupported file type. Upload a scanned PDF or image (JPG/PNG) of the signed certificate."
        )
    if not content:
        raise CRUDValidationError("Uploaded file is empty.")
    if len(content) > MAX_SIGNED_CERT_BYTES:
        raise CRUDValidationError("Signed certificate scan exceeds the 15 MB size limit.")


def write_signed_certificate_file(
    project_id: int,
    original_filename: str,
    content: bytes,
) -> tuple[str, Path]:
    validate_signed_certificate_upload(original_filename, content)
    safe_name = _sanitize_filename(original_filename)
    stored_filename = f"{uuid.uuid4().hex}_{safe_name}"
    target_dir = signed_certificate_root() / str(project_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / stored_filename
    target_path.write_bytes(content)
    return stored_filename, target_path


def resolve_signed_certificate_path(project_id: int, stored_filename: str) -> Path:
    target_path = signed_certificate_root() / str(project_id) / stored_filename
    if not target_path.is_file():
        raise CRUDValidationError("Signed certificate file not found on disk.")
    return target_path


def delete_signed_certificate_file(project_id: int, stored_filename: str) -> None:
    target_path = signed_certificate_root() / str(project_id) / stored_filename
    if target_path.is_file():
        target_path.unlink()
