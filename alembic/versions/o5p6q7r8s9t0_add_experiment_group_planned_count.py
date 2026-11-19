"""add planned_animal_count to experiment_group

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-07-27 17:20:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "o5p6q7r8s9t0"
down_revision = "n4o5p6q7r8s9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("experiment_group") as batch_op:
        batch_op.add_column(
            sa.Column("planned_animal_count", sa.Integer(), nullable=False, server_default="0")
        )
    op.execute("UPDATE experiment_group SET planned_animal_count = 0 WHERE planned_animal_count IS NULL")
    with op.batch_alter_table("experiment_group") as batch_op:
        batch_op.alter_column("planned_animal_count", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("experiment_group") as batch_op:
        batch_op.drop_column("planned_animal_count")
