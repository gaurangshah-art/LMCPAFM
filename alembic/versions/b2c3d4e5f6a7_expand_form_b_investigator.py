"""expand form_b_investigator with linkage and permission columns

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-22 12:30:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("form_b_investigator", schema=None) as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("investigator_type", sa.String(), nullable=True))
        batch_op.add_column(
            sa.Column("can_view_status", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column(
                "can_view_approval_letters",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.add_column(
            sa.Column("can_edit_forms", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column("can_submit_form_b", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_foreign_key(
            "fk_form_b_investigator_user_id",
            "users",
            ["user_id"],
            ["id"],
        )

    with op.batch_alter_table("form_b_investigator", schema=None) as batch_op:
        batch_op.alter_column("can_view_status", server_default=None)
        batch_op.alter_column("can_view_approval_letters", server_default=None)
        batch_op.alter_column("can_edit_forms", server_default=None)
        batch_op.alter_column("can_submit_form_b", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("form_b_investigator", schema=None) as batch_op:
        batch_op.drop_constraint("fk_form_b_investigator_user_id", type_="foreignkey")
        batch_op.drop_column("updated_at")
        batch_op.drop_column("created_at")
        batch_op.drop_column("can_submit_form_b")
        batch_op.drop_column("can_edit_forms")
        batch_op.drop_column("can_view_approval_letters")
        batch_op.drop_column("can_view_status")
        batch_op.drop_column("investigator_type")
        batch_op.drop_column("user_id")
