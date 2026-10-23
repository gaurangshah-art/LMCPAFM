"""Zip bundle of SOP / QA markdown for sharing with external validators."""

from __future__ import annotations

import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from crud.exceptions import CRUDValidationError

REPO_ROOT = Path(__file__).resolve().parents[1]

# Files QA needs (college internal — do not publish on open web).
QA_PACK_FILES = [
    ("00-START-HERE-README.txt", None),
    ("01-LMCPAFM-QA-Validation-Pack-COMBINED.md", "Docs/lmcpafm_qa_validation_pack.md"),
    ("02-UAT-Evaluator-Guide.md", "Docs/faculty_evaluation_sop.md"),
    ("03-UAT-Checklist-PRINT-THIS.md", "Docs/faculty_evaluation_checklist.md"),
    ("04-Personnel-SOP-Index.md", "Docs/sop_personnel_index.md"),
    ("05-Faculty-Quick-Guide.md", "Docs/sop_faculty_personnel.md"),
    ("06-Form-B-Manual.md", "Docs/form_b_investigator_sop.md"),
    ("07-IAEC-Admin-SOP.md", "Docs/lmcpafm_iaec_admin_sop.md"),
    ("08-Release-Candidate-Notes.md", "Docs/lmcpafm_release_candidate_validation.md"),
]

README = """LMCPAFM — QA / UAT document pack
=================================

SHARE ONLY on college-restricted storage (SharePoint, @lmcp.ac.in Drive, etc.).

Quick start for QA
------------------
1. Open 01-LMCPAFM-QA-Validation-Pack-COMBINED.md (one file with all scenarios + SOPs).
2. Use 03-UAT-Checklist-PRINT-THIS.md for pass/fail sign-off.

How to get the PDF
-----------------
Log in to LMCPAFM → SOPs & guides → Download QA pack (PDF).
That download is already a PDF. Open it in any PDF reader.

Staging URL for testing: https://lmcpafm-staging.lmcp.ac.in

Generated from LMCPAFM backend Docs/ folder.
"""


def qa_pack_zip_filename() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"LMCPAFM-QA-SOP-Pack-{stamp}.zip"


def build_qa_sop_zip_bytes(repo_root: Path | None = None) -> bytes:
    root = repo_root or REPO_ROOT
    buffer = io.BytesIO()
    packed = 0
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("00-START-HERE-README.txt", README)
        packed += 1
        for arcname, rel in QA_PACK_FILES:
            if rel is None:
                continue
            path = root / rel
            if not path.is_file():
                continue
            zf.write(path, arcname=arcname)
            packed += 1
    if packed <= 1:
        raise CRUDValidationError(
            "QA SOP documents are not available on this server. "
            "Ensure Docs/ is deployed and run: python scripts/build_qa_validation_pack.py"
        )
    return buffer.getvalue()


def combined_qa_pack_markdown(repo_root: Path | None = None) -> tuple[str, str]:
    root = repo_root or REPO_ROOT
    path = root / "Docs/lmcpafm_qa_validation_pack.md"
    if not path.is_file():
        raise CRUDValidationError(
            "Combined QA pack missing. Run: python scripts/build_qa_validation_pack.py"
        )
    return path.read_text(encoding="utf-8"), "LMCPAFM-QA-Validation-Pack.md"


_PDF_CACHE: tuple[float, bytes] | None = None


def combined_qa_pack_pdf(repo_root: Path | None = None) -> tuple[bytes, str]:
    """PDF of the combined QA pack. Cached until the source file changes."""
    from utils.markdown_pdf import markdown_to_pdf_bytes

    global _PDF_CACHE
    root = repo_root or REPO_ROOT
    path = root / "Docs/lmcpafm_qa_validation_pack.md"
    if not path.is_file():
        raise CRUDValidationError(
            "Combined QA pack missing. Run: python scripts/build_qa_validation_pack.py"
        )
    mtime = path.stat().st_mtime
    if _PDF_CACHE is not None and _PDF_CACHE[0] == mtime:
        return _PDF_CACHE[1], "LMCPAFM-QA-Validation-Pack.pdf"
    pdf_bytes = markdown_to_pdf_bytes(path.read_text(encoding="utf-8"))
    _PDF_CACHE = (mtime, pdf_bytes)
    return pdf_bytes, "LMCPAFM-QA-Validation-Pack.pdf"
