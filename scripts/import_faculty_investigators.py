"""Import faculty CSV: roster + investigator user accounts with a shared initial password.

Accepts columns: email or member_email; name or member_name (optional).

  python scripts/import_faculty_investigators.py --csv "path/to/faculty.csv" --password "..." --dry-run
  python scripts/import_faculty_investigators.py --csv "path/to/faculty.csv" --password "..." --update-existing
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
from crud.investigator_profile import create_profile_shell
from models.role import Role
from models.user import User
from utils.institutional_email import is_lmcp_institutional_email, normalize_email
from utils.security import hash_password

EMAIL_HEADERS = ("email", "member_email")
NAME_HEADERS = ("name", "member_name")
CERTIFIED_HEADERS = (
    "animal_handler",
    "certified_animal_handler",
    "is_certified_animal_handler",
)
INVESTIGATOR_ROLE = "investigator"


def _normalize_header(value: str) -> str:
    return (value or "").strip().lower().replace(" ", "_")


def _pick_column(field_map: dict[str, str], aliases: tuple[str, ...]) -> str | None:
    for alias in aliases:
        if alias in field_map:
            return field_map[alias]
    return None


def _read_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("CSV file has no header row.")
        field_map = {_normalize_header(name): name for name in reader.fieldnames}
        email_key = _pick_column(field_map, EMAIL_HEADERS)
        if email_key is None:
            raise ValueError(
                f"Missing email column. Use one of: {', '.join(EMAIL_HEADERS)}"
            )
        name_key = _pick_column(field_map, NAME_HEADERS)
        certified_key = _pick_column(field_map, CERTIFIED_HEADERS)

        rows: list[dict[str, str]] = []
        for line_no, raw in enumerate(reader, start=2):
            email = (raw.get(email_key) or "").strip()
            if not email:
                continue
            name = (raw.get(name_key, "") or "").strip() if name_key else ""
            normalized = normalize_email(email)
            if not is_lmcp_institutional_email(normalized):
                raise ValueError(
                    f"Line {line_no}: email '{email}' is not an allowed institutional address."
                )
            certified = False
            if certified_key:
                raw_flag = (raw.get(certified_key) or "").strip().lower()
                certified = raw_flag in {"1", "true", "yes", "y"}
            rows.append(
                {
                    "email": normalized,
                    "name": name or normalized.split("@")[0],
                    "certified": certified,
                }
            )
        return rows


def _parse_certified(value: bool | str | None, *, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def _get_or_create_investigator_role(db) -> Role:
    role = db.query(Role).filter(Role.name == INVESTIGATOR_ROLE).first()
    if role:
        return role
    role = Role(name=INVESTIGATOR_ROLE)
    db.add(role)
    db.flush()
    return role


def _upsert_roster(db, email: str, name: str) -> str:
    row = db.query(FacultyRosterEntry).filter(FacultyRosterEntry.email == email).first()
    if row is None:
        db.add(FacultyRosterEntry(email=email, name=name, active=True))
        return "roster_created"
    row.name = name or row.name
    row.active = True
    return "roster_updated"


def _upsert_investigator(
    db,
    *,
    email: str,
    name: str,
    password: str,
    update_existing: bool,
    certified: bool,
) -> str:
    role = _get_or_create_investigator_role(db)
    existing = db.query(User).filter(User.email == email).first()
    password_hash = hash_password(password)

    if existing is not None:
        if not update_existing:
            return "user_skipped"
        existing.name = name
        existing.password_hash = password_hash
        existing.must_change_password = True
        existing.is_certified_animal_handler = certified
        existing.admin_provisioned = True
        existing.status = True
        if role not in existing.roles:
            existing.roles = list(existing.roles) + [role]
        create_profile_shell(db, existing, is_lmcp_faculty=True)
        return "user_updated"

    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        status=True,
        must_change_password=True,
        is_certified_animal_handler=certified,
        admin_provisioned=True,
    )
    user.roles = [role]
    db.add(user)
    db.flush()
    create_profile_shell(db, user, is_lmcp_faculty=True)
    return "user_created"


def import_faculty_investigators(
    csv_path: Path,
    *,
    password: str,
    dry_run: bool = False,
    update_existing: bool = True,
    certify_all: bool = False,
) -> dict[str, int]:
    if not password:
        raise ValueError("Password is required.")
    rows = _read_rows(csv_path)
    db = SessionLocal()
    stats = {
        "roster_created": 0,
        "roster_updated": 0,
        "user_created": 0,
        "user_updated": 0,
        "user_skipped": 0,
        "errors": 0,
    }

    try:
        for row in rows:
            try:
                if dry_run:
                    print(f"WOULD import {row['email']} ({row['name']})")
                    stats["roster_created"] += 1
                    stats["user_created"] += 1
                    continue

                roster_result = _upsert_roster(db, row["email"], row["name"])
                stats[roster_result] += 1
                certified = _parse_certified(row.get("certified"), default=certify_all)
                user_result = _upsert_investigator(
                    db,
                    email=row["email"],
                    name=row["name"],
                    password=password,
                    update_existing=update_existing,
                    certified=certified,
                )
                stats[user_result] += 1
                db.commit()
            except Exception as exc:
                db.rollback()
                print(f"ERROR {row['email']}: {exc}")
                stats["errors"] += 1

        return stats
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import faculty roster and create investigator accounts.",
    )
    parser.add_argument("--csv", required=True, type=Path, help="Path to faculty CSV")
    parser.add_argument(
        "--password",
        required=True,
        help="Initial password for all new/updated investigator accounts.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print actions only.")
    parser.add_argument(
        "--no-update-existing",
        action="store_true",
        help="Skip users that already exist (still upserts roster).",
    )
    parser.add_argument(
        "--certify-all",
        action="store_true",
        help="Mark every imported investigator as certified for animal handling.",
    )
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    stats = import_faculty_investigators(
        args.csv,
        password=args.password,
        dry_run=args.dry_run,
        update_existing=not args.no_update_existing,
        certify_all=args.certify_all,
    )
    mode = "DRY RUN" if args.dry_run else "IMPORT"
    print(f"{mode} complete: {stats}")
    if not args.dry_run and stats["errors"] == 0:
        print(
            "Set LMCP_FACULTY_ROSTER_ENFORCE=true and restart backend to enforce roster on self-registration."
        )
        print("Faculty must change the temporary password on first login.")
    return 1 if stats["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
