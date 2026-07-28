"""add admin facility management tables and columns

Revision ID: r8s9t0u1v2w3
Revises: q7r8s9t0u1v2
Create Date: 2026-07-27 19:10:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "r8s9t0u1v2w3"
down_revision = "q7r8s9t0u1v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "facility_room",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("building", sa.String(length=200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.add_column("cage", sa.Column("room_id", sa.Integer(), nullable=True))
    op.add_column("cage", sa.Column("capacity", sa.Integer(), server_default="1", nullable=False))
    op.add_column("cage", sa.Column("status", sa.String(length=50), server_default="active", nullable=False))
    op.create_foreign_key("fk_cage_room_id", "cage", "facility_room", ["room_id"], ["id"])

    op.add_column("procurement", sa.Column("supplier_name", sa.String(length=500), nullable=True))
    op.add_column("procurement", sa.Column("supplier_address", sa.Text(), nullable=True))
    op.add_column("procurement", sa.Column("supplier_registration_number", sa.String(length=200), nullable=True))
    op.add_column("procurement", sa.Column("acquired_from", sa.String(length=500), nullable=True))
    op.add_column("procurement", sa.Column("voucher_or_bill_number", sa.String(length=200), nullable=True))
    op.add_column("procurement", sa.Column("received_by_name", sa.String(length=200), nullable=True))
    op.add_column("procurement", sa.Column("remarks", sa.Text(), nullable=True))
    op.add_column("procurement", sa.Column("recorded_by_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_procurement_recorded_by_user_id",
        "procurement",
        "users",
        ["recorded_by_user_id"],
        ["id"],
    )

    op.create_table(
        "breeding_record",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("species_id", sa.Integer(), nullable=False),
        sa.Column("strain_id", sa.Integer(), nullable=False),
        sa.Column("sire_animal_id", sa.Integer(), nullable=True),
        sa.Column("dam_animal_id", sa.Integer(), nullable=True),
        sa.Column("litter_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column("offspring_count", sa.Integer(), nullable=False),
        sa.Column("offspring_male_count", sa.Integer(), nullable=True),
        sa.Column("offspring_female_count", sa.Integer(), nullable=True),
        sa.Column("cage_id", sa.Integer(), nullable=True),
        sa.Column("room_id", sa.Integer(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("recorded_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["cage_id"], ["cage.id"]),
        sa.ForeignKeyConstraint(["dam_animal_id"], ["animal.id"]),
        sa.ForeignKeyConstraint(["recorded_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["facility_room.id"]),
        sa.ForeignKeyConstraint(["sire_animal_id"], ["animal.id"]),
        sa.ForeignKeyConstraint(["species_id"], ["species.id"]),
        sa.ForeignKeyConstraint(["strain_id"], ["strain.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column("animal", sa.Column("animal_number", sa.String(length=100), nullable=True))
    op.add_column("animal", sa.Column("sex", sa.String(length=20), nullable=True))
    op.add_column("animal", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("animal", sa.Column("source_type", sa.String(length=50), nullable=True))
    op.add_column("animal", sa.Column("procurement_id", sa.Integer(), nullable=True))
    op.add_column("animal", sa.Column("breeding_record_id", sa.Integer(), nullable=True))
    op.add_column("animal", sa.Column("quarantine_start_date", sa.Date(), nullable=True))
    op.add_column("animal", sa.Column("quarantine_end_date", sa.Date(), nullable=True))
    op.add_column("animal", sa.Column("rehabilitation_date", sa.Date(), nullable=True))
    op.add_column("animal", sa.Column("notes", sa.Text(), nullable=True))
    op.create_foreign_key("fk_animal_procurement_id", "animal", "procurement", ["procurement_id"], ["id"])
    op.create_foreign_key(
        "fk_animal_breeding_record_id",
        "animal",
        "breeding_record",
        ["breeding_record_id"],
        ["id"],
    )
    op.create_index("ix_animal_animal_number", "animal", ["animal_number"], unique=True)

    op.add_column("animal_movement", sa.Column("from_room_id", sa.Integer(), nullable=True))
    op.add_column("animal_movement", sa.Column("to_room_id", sa.Integer(), nullable=True))
    op.add_column("animal_movement", sa.Column("reason", sa.String(length=500), nullable=True))
    op.add_column("animal_movement", sa.Column("recorded_by_user_id", sa.Integer(), nullable=True))
    op.alter_column("animal_movement", "from_cage_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("animal_movement", "to_cage_id", existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key(
        "fk_animal_movement_from_room_id",
        "animal_movement",
        "facility_room",
        ["from_room_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_animal_movement_to_room_id",
        "animal_movement",
        "facility_room",
        ["to_room_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_animal_movement_recorded_by_user_id",
        "animal_movement",
        "users",
        ["recorded_by_user_id"],
        ["id"],
    )

    op.create_table(
        "facility_care_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("log_type", sa.String(length=50), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=True),
        sa.Column("cage_id", sa.Integer(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("performed_by_name", sa.String(length=200), nullable=False),
        sa.Column("recorded_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["cage_id"], ["cage.id"]),
        sa.ForeignKeyConstraint(["recorded_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["facility_room.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("facility_care_log")

    op.drop_constraint("fk_animal_movement_recorded_by_user_id", "animal_movement", type_="foreignkey")
    op.drop_constraint("fk_animal_movement_to_room_id", "animal_movement", type_="foreignkey")
    op.drop_constraint("fk_animal_movement_from_room_id", "animal_movement", type_="foreignkey")
    op.alter_column("animal_movement", "to_cage_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("animal_movement", "from_cage_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("animal_movement", "recorded_by_user_id")
    op.drop_column("animal_movement", "reason")
    op.drop_column("animal_movement", "to_room_id")
    op.drop_column("animal_movement", "from_room_id")

    op.drop_index("ix_animal_animal_number", table_name="animal")
    op.drop_constraint("fk_animal_breeding_record_id", "animal", type_="foreignkey")
    op.drop_constraint("fk_animal_procurement_id", "animal", type_="foreignkey")
    op.drop_column("animal", "notes")
    op.drop_column("animal", "rehabilitation_date")
    op.drop_column("animal", "quarantine_end_date")
    op.drop_column("animal", "quarantine_start_date")
    op.drop_column("animal", "breeding_record_id")
    op.drop_column("animal", "procurement_id")
    op.drop_column("animal", "source_type")
    op.drop_column("animal", "date_of_birth")
    op.drop_column("animal", "sex")
    op.drop_column("animal", "animal_number")

    op.drop_table("breeding_record")

    op.drop_constraint("fk_procurement_recorded_by_user_id", "procurement", type_="foreignkey")
    op.drop_column("procurement", "recorded_by_user_id")
    op.drop_column("procurement", "remarks")
    op.drop_column("procurement", "received_by_name")
    op.drop_column("procurement", "voucher_or_bill_number")
    op.drop_column("procurement", "acquired_from")
    op.drop_column("procurement", "supplier_registration_number")
    op.drop_column("procurement", "supplier_address")
    op.drop_column("procurement", "supplier_name")

    op.drop_constraint("fk_cage_room_id", "cage", type_="foreignkey")
    op.drop_column("cage", "status")
    op.drop_column("cage", "capacity")
    op.drop_column("cage", "room_id")

    op.drop_table("facility_room")
