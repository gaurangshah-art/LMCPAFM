"""add supply consumables inventory

Revision ID: t0u1v2w3x4y5
Revises: s9t0u1v2w3x4
Create Date: 2026-07-28 13:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from migration_helpers import table_exists

revision = "t0u1v2w3x4y5"
down_revision = "s9t0u1v2w3x4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if table_exists("supply_item"):
        return

    op.create_table(
        "supply_item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("unit", sa.String(length=30), nullable=False, server_default="each"),
        sa.Column("reorder_level", sa.Float(), nullable=False, server_default="0"),
        sa.Column("quantity_on_hand", sa.Float(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", "category", name="uq_supply_item_name_category"),
    )
    op.create_table(
        "supply_transaction",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("txn_type", sa.String(length=20), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("room_id", sa.Integer(), nullable=True),
        sa.Column("recorded_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["supply_item.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["facility_room.id"]),
        sa.ForeignKeyConstraint(["recorded_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("supply_transaction")
    op.drop_table("supply_item")
