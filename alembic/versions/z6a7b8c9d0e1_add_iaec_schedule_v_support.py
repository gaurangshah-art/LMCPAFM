"""add IAEC members, meeting minutes fields, and attendance for Schedule V

Revision ID: z6a7b8c9d0e1
Revises: y5z6a7b8c9d0
Create Date: 2026-10-09

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "z6a7b8c9d0e1"
down_revision = "y5z6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "iaec_member",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("designation", sa.String(length=200), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column(
        "iaec_meeting",
        sa.Column("minutes_item1", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "iaec_meeting",
        sa.Column("minutes_item2", sa.Text(), nullable=False, server_default=""),
    )
    op.create_table(
        "iaec_meeting_attendance",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("member_id", sa.Integer(), nullable=False),
        sa.Column("present", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["meeting_id"], ["iaec_meeting.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["member_id"], ["iaec_member.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("meeting_id", "member_id", name="uq_iaec_meeting_attendance"),
    )


def downgrade() -> None:
    op.drop_table("iaec_meeting_attendance")
    op.drop_column("iaec_meeting", "minutes_item2")
    op.drop_column("iaec_meeting", "minutes_item1")
    op.drop_table("iaec_member")
