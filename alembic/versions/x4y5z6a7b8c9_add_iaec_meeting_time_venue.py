"""add meeting time and venue to iaec_meeting

Revision ID: x4y5z6a7b8c9
Revises: w3x4y5z6a7b8
Create Date: 2026-07-30

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from migration_helpers import column_exists

revision = "x4y5z6a7b8c9"
down_revision = "w3x4y5z6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not column_exists("iaec_meeting", "meeting_time"):
        op.add_column("iaec_meeting", sa.Column("meeting_time", sa.String(length=50), nullable=True))
    if not column_exists("iaec_meeting", "venue"):
        op.add_column("iaec_meeting", sa.Column("venue", sa.String(length=500), nullable=True))


def downgrade() -> None:
    if column_exists("iaec_meeting", "venue"):
        op.drop_column("iaec_meeting", "venue")
    if column_exists("iaec_meeting", "meeting_time"):
        op.drop_column("iaec_meeting", "meeting_time")
