import os


def is_faculty_roster_enforced() -> bool:
    raw = os.getenv("LMCP_FACULTY_ROSTER_ENFORCE", "false").strip().lower()
    return raw in {"1", "true", "yes", "on"}
