from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from crud.exceptions import CRUDNotFoundError
from database.lmcpafm_models import (
    Animal,
    Cage,
    ExperimentGroup,
    FacilityCareLog,
    FacilityRoom,
    IAECProject,
    Strain,
)

DECEASED_STATUSES = frozenset({"sacrificed", "euthanized", "dead"})
ALLOCATED_STATUSES = frozenset({"allocated", "in_experiment"})


def get_pi_dashboard(db: Session, *, protocol_id: int | None = None) -> dict:
    query = db.query(IAECProject).order_by(IAECProject.protocol_number.asc(), IAECProject.id.asc())
    if protocol_id is not None:
        query = query.filter(IAECProject.id == protocol_id)
        if query.count() == 0:
            raise CRUDNotFoundError("Protocol not found.")

    protocols: list[dict] = []
    for project in query.all():
        animals = (
            db.query(Animal)
            .options(joinedload(Animal.experiment_group))
            .filter(Animal.protocol_id == project.id)
            .all()
        )
        live_animals = [a for a in animals if a.status not in DECEASED_STATUSES]

        group_map: dict[int, dict] = {}
        for animal in live_animals:
            if animal.experiment_group_id is None:
                continue
            bucket = group_map.setdefault(
                animal.experiment_group_id,
                {
                    "group_id": animal.experiment_group_id,
                    "group_name": animal.experiment_group.name if animal.experiment_group else "Unknown",
                    "animal_count": 0,
                    "caged_count": 0,
                },
            )
            bucket["animal_count"] += 1
            if animal.cage_id is not None:
                bucket["caged_count"] += 1

        protocols.append(
            {
                "protocol_id": project.id,
                "protocol_number": project.protocol_number,
                "title": project.title,
                "principal_investigator": project.principal_investigator or project.investigator_name,
                "status": project.status,
                "total_animals": len(live_animals),
                "allocated_count": sum(1 for a in live_animals if a.status in ALLOCATED_STATUSES),
                "in_experiment_count": sum(1 for a in live_animals if a.status == "in_experiment"),
                "caged_count": sum(1 for a in live_animals if a.cage_id is not None),
                "uncaged_count": sum(1 for a in live_animals if a.cage_id is None),
                "groups": sorted(group_map.values(), key=lambda row: row["group_name"].lower()),
            }
        )

    return {"protocols": protocols}


def get_room_dashboard(db: Session, *, stale_days: int = 7) -> dict:
    today = date.today()
    cutoff = today - timedelta(days=stale_days)
    rooms = db.query(FacilityRoom).order_by(FacilityRoom.code.asc()).all()

    last_care_by_room: dict[int | None, date] = {}
    care_rows = (
        db.query(FacilityCareLog.room_id, func.max(FacilityCareLog.date).label("last_date"))
        .group_by(FacilityCareLog.room_id)
        .all()
    )
    for room_id, last_date in care_rows:
        if room_id is not None and last_date is not None:
            last_care_by_room[room_id] = last_date

    result_rooms: list[dict] = []
    for room in rooms:
        cages = db.query(Cage).filter(Cage.room_id == room.id).all()
        cage_ids = [cage.id for cage in cages]
        animals: list[Animal] = []
        if cage_ids:
            animals = db.query(Animal).filter(Animal.cage_id.in_(cage_ids)).all()
        live_animals = [a for a in animals if a.status not in DECEASED_STATUSES]

        occupied_cages = sum(
            1
            for cage in cages
            if db.query(Animal).filter(Animal.cage_id == cage.id, ~Animal.status.in_(DECEASED_STATUSES)).count() > 0
        )
        last_care = last_care_by_room.get(room.id)

        result_rooms.append(
            {
                "room_id": room.id,
                "room_code": room.code,
                "room_name": room.name,
                "building": room.building,
                "cage_count": len(cages),
                "occupied_cages": occupied_cages,
                "total_capacity": sum(cage.capacity for cage in cages),
                "animal_count": len(live_animals),
                "quarantine_count": sum(1 for a in live_animals if a.status == "quarantine"),
                "available_count": sum(1 for a in live_animals if a.status == "available"),
                "allocated_count": sum(1 for a in live_animals if a.status in ALLOCATED_STATUSES),
                "rehabilitated_count": sum(1 for a in live_animals if a.status == "rehabilitated"),
                "last_care_date": last_care,
                "care_stale": last_care is None or last_care < cutoff,
            }
        )

    return {"stale_days": stale_days, "rooms": result_rooms}


def get_strain_dashboard(db: Session) -> dict:
    strains = (
        db.query(Strain)
        .options(joinedload(Strain.species))
        .order_by(Strain.name.asc())
        .all()
    )

    rows: list[dict] = []
    for strain in strains:
        animals = db.query(Animal).filter(Animal.strain_id == strain.id).all()
        live_animals = [a for a in animals if a.status not in DECEASED_STATUSES]

        rows.append(
            {
                "strain_id": strain.id,
                "strain_name": strain.name,
                "species_id": strain.species_id,
                "species_name": strain.species.name if strain.species else None,
                "total_animals": len(live_animals),
                "available_count": sum(1 for a in live_animals if a.status == "available"),
                "quarantine_count": sum(1 for a in live_animals if a.status == "quarantine"),
                "allocated_count": sum(1 for a in live_animals if a.status in ALLOCATED_STATUSES),
                "in_experiment_count": sum(1 for a in live_animals if a.status == "in_experiment"),
                "rehabilitated_count": sum(1 for a in live_animals if a.status == "rehabilitated"),
                "deceased_count": sum(1 for a in animals if a.status in DECEASED_STATUSES),
            }
        )

    return {"strains": rows}
