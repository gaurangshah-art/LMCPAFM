"""Bulk-import facility cages from a CSV exported from Excel.

Template: scripts/templates/facility_cages_template.csv

Required columns:
  label       Unique cage label (e.g. C1, AR1-R3-S2)
  location    Rack / shelf text (e.g. Rack A / Shelf 1)
  room_code   Must match an existing facility_room.code (e.g. R1)

Optional columns:
  capacity    Default 1
  status      Default active

Usage (from repo root, with DATABASE_URL set like the backend):

  python scripts/import_facility_cages.py --csv path/to/cages.csv --dry-run
  python scripts/import_facility_cages.py --csv path/to/cages.csv
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
from database.lmcpafm_models import Cage, FacilityRoom
from crud.admin_facility import create_cage, update_cage
from crud.exceptions import CRUDValidationError
from schemas.schemas_admin_facility import CageCreate, CageUpdate


REQUIRED_COLUMNS = ("label", "location", "room_code")


def _normalize_header(value: str) -> str:
    return (value or "").strip().lower().replace(" ", "_")


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
            label = (raw.get(field_map["label"]) or "").strip()
            location = (raw.get(field_map["location"]) or "").strip()
            room_code = (raw.get(field_map["room_code"]) or "").strip()
            if not label and not location and not room_code:
                continue
            if not label or not location or not room_code:
                raise ValueError(
                    f"Line {line_no}: label, location, and room_code are all required."
                )
            capacity_raw = (raw.get(field_map.get("capacity", ""), "") or "").strip()
            status_raw = (raw.get(field_map.get("status", ""), "") or "").strip()
            rows.append(
                {
                    "label": label,
                    "location": location,
                    "room_code": room_code,
                    "capacity": capacity_raw or "1",
                    "status": status_raw or "active",
                }
            )
        return rows


def import_cages(
    csv_path: Path,
    *,
    dry_run: bool = False,
    update_existing: bool = False,
) -> dict[str, int]:
    rows = _read_rows(csv_path)
    db = SessionLocal()
    stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    try:
        room_by_code = {
            room.code: room
            for room in db.query(FacilityRoom).order_by(FacilityRoom.id.asc()).all()
        }

        for row in rows:
            room = room_by_code.get(row["room_code"])
            if room is None:
                print(f"ERROR {row['label']}: room_code '{row['room_code']}' not found.")
                stats["errors"] += 1
                continue

            try:
                capacity = int(row["capacity"])
            except ValueError:
                print(f"ERROR {row['label']}: invalid capacity '{row['capacity']}'.")
                stats["errors"] += 1
                continue
            if capacity < 1:
                print(f"ERROR {row['label']}: capacity must be at least 1.")
                stats["errors"] += 1
                continue

            existing = db.query(Cage).filter(Cage.label == row["label"]).first()
            if existing is not None:
                if not update_existing:
                    print(f"SKIP {row['label']}: already exists.")
                    stats["skipped"] += 1
                    continue
                if dry_run:
                    print(f"UPDATE {row['label']} -> room {row['room_code']}, {row['location']}")
                    stats["updated"] += 1
                    continue
                update_cage(
                    db,
                    existing.id,
                    CageUpdate(
                        label=row["label"],
                        location=row["location"],
                        room_id=room.id,
                        capacity=capacity,
                        status=row["status"],
                    ),
                )
                stats["updated"] += 1
                continue

            if dry_run:
                print(f"CREATE {row['label']} -> room {row['room_code']}, {row['location']}")
                stats["created"] += 1
                continue

            try:
                create_cage(
                    db,
                    CageCreate(
                        label=row["label"],
                        location=row["location"],
                        room_id=room.id,
                        capacity=capacity,
                        status=row["status"],
                    ),
                )
                stats["created"] += 1
            except CRUDValidationError as exc:
                print(f"ERROR {row['label']}: {exc}")
                stats["errors"] += 1

        if dry_run:
            db.rollback()
        return stats
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Import facility cages from CSV.")
    parser.add_argument("--csv", required=True, type=Path, help="Path to CSV file")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print actions without writing to the database.",
    )
    parser.add_argument(
        "--update-existing",
        action="store_true",
        help="Update cages that already exist (matched by label).",
    )
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    stats = import_cages(
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
