"""add form_b_meeting_decision table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-23 14:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "form_b_meeting_decision",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("form_b_id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("decision", sa.String(), nullable=False),
        sa.Column("approved_animal_count", sa.Integer(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["form_b_id"], ["form_b.id"]),
        sa.ForeignKeyConstraint(["meeting_id"], ["iaec_meeting.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("form_b_id", "meeting_id", name="uq_form_b_meeting_decision"),
    )


def downgrade() -> None:
    op.drop_table("form_b_meeting_decision")
