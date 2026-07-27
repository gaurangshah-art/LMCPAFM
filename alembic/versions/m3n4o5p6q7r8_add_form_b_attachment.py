"""add form_b_attachment table

Revision ID: m3n4o5p6q7r8
Revises: k2l3m4n5o6p7
Create Date: 2026-07-27 15:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "m3n4o5p6q7r8"
down_revision = "k2l3m4n5o6p7"
branch_labels = None
depends_on = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_table("form_b_attachment")
