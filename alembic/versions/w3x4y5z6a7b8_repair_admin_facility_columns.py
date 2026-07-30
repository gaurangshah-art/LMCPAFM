"""repair admin facility columns skipped by early-return migration

Revision ID: w3x4y5z6a7b8
Revises: v2w3x4y5z6a7
Create Date: 2026-07-30

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from migration_helpers import column_exists, fk_exists, index_exists, table_exists

revision = "w3x4y5z6a7b8"
down_revision = "v2w3x4y5z6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for column_name, column_type in [
        ("supplier_registration_number", sa.String(length=200)),
        ("received_by_name", sa.String(length=200)),
        ("remarks", sa.Text()),
        ("recorded_by_user_id", sa.Integer()),
    ]:
        if not column_exists("procurement", column_name):
            op.add_column("procurement", sa.Column(column_name, column_type, nullable=True))
    if not fk_exists("procurement", "fk_procurement_recorded_by_user_id"):
        with op.batch_alter_table("procurement", schema=None) as batch_op:
            batch_op.create_foreign_key(
                "fk_procurement_recorded_by_user_id",
                "users",
                ["recorded_by_user_id"],
                ["id"],
            )

    for column_name, column_type in [
        ("animal_number", sa.String(length=100)),
        ("date_of_birth", sa.Date()),
        ("source_type", sa.String(length=50)),
        ("procurement_id", sa.Integer()),
        ("breeding_record_id", sa.Integer()),
        ("quarantine_start_date", sa.Date()),
        ("quarantine_end_date", sa.Date()),
        ("rehabilitation_date", sa.Date()),
        ("notes", sa.Text()),
    ]:
        if not column_exists("animal", column_name):
            op.add_column("animal", sa.Column(column_name, column_type, nullable=True))

    animal_fk_missing = (
        not fk_exists("animal", "fk_animal_procurement_id")
        or not fk_exists("animal", "fk_animal_breeding_record_id")
    )
    if animal_fk_missing:
        with op.batch_alter_table("animal", schema=None) as batch_op:
            if not fk_exists("animal", "fk_animal_procurement_id"):
                batch_op.create_foreign_key(
                    "fk_animal_procurement_id",
                    "procurement",
                    ["procurement_id"],
                    ["id"],
                )
            if not fk_exists("animal", "fk_animal_breeding_record_id"):
                batch_op.create_foreign_key(
                    "fk_animal_breeding_record_id",
                    "breeding_record",
                    ["breeding_record_id"],
                    ["id"],
                )

    if not index_exists("animal", "ix_animal_animal_number"):
        op.create_index("ix_animal_animal_number", "animal", ["animal_number"], unique=True)

    for column_name, column_type in [
        ("from_room_id", sa.Integer()),
        ("to_room_id", sa.Integer()),
        ("reason", sa.String(length=500)),
        ("recorded_by_user_id", sa.Integer()),
    ]:
        if not column_exists("animal_movement", column_name):
            op.add_column("animal_movement", sa.Column(column_name, column_type, nullable=True))

    movement_fk_missing = (
        (table_exists("facility_room") and not fk_exists("animal_movement", "fk_animal_movement_from_room_id"))
        or (table_exists("facility_room") and not fk_exists("animal_movement", "fk_animal_movement_to_room_id"))
        or not fk_exists("animal_movement", "fk_animal_movement_recorded_by_user_id")
    )
    movement_alter_needed = column_exists("animal_movement", "from_cage_id") or column_exists(
        "animal_movement", "to_cage_id"
    )
    if movement_fk_missing or movement_alter_needed:
        with op.batch_alter_table("animal_movement", schema=None) as batch_op:
            if column_exists("animal_movement", "from_cage_id"):
                batch_op.alter_column("from_cage_id", existing_type=sa.Integer(), nullable=True)
            if column_exists("animal_movement", "to_cage_id"):
                batch_op.alter_column("to_cage_id", existing_type=sa.Integer(), nullable=True)
            if table_exists("facility_room") and not fk_exists(
                "animal_movement", "fk_animal_movement_from_room_id"
            ):
                batch_op.create_foreign_key(
                    "fk_animal_movement_from_room_id",
                    "facility_room",
                    ["from_room_id"],
                    ["id"],
                )
            if table_exists("facility_room") and not fk_exists(
                "animal_movement", "fk_animal_movement_to_room_id"
            ):
                batch_op.create_foreign_key(
                    "fk_animal_movement_to_room_id",
                    "facility_room",
                    ["to_room_id"],
                    ["id"],
                )
            if not fk_exists("animal_movement", "fk_animal_movement_recorded_by_user_id"):
                batch_op.create_foreign_key(
                    "fk_animal_movement_recorded_by_user_id",
                    "users",
                    ["recorded_by_user_id"],
                    ["id"],
                )


def downgrade() -> None:
    movement_fk_present = (
        fk_exists("animal_movement", "fk_animal_movement_recorded_by_user_id")
        or fk_exists("animal_movement", "fk_animal_movement_to_room_id")
        or fk_exists("animal_movement", "fk_animal_movement_from_room_id")
    )
    if movement_fk_present:
        with op.batch_alter_table("animal_movement", schema=None) as batch_op:
            if fk_exists("animal_movement", "fk_animal_movement_recorded_by_user_id"):
                batch_op.drop_constraint(
                    "fk_animal_movement_recorded_by_user_id", type_="foreignkey"
                )
            if fk_exists("animal_movement", "fk_animal_movement_to_room_id"):
                batch_op.drop_constraint("fk_animal_movement_to_room_id", type_="foreignkey")
            if fk_exists("animal_movement", "fk_animal_movement_from_room_id"):
                batch_op.drop_constraint("fk_animal_movement_from_room_id", type_="foreignkey")
    for column_name in ("recorded_by_user_id", "reason", "to_room_id", "from_room_id"):
        if column_exists("animal_movement", column_name):
            op.drop_column("animal_movement", column_name)

    if index_exists("animal", "ix_animal_animal_number"):
        op.drop_index("ix_animal_animal_number", table_name="animal")

    animal_fk_present = fk_exists("animal", "fk_animal_breeding_record_id") or fk_exists(
        "animal", "fk_animal_procurement_id"
    )
    if animal_fk_present:
        with op.batch_alter_table("animal", schema=None) as batch_op:
            if fk_exists("animal", "fk_animal_breeding_record_id"):
                batch_op.drop_constraint("fk_animal_breeding_record_id", type_="foreignkey")
            if fk_exists("animal", "fk_animal_procurement_id"):
                batch_op.drop_constraint("fk_animal_procurement_id", type_="foreignkey")
    for column_name in (
        "notes",
        "rehabilitation_date",
        "quarantine_end_date",
        "quarantine_start_date",
        "breeding_record_id",
        "procurement_id",
        "source_type",
        "date_of_birth",
        "animal_number",
    ):
        if column_exists("animal", column_name):
            op.drop_column("animal", column_name)

    if fk_exists("procurement", "fk_procurement_recorded_by_user_id"):
        with op.batch_alter_table("procurement", schema=None) as batch_op:
            batch_op.drop_constraint("fk_procurement_recorded_by_user_id", type_="foreignkey")
    for column_name in ("recorded_by_user_id", "remarks", "received_by_name", "supplier_registration_number"):
        if column_exists("procurement", column_name):
            op.drop_column("procurement", column_name)
