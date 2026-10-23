"""Bulk-import IAEC meetings from a CSV exported from Excel.

Template: scripts/templates/iaec_meetings_template.csv

Required columns:
  date            Meeting date (YYYY-MM-DD)
  meeting_number  IAEC meeting number (used in protocol IDs, e.g. 3)
  meeting_time    e.g. 10:30
  venue           e.g. IAEC Conference Room

Optional columns:
  minutes         Default: placeholder text for historical imports

Usage (from repo root, with DATABASE_URL set like the backend):

  python scripts/import_iaec_meetings.py --csv path/to/meetings.csv --dry-run
  python scripts/import_iaec_meetings.py --csv path/to/meetings.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database.database import SessionLocal
from database import lmcpafm_models  # noqa: F401
from database import lmcpafm_requisition_allocation  # noqa: F401
from database import lmcpafm_experiments  # noqa: F401
import models.activity_log  # noqa: F401
from database.lmcpafm_models import IAECMeeting

REQUIRED_COLUMNS = ("date", "meeting_number", "meeting_time", "venue")
DEFAULT_MINUTES = "Historical meeting record imported from archive."


def _normalize_header(value: str) -> str:
    return (value or "").strip().lower().replace(" ", "_")


def _parse_date(value: str) -> date:
    text = value.strip()
    if len(text) >= 10:
        text = text[:10]
    return date.fromisoformat(text)


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
            parsed = {
                key: (raw.get(field_map[key]) or "").strip()
                for key in REQUIRED_COLUMNS
            }
            if not any(parsed.values()):
                continue
            if not all(parsed.values()):
                raise ValueError(
                    f"Line {line_no}: date, meeting_number, meeting_time, and venue are required."
                )
            minutes = (raw.get(field_map.get("minutes", ""), "") or "").strip()
            rows.append({**parsed, "minutes": minutes or DEFAULT_MINUTES})
        return rows


def import_meetings(
    csv_path: Path,
    *,
    dry_run: bool = False,
    update_existing: bool = False,
) -> dict[str, int]:
    rows = _read_rows(csv_path)
    db = SessionLocal()
    stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    try:
        for row in rows:
            try:
                meeting_date = _parse_date(row["date"])
            except ValueError:
                print(f"ERROR meeting {row['meeting_number']}: invalid date '{row['date']}'.")
                stats["errors"] += 1
                continue

            meeting_number = row["meeting_number"]
            existing = (
                db.query(IAECMeeting)
                .filter(
                    IAECMeeting.meeting_number == meeting_number,
                    IAECMeeting.date == meeting_date,
                )
                .first()
            )

            if existing is not None:
                if not update_existing:
                    print(f"SKIP meeting {meeting_number} on {meeting_date}: already exists.")
                    stats["skipped"] += 1
                    continue
                if dry_run:
                    print(f"UPDATE meeting {meeting_number} on {meeting_date}")
                    stats["updated"] += 1
                    continue
                existing.meeting_time = row["meeting_time"]
                existing.venue = row["venue"]
                existing.minutes = row["minutes"]
                db.commit()
                stats["updated"] += 1
                continue

            if dry_run:
                print(f"CREATE meeting {meeting_number} on {meeting_date} @ {row['venue']}")
                stats["created"] += 1
                continue

            meeting = IAECMeeting(
                date=meeting_date,
                meeting_number=meeting_number,
                meeting_time=row["meeting_time"],
                venue=row["venue"],
                minutes=row["minutes"],
            )
            db.add(meeting)
            db.commit()
            stats["created"] += 1

        if dry_run:
            db.rollback()
        return stats
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Import IAEC meetings from CSV.")
    parser.add_argument("--csv", required=True, type=Path, help="Path to CSV file")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print actions without writing to the database.",
    )
    parser.add_argument(
        "--update-existing",
        action="store_true",
        help="Update meetings matched by meeting_number + date.",
    )
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    stats = import_meetings(
        args.csv,
        dry_run=args.dry_run,
        update_existing=args.update_existing,
    )
    mode = "DRY RUN" if args.dry_run else "IMPORT"
    print(
        f"{mode} complete: created={stats['created']} updated={stats['updated']} "
        f"skipped={stats['skipped']} errors={stats['errors']}"
    )
    return 1 if stats["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
