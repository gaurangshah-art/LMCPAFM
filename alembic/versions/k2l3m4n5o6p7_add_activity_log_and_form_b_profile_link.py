"""add activity_log and expand form_b_investigator linkage

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-07-27 14:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "k2l3m4n5o6p7"
down_revision = "j1k2l3m4n5o6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "activity_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("user_name", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_activity_log_id"), "activity_log", ["id"], unique=False)

    connection = op.get_bind()
    inspector = inspect(connection)
    columns = {col["name"] for col in inspector.get_columns("form_b_investigator")}

    with op.batch_alter_table("form_b_investigator", schema=None) as batch_op:
        if "investigator_profile_user_id" not in columns:
            batch_op.add_column(
                sa.Column("investigator_profile_user_id", sa.Integer(), nullable=True)
            )
        if "role" in columns and "project_role" not in columns:
            batch_op.alter_column("role", new_column_name="project_role")

    with op.batch_alter_table("form_b_investigator", schema=None) as batch_op:
        batch_op.create_foreign_key(
            "fk_form_b_investigator_profile_user",
            "investigator_profile",
            ["investigator_profile_user_id"],
            ["user_id"],
        )

    connection.execute(
        sa.text(
            "UPDATE form_b_investigator "
            "SET investigator_profile_user_id = user_id "
            "WHERE user_id IS NOT NULL "
            "AND investigator_profile_user_id IS NULL "
            "AND user_id IN (SELECT user_id FROM investigator_profile)"
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("form_b_investigator", schema=None) as batch_op:
        batch_op.drop_constraint("fk_form_b_investigator_profile_user", type_="foreignkey")
        batch_op.drop_column("investigator_profile_user_id")
        batch_op.alter_column("project_role", new_column_name="role")

    op.drop_index(op.f("ix_activity_log_id"), table_name="activity_log")
    op.drop_table("activity_log")
