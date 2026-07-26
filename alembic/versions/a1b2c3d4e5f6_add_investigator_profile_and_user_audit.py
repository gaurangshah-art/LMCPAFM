"""add investigator_profile and user audit columns

Revision ID: a1b2c3d4e5f6
Revises: 3cdf8d7dbd1e
Create Date: 2026-07-22 12:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "3cdf8d7dbd1e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "investigator_profile",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("institutional_email", sa.String(), nullable=True),
        sa.Column("institution_name", sa.String(), nullable=True),
        sa.Column("department", sa.String(), nullable=True),
        sa.Column("designation", sa.String(), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("qualification", sa.String(), nullable=True),
        sa.Column("years_experience", sa.Integer(), nullable=True),
        sa.Column("animal_handling_experience", sa.Text(), nullable=True),
        sa.Column("is_lmcp_faculty", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))

    # Drop server defaults so application-level defaults apply for new rows.
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.alter_column("email_verified", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("updated_at")
        batch_op.drop_column("created_at")
        batch_op.drop_column("email_verified")

    op.drop_table("investigator_profile")
