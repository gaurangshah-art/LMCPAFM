"""Import historically approved IAEC protocols (minimal project + Form B + decision).

Links each row to an existing IAEC meeting (import meetings first via import_iaec_meetings.py).

Template: scripts/templates/iaec_carryover_protocols_template.csv

Usage:
  python scripts/import_iaec_carryover_protocols.py --csv path/to/protocols.csv --dry-run
  python scripts/import_iaec_carryover_protocols.py --csv path/to/protocols.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from datetime import date, datetime, timezone

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database.database import SessionLocal
from database import lmcpafm_models  # noqa: F401
from database import lmcpafm_requisition_allocation  # noqa: F401
from database import lmcpafm_experiments  # noqa: F401
import models.activity_log  # noqa: F401
from database.lmcpafm_models import (
    FormB,
    FormBInvestigator,
    FormBMeetingDecision,
    IAECMeeting,
    IAECProject,
)
from models.user import User
from schemas.schemas_formb import FormBMeetingDecisionValue
from utils.institutional_email import normalize_email

REQUIRED = (
    "meeting_date",
    "meeting_number",
    "protocol_number",
    "project_title",
    "principal_investigator",
    "approved_animal_count",
)

APPROVED_DECISIONS = {
    "approved",
    FormBMeetingDecisionValue.approved.value,
    FormBMeetingDecisionValue.approved_with_revisions.value,
    FormBMeetingDecisionValue.animal_count_amended.value,
}


def _normalize_header(value: str) -> str:
    return (value or "").strip().lower().replace(" ", "_")


def _parse_date(value: str) -> date:
    text = value.strip()
    if len(text) >= 10:
        text = text[:10]
    return date.fromisoformat(text)


def _parse_bool_ongoing(value: str) -> bool:
    text = (value or "y").strip().lower()
    return text not in {"n", "no", "false", "0"}


def _parse_int(value: str, field: str, line_no: int) -> int:
    text = (value or "").strip()
    if not text:
        raise ValueError(f"Line {line_no}: {field} is required.")
    try:
        parsed = int(text)
    except ValueError as exc:
        raise ValueError(f"Line {line_no}: invalid integer for {field}: '{value}'") from exc
    if parsed < 0:
        raise ValueError(f"Line {line_no}: {field} must be >= 0.")
    return parsed


def _read_rows(csv_path: Path) -> list[dict]:
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("CSV file has no header row.")
        field_map = {_normalize_header(name): name for name in reader.fieldnames}
        missing = [col for col in REQUIRED if col not in field_map]
        if missing:
            raise ValueError(f"Missing required column(s): {', '.join(missing)}")

        rows: list[dict] = []
        for line_no, raw in enumerate(reader, start=2):
            if not any((v or "").strip() for v in raw.values()):
                continue
            parsed: dict = {"_line": line_no}
            for key in REQUIRED:
                parsed[key] = (raw.get(field_map[key]) or "").strip()
            for optional in (
                "pi_email",
                "approval_date",
                "remaining_animal_count",
                "decision",
                "decision_remarks",
                "ongoing",
            ):
                opt_key = field_map.get(optional)
                parsed[optional] = (raw.get(opt_key, "") or "").strip() if opt_key else ""

            if not _parse_bool_ongoing(parsed.get("ongoing", "")):
                continue

            parsed["meeting_date"] = _parse_date(parsed["meeting_date"])
            approval_raw = parsed.get("approval_date") or ""
            parsed["approval_date"] = (
                _parse_date(approval_raw) if approval_raw else parsed["meeting_date"]
            )
            approved_total = _parse_int(
                parsed["approved_animal_count"], "approved_animal_count", line_no
            )
            remaining_raw = parsed.get("remaining_animal_count") or ""
            if remaining_raw:
                cap = _parse_int(remaining_raw, "remaining_animal_count", line_no)
            else:
                cap = approved_total
            parsed["animal_cap"] = cap
            parsed["approved_animal_count"] = approved_total

            decision = (parsed.get("decision") or "approved").strip().lower()
            if decision not in APPROVED_DECISIONS:
                raise ValueError(
                    f"Line {line_no}: decision must be an approved type (got '{decision}')."
                )
            parsed["decision"] = decision
            rows.append(parsed)
        return rows


def _find_meeting(db, meeting_date: date, meeting_number: str) -> IAECMeeting | None:
    return (
        db.query(IAECMeeting)
        .filter(
            IAECMeeting.date == meeting_date,
            IAECMeeting.meeting_number == meeting_number,
        )
        .first()
    )


def _protocol_exists(db, protocol_number: str) -> bool:
    return (
        db.query(IAECProject)
        .filter(IAECProject.protocol_number == protocol_number)
        .first()
        is not None
    )


def _import_row(db, row: dict, *, dry_run: bool) -> str:
    protocol = row["protocol_number"]
    if _protocol_exists(db, protocol):
        return "skipped_existing_protocol"

    meeting = _find_meeting(db, row["meeting_date"], row["meeting_number"])
    if meeting is None:
        raise ValueError(
            f"No IAEC meeting found for date={row['meeting_date']} "
            f"meeting_number={row['meeting_number']!r}. Import meetings first."
        )

    if dry_run:
        return "would_create"

    project = IAECProject(
        title=row["project_title"],
        investigator_name=row["principal_investigator"],
        principal_investigator=row["principal_investigator"],
        protocol_number=protocol,
        approval_date=row["approval_date"],
        status="approved",
        start_date=row["approval_date"],
    )
    db.add(project)
    db.flush()

    submitted_at = datetime.combine(
        row["approval_date"],
        datetime.min.time(),
        tzinfo=timezone.utc,
    )
    step1 = {
        "principal_investigator": row["principal_investigator"],
        "project_title": row["project_title"],
    }
    pi_email = (row.get("pi_email") or "").strip()
    if pi_email:
        step1["contact_email"] = normalize_email(pi_email)

    form_b = FormB(
        project_id=project.id,
        date=row["approval_date"],
        meeting_id=meeting.id,
        submitted_at=submitted_at,
        application_data={"step1": step1, "_imported_carryover": True},
    )
    db.add(form_b)
    db.flush()

    db.add(
        FormBMeetingDecision(
            form_b_id=form_b.id,
            meeting_id=meeting.id,
            decision=row["decision"],
            approved_animal_count=row["animal_cap"],
            remarks=(row.get("decision_remarks") or "").strip() or None,
        )
    )

    user = None
    if pi_email:
        user = db.query(User).filter(User.email == normalize_email(pi_email)).first()

    db.add(
        FormBInvestigator(
            form_b_id=form_b.id,
            name=row["principal_investigator"],
            project_role="principal_investigator",
            investigator_type="faculty",
            user_id=user.id if user else None,
            investigator_profile_user_id=user.id if user else None,
            can_view_status=True,
            can_view_approval_letters=True,
            can_edit_forms=False,
            can_submit_form_b=False,
        )
    )

    db.commit()
    return "created"


def import_carryover_protocols(csv_path: Path, *, dry_run: bool = False) -> dict[str, int]:
    rows = _read_rows(csv_path)
    db = SessionLocal()
    stats = {
        "created": 0,
        "skipped_existing_protocol": 0,
        "would_create": 0,
        "skipped_not_ongoing": 0,
        "errors": 0,
    }

    try:
        for row in rows:
            try:
                result = _import_row(db, row, dry_run=dry_run)
                stats[result] = stats.get(result, 0) + 1
            except Exception as exc:
                db.rollback()
                line = row.get("_line", "?")
                print(f"ERROR line {line} protocol {row.get('protocol_number')}: {exc}")
                stats["errors"] += 1
        return stats
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Import carry-over approved IAEC protocols.")
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    try:
        stats = import_carryover_protocols(args.csv, dry_run=args.dry_run)
    except ValueError as exc:
        print(f"CSV error: {exc}", file=sys.stderr)
        return 1

    mode = "DRY RUN" if args.dry_run else "IMPORT"
    print(f"{mode} complete: {stats}")
    return 1 if stats["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
