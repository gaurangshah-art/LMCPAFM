"""add form b structured study plan tables

Revision ID: v2w3x4y5z6a7
Revises: u1v2w3x4y5z6
Create Date: 2026-07-30

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from migration_helpers import column_exists, fk_exists, table_exists

revision = "v2w3x4y5z6a7"
down_revision = "u1v2w3x4y5z6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not table_exists("form_b_study_phase"):
        op.create_table(
            "form_b_study_phase",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("form_b_id", sa.Integer(), nullable=False),
            sa.Column("phase_code", sa.String(length=50), nullable=False),
            sa.Column("phase_name", sa.String(length=200), nullable=False),
            sa.Column("sequence_order", sa.Integer(), nullable=False),
            sa.Column("objective", sa.Text(), nullable=True),
            sa.Column("planned_start_date", sa.Date(), nullable=True),
            sa.Column("planned_duration_weeks", sa.Integer(), nullable=True),
            sa.Column("animal_cap", sa.Integer(), nullable=False),
            sa.Column("contingency_note", sa.Text(), nullable=True),
            sa.Column("depends_on_phase_id", sa.Integer(), nullable=True),
            sa.Column("reuse_animals_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.ForeignKeyConstraint(["depends_on_phase_id"], ["form_b_study_phase.id"]),
            sa.ForeignKeyConstraint(["form_b_id"], ["form_b.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not table_exists("form_b_study_group"):
        op.create_table(
            "form_b_study_group",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("phase_id", sa.Integer(), nullable=False),
            sa.Column("group_code", sa.String(length=50), nullable=False),
            sa.Column("group_name", sa.String(length=200), nullable=False),
            sa.Column("role", sa.String(length=50), nullable=False),
            sa.Column("animal_count", sa.Integer(), nullable=False),
            sa.Column("species_id", sa.Integer(), nullable=True),
            sa.Column("strain_id", sa.Integer(), nullable=True),
            sa.Column("sex", sa.String(length=50), nullable=True),
            sa.Column("age", sa.String(length=100), nullable=True),
            sa.Column("weight_range", sa.String(length=100), nullable=True),
            sa.Column("feeding_diet", sa.String(length=200), nullable=True),
            sa.Column("housing_notes", sa.Text(), nullable=True),
            sa.Column("treatment_summary", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["phase_id"], ["form_b_study_phase.id"]),
            sa.ForeignKeyConstraint(["species_id"], ["species.id"]),
            sa.ForeignKeyConstraint(["strain_id"], ["strain.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not table_exists("form_b_group_dosing"):
        op.create_table(
            "form_b_group_dosing",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("study_group_id", sa.Integer(), nullable=False),
            sa.Column("agent_name", sa.String(length=200), nullable=False),
            sa.Column("dose", sa.String(length=200), nullable=False),
            sa.Column("route", sa.String(length=100), nullable=False),
            sa.Column("frequency", sa.String(length=100), nullable=False),
            sa.Column("start_day", sa.Integer(), nullable=True),
            sa.Column("end_day", sa.Integer(), nullable=True),
            sa.Column("volume", sa.String(length=100), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["study_group_id"], ["form_b_study_group.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not table_exists("form_b_group_endpoint"):
        op.create_table(
            "form_b_group_endpoint",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("study_group_id", sa.Integer(), nullable=False),
            sa.Column("parameter_code", sa.String(length=100), nullable=False),
            sa.Column("parameter_name", sa.String(length=200), nullable=False),
            sa.Column("schedule_type", sa.String(length=50), nullable=False),
            sa.Column("schedule_detail", sa.String(length=200), nullable=False),
            sa.Column("method", sa.String(length=200), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["study_group_id"], ["form_b_study_group.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not table_exists("form_b_group_fate"):
        op.create_table(
            "form_b_group_fate",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("study_group_id", sa.Integer(), nullable=False),
            sa.Column("fate_type", sa.String(length=50), nullable=False),
            sa.Column("count", sa.Integer(), nullable=False),
            sa.Column("method_or_destination", sa.String(length=500), nullable=True),
            sa.Column("timing", sa.String(length=200), nullable=True),
            sa.ForeignKeyConstraint(["study_group_id"], ["form_b_study_group.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not column_exists("experiment_group", "form_b_study_group_id"):
        with op.batch_alter_table("experiment_group") as batch_op:
            batch_op.add_column(sa.Column("form_b_study_group_id", sa.Integer(), nullable=True))
            if not fk_exists("experiment_group", "fk_experiment_group_form_b_study_group_id"):
                batch_op.create_foreign_key(
                    "fk_experiment_group_form_b_study_group_id",
                    "form_b_study_group",
                    ["form_b_study_group_id"],
                    ["id"],
                )


def downgrade() -> None:
    if column_exists("experiment_group", "form_b_study_group_id"):
        with op.batch_alter_table("experiment_group") as batch_op:
            if fk_exists("experiment_group", "fk_experiment_group_form_b_study_group_id"):
                batch_op.drop_constraint(
                    "fk_experiment_group_form_b_study_group_id",
                    type_="foreignkey",
                )
            batch_op.drop_column("form_b_study_group_id")

    for table in (
        "form_b_group_fate",
        "form_b_group_endpoint",
        "form_b_group_dosing",
        "form_b_study_group",
        "form_b_study_phase",
    ):
        if table_exists(table):
            op.drop_table(table)
