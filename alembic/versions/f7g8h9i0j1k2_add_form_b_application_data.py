"""add application_data and submitted_at to form_b

Revision ID: f7g8h9i0j1k2
Revises: e5f6a7b8c9d0
Create Date: 2026-07-27 12:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "f7g8h9i0j1k2"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("form_b", schema=None) as batch_op:
        batch_op.add_column(sa.Column("application_data", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("form_b", schema=None) as batch_op:
        batch_op.drop_column("submitted_at")
        batch_op.drop_column("application_data")
