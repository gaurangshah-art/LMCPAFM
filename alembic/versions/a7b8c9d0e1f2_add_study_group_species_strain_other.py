"""add optional species/strain other text on study groups

Revision ID: a7b8c9d0e1f2
Revises: z6a7b8c9d0e1
Create Date: 2026-10-15

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a7b8c9d0e1f2"
down_revision = "z6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "form_b_study_group",
        sa.Column("species_other", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "form_b_study_group",
        sa.Column("strain_other", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("form_b_study_group", "strain_other")
    op.drop_column("form_b_study_group", "species_other")
