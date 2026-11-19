"""Backfill user_roles from legacy users.role before Alembic drops the column.

Prefer `alembic upgrade head` (revision j1k2l3m4n5o6), which performs the same
backfill and removes users.role. Use this script only for manual repair on a DB
that still has the legacy column and has not yet applied that migration.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import MetaData, Table, Column, Integer, String, ForeignKey, inspect, text

from database.database import SessionLocal, engine


def main():
    metadata = MetaData()

    roles = Table(
        "roles",
        metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50), unique=True, nullable=False, index=True),
    )

    user_roles = Table(
        "user_roles",
        metadata,
        Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
        Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    )

    # create only the needed tables
    metadata.create_all(bind=engine)

    inspector = inspect(engine)
    user_columns = {col["name"] for col in inspector.get_columns("users")}

    if "role" not in user_columns:
        print("No legacy users.role column found. Migration complete.")
        return

    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                "SELECT id, role "
                "FROM users "
                "WHERE role IS NOT NULL AND TRIM(role) <> ''"
            )
        ).fetchall()

        for user_id, role_name in rows:
            role_name = str(role_name).strip()

            role_row = db.execute(
                text("SELECT id FROM roles WHERE name = :name"),
                {"name": role_name},
            ).first()

            if role_row:
                role_id = role_row[0]
            else:
                result = db.execute(
                    text("INSERT INTO roles (name) VALUES (:name)"),
                    {"name": role_name},
                )
                role_id = result.lastrowid

            exists = db.execute(
                text(
                    "SELECT 1 FROM user_roles "
                    "WHERE user_id = :user_id AND role_id = :role_id"
                ),
                {"user_id": user_id, "role_id": role_id},
            ).first()

            if not exists:
                db.execute(
                    text(
                        "INSERT INTO user_roles (user_id, role_id) "
                        "VALUES (:user_id, :role_id)"
                    ),
                    {"user_id": user_id, "role_id": role_id},
                )

        db.commit()
        print("Backfill complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()