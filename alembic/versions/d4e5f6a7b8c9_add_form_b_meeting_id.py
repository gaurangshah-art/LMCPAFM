"""add meeting_id to form_b

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-23 13:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("form_b", schema=None) as batch_op:
        batch_op.add_column(sa.Column("meeting_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_form_b_meeting_id",
            "iaec_meeting",
            ["meeting_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("form_b", schema=None) as batch_op:
        batch_op.drop_constraint("fk_form_b_meeting_id", type_="foreignkey")
        batch_op.drop_column("meeting_id")
