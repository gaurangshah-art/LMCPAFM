from __future__ import annotations

import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from crud.exceptions import CRUDValidationError

REPO_ROOT = Path(__file__).resolve().parents[1]

FACILITY_SOP_FILES = [
    "Docs/sop_facility_daily_operations.md",
    "Docs/facility_equipment_register.md",
    "Docs/templates/facility_equipment_register.csv",
    "Docs/sop_personnel_index.md",
    "Docs/sop_admin_personnel.md",
    "Docs/facility_sop_source_catalog.md",
    "Docs/sop_master_index.md",
]

README = """LMCP Animal Facility — SOP reference pack
Generated from the LMCPAFM application (markdown sources).

Primary daily-operations SOP:
  sop_facility_daily_operations.md

Equipment register:
  facility_equipment_register.md
  templates/facility_equipment_register.csv

Admin / LMCPAFM facility setup:
  sop_admin_personnel.md

Internal mapping from industry references (college internal use):
  facility_sop_source_catalog.md

Industry originals under Docs/source_industry/ are not included.

Export to PDF: open each .md in an editor or use Pandoc if your college requires signed PDFs.
"""


def facility_sop_zip_filename() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"LMCP-Facility-SOP-Pack-{stamp}.zip"


def build_facility_sop_zip_bytes(repo_root: Path | None = None) -> bytes:
    root = repo_root or REPO_ROOT
    buffer = io.BytesIO()
    packed = 0
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("README.txt", README)
        for rel in FACILITY_SOP_FILES:
            path = root / rel
            if not path.is_file():
                continue
            arcname = f"templates/{path.name}" if "templates/" in rel else path.name
            zf.write(path, arcname=arcname)
            packed += 1
    if packed == 0:
        raise CRUDValidationError(
            "Facility SOP documents are not available on this server. "
            "Ensure the Docs/ folder is deployed with the backend."
        )
    return buffer.getvalue()
