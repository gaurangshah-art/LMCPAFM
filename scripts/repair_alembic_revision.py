"""Repair alembic_version when the DB points at a missing local revision.

Some dev databases were migrated with uncommitted revision IDs such as
h8i9j0k1l2m3. This script aligns the DB with the committed chain:

  ... -> e5f6a7b8c9d0 -> f7g8h9i0j1k2 -> j1k2l3m4n5o6
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "database" / "LMCPAFM.db"

TARGET_REVISION = "f7g8h9i0j1k2"
KNOWN_ORPHAN_REVISIONS = {
    "f6a7b8c9d0e1",
    "g7h8i9j0k1l2",
    "h8i9j0k1l2m3",
    "i9j0k1l2m3n4",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db-path",
        default=str(DEFAULT_DB),
        help=f"SQLite database path (default: {DEFAULT_DB})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned changes without writing.",
    )
    return parser.parse_args()


def table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row[1] for row in rows}


def main() -> int:
    args = parse_args()
    db_path = Path(args.db_path)
    if not db_path.exists():
        print(f"Database not found: {db_path}")
        return 1

    connection = sqlite3.connect(db_path)
    try:
        version_row = connection.execute(
            "SELECT version_num FROM alembic_version"
        ).fetchone()
        if not version_row:
            print("No alembic_version row found.")
            return 1

        current_revision = version_row[0]
        if current_revision == TARGET_REVISION:
            print(f"Already at {TARGET_REVISION}.")
            return 0

        if current_revision not in KNOWN_ORPHAN_REVISIONS:
            print(
                f"Current revision {current_revision} is not a known orphan revision. "
                "No automatic repair applied."
            )
            return 1

        form_b_columns = table_columns(connection, "form_b")
        needs_application_data = "application_data" not in form_b_columns

        print(f"Current revision: {current_revision}")
        print(f"Target revision:  {TARGET_REVISION}")
        if needs_application_data:
            print("Will add form_b.application_data")
        print("Will update alembic_version")

        if args.dry_run:
            return 0

        if needs_application_data:
            connection.execute("ALTER TABLE form_b ADD COLUMN application_data JSON")

        connection.execute(
            "UPDATE alembic_version SET version_num = ?",
            (TARGET_REVISION,),
        )
        connection.commit()
        print("Repair complete. Run: alembic upgrade head")
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
