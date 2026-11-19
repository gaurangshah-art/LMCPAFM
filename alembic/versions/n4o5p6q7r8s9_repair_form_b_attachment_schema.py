"""repair legacy form_b_attachment schema

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-07-27 16:50:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "n4o5p6q7r8s9"
down_revision = "m3n4o5p6q7r8"
branch_labels = None
depends_on = None


def _create_form_b_attachment_table() -> None:
    op.create_table(
        "form_b_attachment",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("form_b_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("stored_filename", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=200), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["form_b_id"], ["form_b.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("form_b_id", "category", name="uq_form_b_attachment_category"),
    )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "form_b_attachment" not in tables:
        _create_form_b_attachment_table()
        return

    column_names = {column["name"] for column in inspector.get_columns("form_b_attachment")}
    if "category" in column_names and "file_size" in column_names:
        return

    op.drop_table("form_b_attachment")
    _create_form_b_attachment_table()


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "form_b_attachment" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("form_b_attachment")}
    if "category" not in column_names:
        return

    op.drop_table("form_b_attachment")
