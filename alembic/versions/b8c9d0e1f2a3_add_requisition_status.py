"""add requisition status and amend/cancel timestamps

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-10-21

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "b8c9d0e1f2a3"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "animal_requisition",
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
    )
    op.add_column(
        "animal_requisition",
        sa.Column("amended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "animal_requisition",
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("animal_requisition", "cancelled_at")
    op.drop_column("animal_requisition", "amended_at")
    op.drop_column("animal_requisition", "status")
