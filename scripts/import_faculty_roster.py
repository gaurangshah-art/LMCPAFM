"""Bulk-import approved faculty emails from CSV (Excel export).

Template: scripts/templates/faculty_roster_template.csv

Required columns:
  email           Institutional email (must match registration)

Optional columns:
  name            Display name for admin reference
  active          true/false/yes/no/1/0 (default true)

After import, set LMCP_FACULTY_ROSTER_ENFORCE=true in production .env so
/register-investigator only accepts roster emails. Support staff use admin-created
staff accounts, not this list.

Usage (from repo root, with DATABASE_URL set like the backend):

  python scripts/import_faculty_roster.py --csv path/to/faculty.csv --dry-run
  python scripts/import_faculty_roster.py --csv path/to/faculty.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database.database import SessionLocal
from database import lmcpafm_models  # noqa: F401
from database import lmcpafm_requisition_allocation  # noqa: F401
from database import lmcpafm_experiments  # noqa: F401
import models.activity_log  # noqa: F401
from database.lmcpafm_models import FacultyRosterEntry
from utils.institutional_email import is_lmcp_institutional_email, normalize_email

REQUIRED_COLUMNS = ("email",)


def _normalize_header(value: str) -> str:
    return (value or "").strip().lower().replace(" ", "_")


def _parse_active(value: str) -> bool:
    text = (value or "").strip().lower()
    if not text:
        return True
    if text in {"0", "false", "no", "inactive", "n"}:
        return False
    return True


def _read_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("CSV file has no header row.")
        field_map = {_normalize_header(name): name for name in reader.fieldnames}
        missing = [column for column in REQUIRED_COLUMNS if column not in field_map]
        if missing:
            raise ValueError(f"Missing required column(s): {', '.join(missing)}")

        rows: list[dict[str, str]] = []
        for line_no, raw in enumerate(reader, start=2):
            email = (raw.get(field_map["email"]) or "").strip()
            if not email:
                continue
            name_key = field_map.get("name")
            active_key = field_map.get("active")
            name = (raw.get(name_key, "") or "").strip() if name_key else ""
            active_raw = (raw.get(active_key, "") or "").strip() if active_key else ""
            normalized = normalize_email(email)
            if not is_lmcp_institutional_email(normalized):
                raise ValueError(
                    f"Line {line_no}: email '{email}' is not an allowed institutional address."
                )
            rows.append(
                {
                    "email": normalized,
                    "name": name or None,
                    "active": _parse_active(active_raw),
                }
            )
        return rows


def import_faculty_roster(
    csv_path: Path,
    *,
    dry_run: bool = False,
    update_existing: bool = True,
) -> dict[str, int]:
    rows = _read_rows(csv_path)
    db = SessionLocal()
    stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    try:
        for row in rows:
            existing = (
                db.query(FacultyRosterEntry)
                .filter(FacultyRosterEntry.email == row["email"])
                .first()
            )
            if existing is not None:
                if not update_existing:
                    print(f"SKIP {row['email']}: already on roster.")
                    stats["skipped"] += 1
                    continue
                if dry_run:
                    print(f"UPDATE {row['email']}")
                    stats["updated"] += 1
                    continue
                existing.name = row["name"] or existing.name
                existing.active = row["active"]
                db.commit()
                stats["updated"] += 1
                continue

            if dry_run:
                print(f"CREATE {row['email']} ({row['name'] or '—'})")
                stats["created"] += 1
                continue

            db.add(
                FacultyRosterEntry(
                    email=row["email"],
                    name=row["name"],
                    active=row["active"],
                )
            )
            db.commit()
            stats["created"] += 1

        if dry_run:
            db.rollback()
        return stats
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Import faculty roster emails from CSV.")
    parser.add_argument("--csv", required=True, type=Path, help="Path to CSV file")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print actions without writing to the database.",
    )
    parser.add_argument(
        "--no-update-existing",
        action="store_true",
        help="Skip rows whose email already exists on the roster.",
    )
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    stats = import_faculty_roster(
        args.csv,
        dry_run=args.dry_run,
        update_existing=not args.no_update_existing,
    )
    mode = "DRY RUN" if args.dry_run else "IMPORT"
    print(
        f"{mode} complete: created={stats['created']} updated={stats['updated']} "
        f"skipped={stats['skipped']} errors={stats['errors']}"
    )
    if not args.dry_run and stats["errors"] == 0:
        print(
            "Reminder: set LMCP_FACULTY_ROSTER_ENFORCE=true in .env and restart the backend "
            "to require roster membership for investigator registration."
        )
    return 1 if stats["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
