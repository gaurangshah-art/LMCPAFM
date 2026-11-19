"""add experiment_group_id to experiment

Revision ID: p6q7r8s9t0u1
Revises: o5p6q7r8s9t0
Create Date: 2026-07-27 17:35:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "p6q7r8s9t0u1"
down_revision = "o5p6q7r8s9t0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("experiment") as batch_op:
        batch_op.add_column(sa.Column("experiment_group_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_experiment_experiment_group_id",
            "experiment_group",
            ["experiment_group_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("experiment") as batch_op:
        batch_op.drop_constraint("fk_experiment_experiment_group_id", type_="foreignkey")
        batch_op.drop_column("experiment_group_id")
