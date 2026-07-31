from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_LOGO_PATH = ROOT_DIR / "static" / "branding" / "lmcp-logo.png"

COLLEGE_DISPLAY_NAME = "L. M. College of Pharmacy, Ahmedabad"
COLLEGE_SHORT_NAME = "LMCP"
SYSTEM_NAME = "LMCPAFM — Animal Facility Management"


def get_college_display_name() -> str:
    return os.getenv("LMCP_COLLEGE_DISPLAY_NAME", COLLEGE_DISPLAY_NAME).strip()


def get_logo_path() -> Path | None:
    configured = os.getenv("LMCP_LOGO_PATH", "").strip()
    if configured:
        path = Path(configured)
        if not path.is_absolute():
            path = ROOT_DIR / path
        return path if path.is_file() else None
    return DEFAULT_LOGO_PATH if DEFAULT_LOGO_PATH.is_file() else None
