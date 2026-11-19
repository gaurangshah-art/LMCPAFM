"""Diagnose IAEC meeting invitation email for a Form B record.

Usage (on staging server):
  sudo docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml exec backend \
    python scripts/diagnose_meeting_invitation.py --form-b-id 2

Add --send to attempt delivery (same path as IAEC Dashboard Send invitation).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database.database import SessionLocal, init_db
from database import lmcpafm_models  # noqa: F401
from database import lmcpafm_requisition_allocation  # noqa: F401
from database import lmcpafm_experiments  # noqa: F401
import models.role  # noqa: F401
import models.investigator_profile  # noqa: F401
import models.activity_log  # noqa: F401

from crud.exceptions import CRUDValidationError
from crud.formb_email import (
    build_form_b_meeting_invitation_context,
    send_form_b_meeting_invitation_email,
    validate_form_b_meeting_invitation_ready,
)
from crud.formb_internal import get_form_b_by_id


def _mask(value: str | None) -> str:
    if not value:
        return "(not set)"
    if len(value) <= 4:
        return "***"
    return value[:2] + "***" + value[-2:]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--form-b-id", type=int, required=True)
    parser.add_argument(
        "--send",
        action="store_true",
        help="Send the invitation email (same as IAEC Dashboard).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    init_db()
    db = SessionLocal()

    try:
        form_b = get_form_b_by_id(db, args.form_b_id)
        step1 = (form_b.application_data or {}).get("step1") or {}

        print(f"Form B ID: {form_b.id}")
        print(f"Submitted: {form_b.submitted_at is not None} ({form_b.submitted_at})")
        print(f"Meeting ID: {form_b.meeting_id or '(not assigned)'}")
        print(f"Step 1 contact_email: {step1.get('contact_email') or '(missing)'}")
        print(f"Step 1 principal_investigator: {step1.get('principal_investigator') or '(missing)'}")

        print("\nSMTP environment (masked):")
        print(f"  IAEC_SMTP_HOST: {os.getenv('IAEC_SMTP_HOST') or '(not set)'}")
        print(f"  IAEC_SMTP_PORT: {os.getenv('IAEC_SMTP_PORT', '587')}")
        print(f"  IAEC_SMTP_USERNAME: {os.getenv('IAEC_SMTP_USERNAME') or '(not set)'}")
        print(f"  IAEC_SMTP_PASSWORD: {_mask(os.getenv('IAEC_SMTP_PASSWORD'))}")
        print(f"  IAEC_SENDER_EMAIL: {os.getenv('IAEC_SENDER_EMAIL') or '(not set)'}")

        try:
            validate_form_b_meeting_invitation_ready(db, args.form_b_id)
            context = build_form_b_meeting_invitation_context(db, args.form_b_id)
            print("\nValidation: OK")
            print(f"Resolved recipient: {context.principal_investigator_email}")
            print(f"Meeting: {context.meeting_date} #{context.meeting_number} @ {context.meeting_venue}")
            print(f"Protocol: {context.protocol_number or '(none yet)'}")
        except CRUDValidationError as exc:
            print(f"\nValidation FAILED: {exc}")
            return 1

        if args.send:
            print("\nSending invitation...")
            try:
                sent_to = send_form_b_meeting_invitation_email(db, args.form_b_id)
            except Exception as exc:
                print(f"Send FAILED: {type(exc).__name__}: {exc}")
                return 1
            print(f"Send OK: delivered to {sent_to['sent_to']}")
            print(f"Protocol number: {sent_to['protocol_number']}")
        else:
            print("\nDry run only. Re-run with --send to deliver the email.")

        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
