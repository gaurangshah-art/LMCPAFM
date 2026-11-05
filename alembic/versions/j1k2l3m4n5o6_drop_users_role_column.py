"""backfill user_roles and drop legacy users.role column

Revision ID: j1k2l3m4n5o6
Revises: f7g8h9i0j1k2
Create Date: 2026-07-27 13:40:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision = "j1k2l3m4n5o6"
down_revision = "f7g8h9i0j1k2"
branch_labels = None
depends_on = None


def _backfill_user_roles_from_legacy_column(connection) -> None:
    inspector = inspect(connection)
    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "role" not in user_columns:
        return

    rows = connection.execute(
        text(
            "SELECT id, role "
            "FROM users "
            "WHERE role IS NOT NULL AND TRIM(role) <> ''"
        )
    ).fetchall()

    for user_id, role_name in rows:
        role_name = str(role_name).strip()
        role_row = connection.execute(
            text("SELECT id FROM roles WHERE name = :name"),
            {"name": role_name},
        ).first()

        if role_row:
            role_id = role_row[0]
        else:
            result = connection.execute(
                text("INSERT INTO roles (name) VALUES (:name)"),
                {"name": role_name},
            )
            role_id = result.lastrowid

        exists = connection.execute(
            text(
                "SELECT 1 FROM user_roles "
                "WHERE user_id = :user_id AND role_id = :role_id"
            ),
            {"user_id": user_id, "role_id": role_id},
        ).first()

        if not exists:
            connection.execute(
                text(
                    "INSERT INTO user_roles (user_id, role_id) "
                    "VALUES (:user_id, :role_id)"
                ),
                {"user_id": user_id, "role_id": role_id},
            )


def upgrade() -> None:
    connection = op.get_bind()
    _backfill_user_roles_from_legacy_column(connection)

    inspector = inspect(connection)
    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "role" in user_columns:
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_column("role")


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("role", sa.String(), nullable=False, server_default="investigator")
        )

    connection = op.get_bind()
    rows = connection.execute(
        text(
            "SELECT u.id, r.name "
            "FROM users u "
            "JOIN user_roles ur ON ur.user_id = u.id "
            "JOIN roles r ON r.id = ur.role_id "
            "ORDER BY u.id ASC, r.id ASC"
        )
    ).fetchall()

    seen_users: set[int] = set()
    for user_id, role_name in rows:
        if user_id in seen_users:
            continue
        seen_users.add(user_id)
        connection.execute(
            text("UPDATE users SET role = :role_name WHERE id = :user_id"),
            {"role_name": role_name, "user_id": user_id},
        )

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.alter_column("role", server_default=None)
