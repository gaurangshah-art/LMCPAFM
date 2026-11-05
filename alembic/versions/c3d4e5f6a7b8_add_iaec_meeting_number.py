"""add meeting_number to iaec_meeting

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-23 12:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("iaec_meeting", schema=None) as batch_op:
        batch_op.add_column(sa.Column("meeting_number", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("iaec_meeting", schema=None) as batch_op:
        batch_op.drop_column("meeting_number")
