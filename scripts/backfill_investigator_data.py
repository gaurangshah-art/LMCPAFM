"""Backfill investigator profiles and form_b_investigator user links for existing data."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database.database import SessionLocal, engine
from database.lmcpafm_models import FormBInvestigator
from models.investigator_profile import InvestigatorProfile
from models.role import Role
from models.user import User


def backfill_roles() -> None:
    from scripts.migrate_to_multirole import main as migrate_roles

    migrate_roles()


def backfill_investigator_profiles(db) -> int:
    created = 0
    from crud.investigator_profile import get_or_create_profile

    role = db.query(Role).filter(Role.name == "investigator").first()
    if role is None:
        return 0

    investigators = db.query(User).filter(User.roles.contains(role)).all()
    for user in investigators:
        existing = (
            db.query(InvestigatorProfile)
            .filter(InvestigatorProfile.user_id == user.id)
            .first()
        )
        if existing:
            continue
        get_or_create_profile(db, user.id)
        created += 1
    db.commit()
    return created


def backfill_form_b_investigator_links(db) -> int:
    linked = 0
    rows = db.query(FormBInvestigator).filter(FormBInvestigator.user_id.is_(None)).all()
    for row in rows:
        matches = db.query(User).filter(User.name == row.name).all()
        if len(matches) != 1:
            continue
        row.user_id = matches[0].id
        linked += 1
    db.commit()
    return linked


def main() -> None:
    print(f"Using database: {engine.url}")
    backfill_roles()

    db = SessionLocal()
    try:
        profiles_created = backfill_investigator_profiles(db)
        links_created = backfill_form_b_investigator_links(db)
        print(f"Created {profiles_created} investigator profile shell(s).")
        print(f"Linked {links_created} form_b_investigator row(s) to users.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
