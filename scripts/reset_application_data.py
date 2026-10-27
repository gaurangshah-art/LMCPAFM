"""Reset LMCPAFM application data for local/dev testing.

Removes the configured database file, clears uploaded attachment/certificate
directories, and recreates an empty schema via Alembic.

Usage:
  python scripts/reset_application_data.py --confirm

Optional: recreate a bootstrap admin after reset:
  python scripts/reset_application_data.py --confirm \\
    --bootstrap-name "Admin User" \\
    --bootstrap-email admin@lmcp.ac.in \\
    --bootstrap-password "YourStrongPassword" \\
    --bootstrap-roles admin,iaec,staff
"""

from __future__ import annotations

import argparse
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from sqlalchemy.engine import make_url

from database.database import DATABASE_URL


DEFAULT_DATA_DIRS = (
    Path("data/form_b_attachments"),
    Path("data/project_signed_certificates"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reset LMCPAFM database and uploaded files.")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Required flag confirming you want to delete all application data.",
    )
    parser.add_argument(
        "--skip-files",
        action="store_true",
        help="Only reset the database; keep attachment/certificate directories.",
    )
    parser.add_argument("--bootstrap-name", help="Create an initial user after reset.")
    parser.add_argument("--bootstrap-email", help="Email for the bootstrap user.")
    parser.add_argument("--bootstrap-password", help="Password for the bootstrap user.")
    parser.add_argument(
        "--bootstrap-roles",
        default="admin,iaec,staff",
        help="Comma-separated roles for bootstrap user (default: admin,iaec,staff).",
    )
    return parser.parse_args()


def resolve_sqlite_path(db_url: str) -> Path | None:
    if not db_url.startswith("sqlite"):
        return None

    url = make_url(db_url)
    database = url.database
    if not database or database == ":memory:":
        return None

    path = Path(database)
    if not path.is_absolute():
        path = ROOT / path
    return path


def clear_directory(path: Path) -> None:
    if not path.exists():
        return
    shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def run_alembic_upgrade() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT,
        check=True,
    )


def run_bootstrap(name: str, email: str, password: str, roles: str) -> None:
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts" / "bootstrap_first_user.py"),
            "--name",
            name,
            "--email",
            email,
            "--password",
            password,
            "--roles",
            roles,
        ],
        cwd=ROOT,
        check=True,
    )


def wipe_sqlite_data(db_path: Path) -> None:
    """Delete all rows while keeping schema and Alembic revision."""
    conn = sqlite3.connect(db_path, timeout=30)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys=OFF")
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cur.fetchall()]
        for table in tables:
            if table.startswith("sqlite_") or table == "alembic_version":
                continue
            cur.execute(f'DELETE FROM "{table}"')
        try:
            cur.execute("DELETE FROM sqlite_sequence")
        except sqlite3.OperationalError:
            pass
        conn.commit()
        try:
            cur.execute("VACUUM")
            conn.commit()
        except sqlite3.OperationalError:
            pass
    finally:
        conn.close()


def main() -> int:
    args = parse_args()
    if not args.confirm:
        print("Refusing to run without --confirm.")
        print("This deletes all users, projects, Form B records, and uploaded files.")
        return 1

    db_url = DATABASE_URL
    sqlite_path = resolve_sqlite_path(db_url)

    if sqlite_path is None:
        print(
            "Only file-backed SQLite databases are supported by this script.\n"
            f"Current DATABASE_URL: {db_url}\n"
            "For PostgreSQL, restore from backup or drop/recreate the database manually.",
        )
        return 1

    print(f"Database: {sqlite_path}")

    if sqlite_path.exists():
        try:
            sqlite_path.unlink()
            print("Deleted database file.")
            print("Applying Alembic migrations...")
            run_alembic_upgrade()
            print("Schema recreated.")
        except PermissionError:
            print("Database file is in use; wiping all rows in place instead.")
            wipe_sqlite_data(sqlite_path)
            print("All table data cleared.")
    else:
        print("Database file not found (will create fresh schema).")
        print("Applying Alembic migrations...")
        run_alembic_upgrade()
        print("Schema recreated.")

    if not args.skip_files:
        for rel_path in DEFAULT_DATA_DIRS:
            target = ROOT / rel_path
            clear_directory(target)
            print(f"Cleared {rel_path}")

    if args.bootstrap_email:
        if not args.bootstrap_name or not args.bootstrap_password:
            print("Bootstrap requires --bootstrap-name and --bootstrap-password.")
            return 1
        print(f"Creating bootstrap user {args.bootstrap_email}...")
        run_bootstrap(
            args.bootstrap_name,
            args.bootstrap_email,
            args.bootstrap_password,
            args.bootstrap_roles,
        )
        print("Bootstrap user created.")
    else:
        print(
            "No bootstrap user created. Create one with:\n"
            "  python scripts/bootstrap_first_user.py --name \"...\" --email \"...\" "
            "--password \"...\" --roles admin,iaec,staff"
        )

    print("Reset complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
