from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session, joinedload

from crud.activity_log import record_activity
from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from database.lmcpafm_disposal import Disposal
from database.lmcpafm_models import (
    Animal,
    AnimalMovement,
    AnimalWeight,
    BreedingRecord,
    Cage,
    FacilityCareLog,
    FacilityRoom,
    Procurement,
    Species,
    Strain,
)
from models.user import User
from schemas.schemas_admin_facility import (
    AnimalAdminCreate,
    AnimalAdminUpdate,
    AnimalMoveRequest,
    AnimalOutcomeCreate,
    AnimalWeightCreate,
    BreedingRecordCreate,
    CageCreate,
    CageUpdate,
    FacilityCareLogCreate,
    FacilityRoomCreate,
    FacilityRoomUpdate,
    ProcurementCreate,
)

OUTCOME_STATUS_MAP = {
    "sacrifice": "sacrificed",
    "sacrificed": "sacrificed",
    "euthanasia": "euthanized",
    "euthanized": "euthanized",
    "natural_death": "dead",
    "death": "dead",
    "rehabilitation": "rehabilitated",
}


def _generate_animal_number(db: Session, species_id: int) -> str:
    species = db.query(Species).filter(Species.id == species_id).first()
    prefix = "".join(ch for ch in (species.name if species else "ANI")[:3].upper() if ch.isalnum()) or "ANI"
    year = date.today().year
    existing = (
        db.query(Animal)
        .filter(Animal.animal_number.like(f"{prefix}-{year}-%"))
        .count()
    )
    return f"{prefix}-{year}-{existing + 1:04d}"


def _animal_to_read(db: Session, animal: Animal) -> dict:
    latest_weight = (
        db.query(AnimalWeight)
        .filter(AnimalWeight.animal_id == animal.id)
        .order_by(AnimalWeight.date.desc(), AnimalWeight.id.desc())
        .first()
    )
    room_code = None
    if animal.cage and animal.cage.room:
        room_code = animal.cage.room.code
    return {
        "id": animal.id,
        "animal_number": animal.animal_number,
        "species_id": animal.species_id,
        "strain_id": animal.strain_id,
        "species_name": animal.species.name if animal.species else None,
        "strain_name": animal.strain.name if animal.strain else None,
        "cage_id": animal.cage_id,
        "cage_label": animal.cage.label if animal.cage else None,
        "room_code": room_code,
        "sex": animal.sex,
        "date_of_birth": animal.date_of_birth,
        "source_type": animal.source_type,
        "procurement_id": animal.procurement_id,
        "breeding_record_id": animal.breeding_record_id,
        "quarantine_start_date": animal.quarantine_start_date,
        "quarantine_end_date": animal.quarantine_end_date,
        "rehabilitation_date": animal.rehabilitation_date,
        "notes": animal.notes,
        "status": animal.status,
        "protocol_id": animal.protocol_id,
        "experiment_group_id": animal.experiment_group_id,
        "experiment_group_name": animal.experiment_group.name if animal.experiment_group else None,
        "latest_weight_g": latest_weight.weight_g if latest_weight else None,
    }


def get_facility_summary(db: Session) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    animals = db.query(Animal).all()
    return {
        "total_animals": len(animals),
        "available_animals": sum(1 for a in animals if a.status == "available"),
        "quarantine_animals": sum(1 for a in animals if a.status == "quarantine"),
        "allocated_animals": sum(1 for a in animals if a.status in {"allocated", "in_experiment"}),
        "deceased_animals": sum(1 for a in animals if a.status in {"sacrificed", "euthanized", "dead"}),
        "rehabilitated_animals": sum(1 for a in animals if a.status == "rehabilitated"),
        "total_rooms": db.query(FacilityRoom).count(),
        "total_cages": db.query(Cage).count(),
        "procurements_this_month": db.query(Procurement).filter(Procurement.date >= month_start).count(),
        "breeding_records_this_month": db.query(BreedingRecord).filter(BreedingRecord.date >= month_start).count(),
    }


def list_rooms(db: Session) -> list[FacilityRoom]:
    return db.query(FacilityRoom).order_by(FacilityRoom.code.asc()).all()


def create_room(db: Session, payload: FacilityRoomCreate) -> FacilityRoom:
    if db.query(FacilityRoom).filter(FacilityRoom.code == payload.code).first():
        raise CRUDValidationError(f"Room code '{payload.code}' already exists.")
    room = FacilityRoom(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def update_room(db: Session, room_id: int, payload: FacilityRoomUpdate) -> FacilityRoom:
    room = db.query(FacilityRoom).filter(FacilityRoom.id == room_id).first()
    if room is None:
        raise CRUDNotFoundError("Room not found.")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] != room.code:
        if db.query(FacilityRoom).filter(FacilityRoom.code == data["code"]).first():
            raise CRUDValidationError(f"Room code '{data['code']}' already exists.")
    for key, value in data.items():
        setattr(room, key, value)
    db.commit()
    db.refresh(room)
    return room


def list_cages(db: Session) -> list[dict]:
    rows = (
        db.query(Cage)
        .options(joinedload(Cage.room))
        .order_by(Cage.label.asc())
        .all()
    )
    result = []
    for cage in rows:
        animal_count = db.query(Animal).filter(Animal.cage_id == cage.id).count()
        result.append(
            {
                "id": cage.id,
                "label": cage.label,
                "location": cage.location,
                "room_id": cage.room_id,
                "capacity": cage.capacity,
                "status": cage.status,
                "room_code": cage.room.code if cage.room else None,
                "room_name": cage.room.name if cage.room else None,
                "animal_count": animal_count,
            }
        )
    return result


def create_cage(db: Session, payload: CageCreate) -> Cage:
    if db.query(Cage).filter(Cage.label == payload.label).first():
        raise CRUDValidationError(f"Cage label '{payload.label}' already exists.")
    if payload.room_id is not None and not db.query(FacilityRoom).filter(FacilityRoom.id == payload.room_id).first():
        raise CRUDNotFoundError("Room not found.")
    cage = Cage(**payload.model_dump())
    db.add(cage)
    db.commit()
    db.refresh(cage)
    return cage


def update_cage(db: Session, cage_id: int, payload: CageUpdate) -> Cage:
    cage = db.query(Cage).filter(Cage.id == cage_id).first()
    if cage is None:
        raise CRUDNotFoundError("Cage not found.")
    data = payload.model_dump(exclude_unset=True)
    if "label" in data and data["label"] != cage.label:
        if db.query(Cage).filter(Cage.label == data["label"]).first():
            raise CRUDValidationError(f"Cage label '{data['label']}' already exists.")
    if data.get("room_id") is not None and not db.query(FacilityRoom).filter(FacilityRoom.id == data["room_id"]).first():
        raise CRUDNotFoundError("Room not found.")
    for key, value in data.items():
        setattr(cage, key, value)
    db.commit()
    db.refresh(cage)
    return cage


def list_animals(
    db: Session,
    *,
    status: str | None = None,
    species_id: int | None = None,
    room_id: int | None = None,
) -> list[dict]:
    query = (
        db.query(Animal)
        .options(
            joinedload(Animal.species),
            joinedload(Animal.strain),
            joinedload(Animal.cage).joinedload(Cage.room),
            joinedload(Animal.experiment_group),
        )
        .order_by(Animal.animal_number.asc(), Animal.id.asc())
    )
    if status:
        query = query.filter(Animal.status == status)
    if species_id:
        query = query.filter(Animal.species_id == species_id)
    if room_id:
        query = query.join(Cage, Animal.cage_id == Cage.id).filter(Cage.room_id == room_id)
    return [_animal_to_read(db, animal) for animal in query.all()]


def get_animal(db: Session, animal_id: int) -> dict:
    animal = (
        db.query(Animal)
        .options(
            joinedload(Animal.species),
            joinedload(Animal.strain),
            joinedload(Animal.cage).joinedload(Cage.room),
            joinedload(Animal.experiment_group),
        )
        .filter(Animal.id == animal_id)
        .first()
    )
    if animal is None:
        raise CRUDNotFoundError("Animal not found.")
    return _animal_to_read(db, animal)


def create_animal(db: Session, payload: AnimalAdminCreate) -> dict:
    if not db.query(Species).filter(Species.id == payload.species_id).first():
        raise CRUDNotFoundError("Species not found.")
    if not db.query(Strain).filter(Strain.id == payload.strain_id).first():
        raise CRUDNotFoundError("Strain not found.")
    if payload.cage_id is not None and not db.query(Cage).filter(Cage.id == payload.cage_id).first():
        raise CRUDNotFoundError("Cage not found.")

    animal_number = payload.animal_number or _generate_animal_number(db, payload.species_id)
    if db.query(Animal).filter(Animal.animal_number == animal_number).first():
        raise CRUDValidationError(f"Animal number '{animal_number}' already exists.")

    status = "quarantine" if payload.start_quarantine else payload.status
    quarantine_start = payload.quarantine_start_date or (date.today() if payload.start_quarantine else None)

    animal = Animal(
        animal_number=animal_number,
        species_id=payload.species_id,
        strain_id=payload.strain_id,
        sex=payload.sex,
        date_of_birth=payload.date_of_birth,
        cage_id=payload.cage_id,
        status=status,
        source_type=payload.source_type or "manual",
        notes=payload.notes,
        quarantine_start_date=quarantine_start,
    )
    db.add(animal)
    db.commit()
    db.refresh(animal)
    return get_animal(db, animal.id)


def update_animal(db: Session, animal_id: int, payload: AnimalAdminUpdate) -> dict:
    animal = db.query(Animal).filter(Animal.id == animal_id).first()
    if animal is None:
        raise CRUDNotFoundError("Animal not found.")
    data = payload.model_dump(exclude_unset=True)
    if "animal_number" in data and data["animal_number"]:
        existing = (
            db.query(Animal)
            .filter(Animal.animal_number == data["animal_number"], Animal.id != animal_id)
            .first()
        )
        if existing:
            raise CRUDValidationError(f"Animal number '{data['animal_number']}' already exists.")
    if data.get("cage_id") is not None and not db.query(Cage).filter(Cage.id == data["cage_id"]).first():
        raise CRUDNotFoundError("Cage not found.")
    for key, value in data.items():
        setattr(animal, key, value)
    db.commit()
    return get_animal(db, animal_id)


def move_animal(db: Session, user: User, animal_id: int, payload: AnimalMoveRequest) -> dict:
    animal = (
        db.query(Animal)
        .options(joinedload(Animal.cage).joinedload(Cage.room))
        .filter(Animal.id == animal_id)
        .first()
    )
    if animal is None:
        raise CRUDNotFoundError("Animal not found.")
    if payload.to_cage_id is None and payload.to_room_id is None:
        raise CRUDValidationError("Provide a destination cage or room.")

    from_cage_id = animal.cage_id
    from_room_id = animal.cage.room_id if animal.cage else None
    to_cage = None
    to_room_id = payload.to_room_id

    if payload.to_cage_id is not None:
        to_cage = db.query(Cage).options(joinedload(Cage.room)).filter(Cage.id == payload.to_cage_id).first()
        if to_cage is None:
            raise CRUDNotFoundError("Destination cage not found.")
        to_room_id = to_cage.room_id
        current_count = db.query(Animal).filter(Animal.cage_id == to_cage.id, Animal.id != animal.id).count()
        if current_count >= to_cage.capacity:
            raise CRUDValidationError(f"Cage '{to_cage.label}' is at capacity ({to_cage.capacity}).")
        animal.cage_id = to_cage.id

    movement = AnimalMovement(
        animal_id=animal.id,
        from_cage_id=from_cage_id,
        to_cage_id=animal.cage_id,
        from_room_id=from_room_id,
        to_room_id=to_room_id,
        date=datetime.combine(payload.move_date or date.today(), datetime.min.time(), tzinfo=timezone.utc),
        reason=payload.reason,
        recorded_by_user_id=user.id,
    )
    db.add(movement)
    db.commit()
    return get_animal(db, animal_id)


def add_animal_weight(db: Session, animal_id: int, payload: AnimalWeightCreate) -> AnimalWeight:
    animal = db.query(Animal).filter(Animal.id == animal_id).first()
    if animal is None:
        raise CRUDNotFoundError("Animal not found.")
    row = AnimalWeight(animal_id=animal_id, date=payload.date, weight_g=payload.weight_g)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_animal_weights(db: Session, animal_id: int) -> list[AnimalWeight]:
    if not db.query(Animal).filter(Animal.id == animal_id).first():
        raise CRUDNotFoundError("Animal not found.")
    return (
        db.query(AnimalWeight)
        .filter(AnimalWeight.animal_id == animal_id)
        .order_by(AnimalWeight.date.desc(), AnimalWeight.id.desc())
        .all()
    )


def _create_animals_for_intake(
    db: Session,
    *,
    species_id: int,
    strain_id: int,
    count: int,
    source_type: str,
    procurement_id: int | None = None,
    breeding_record_id: int | None = None,
    start_quarantine: bool,
    quarantine_start_date: date | None = None,
) -> int:
    created = 0
    start = quarantine_start_date or date.today()
    for _ in range(count):
        animal = Animal(
            animal_number=_generate_animal_number(db, species_id),
            species_id=species_id,
            strain_id=strain_id,
            status="quarantine" if start_quarantine else "available",
            source_type=source_type,
            procurement_id=procurement_id,
            breeding_record_id=breeding_record_id,
            quarantine_start_date=start if start_quarantine else None,
        )
        db.add(animal)
        db.flush()
        created += 1
    return created


def create_procurement(db: Session, user: User, payload: ProcurementCreate) -> dict:
    if not db.query(Species).filter(Species.id == payload.species_id).first():
        raise CRUDNotFoundError("Species not found.")
    if not db.query(Strain).filter(Strain.id == payload.strain_id).first():
        raise CRUDNotFoundError("Strain not found.")

    procurement = Procurement(
        **payload.model_dump(
            exclude={"create_animals", "start_quarantine", "quarantine_start_date"}
        ),
        recorded_by_user_id=user.id,
    )
    db.add(procurement)
    db.flush()

    animals_created = 0
    if payload.create_animals:
        animals_created = _create_animals_for_intake(
            db,
            species_id=payload.species_id,
            strain_id=payload.strain_id,
            count=payload.count,
            source_type="procurement",
            procurement_id=procurement.id,
            start_quarantine=payload.start_quarantine,
            quarantine_start_date=payload.quarantine_start_date,
        )

    db.commit()
    db.refresh(procurement)
    return _procurement_to_read(procurement, animals_created)


def _procurement_to_read(procurement: Procurement, animals_created: int = 0) -> dict:
    return {
        "id": procurement.id,
        "species_id": procurement.species_id,
        "strain_id": procurement.strain_id,
        "species_name": procurement.species.name if procurement.species else None,
        "strain_name": procurement.strain.name if procurement.strain else None,
        "count": procurement.count,
        "date": procurement.date,
        "supplier_name": procurement.supplier_name,
        "supplier_address": procurement.supplier_address,
        "supplier_registration_number": procurement.supplier_registration_number,
        "acquired_from": procurement.acquired_from,
        "voucher_or_bill_number": procurement.voucher_or_bill_number,
        "received_by_name": procurement.received_by_name,
        "remarks": procurement.remarks,
        "animals_created": animals_created,
    }


def list_procurements(db: Session) -> list[dict]:
    rows = (
        db.query(Procurement)
        .options(joinedload(Procurement.species), joinedload(Procurement.strain))
        .order_by(Procurement.date.desc(), Procurement.id.desc())
        .all()
    )
    return [_procurement_to_read(row) for row in rows]


def create_breeding_record(db: Session, user: User, payload: BreedingRecordCreate) -> dict:
    if not db.query(Species).filter(Species.id == payload.species_id).first():
        raise CRUDNotFoundError("Species not found.")
    if not db.query(Strain).filter(Strain.id == payload.strain_id).first():
        raise CRUDNotFoundError("Strain not found.")

    record = BreedingRecord(
        **payload.model_dump(exclude={"create_offspring", "start_quarantine"}),
        recorded_by_user_id=user.id,
    )
    db.add(record)
    db.flush()

    animals_created = 0
    if payload.create_offspring:
        animals_created = _create_animals_for_intake(
            db,
            species_id=payload.species_id,
            strain_id=payload.strain_id,
            count=payload.offspring_count,
            source_type="breeding",
            breeding_record_id=record.id,
            start_quarantine=payload.start_quarantine,
            quarantine_start_date=payload.date,
        )

    db.commit()
    db.refresh(record)
    return _breeding_to_read(record, animals_created)


def _breeding_to_read(record: BreedingRecord, animals_created: int = 0) -> dict:
    return {
        "id": record.id,
        "date": record.date,
        "species_id": record.species_id,
        "strain_id": record.strain_id,
        "species_name": record.species.name if record.species else None,
        "strain_name": record.strain.name if record.strain else None,
        "sire_animal_id": record.sire_animal_id,
        "dam_animal_id": record.dam_animal_id,
        "litter_count": record.litter_count,
        "offspring_count": record.offspring_count,
        "offspring_male_count": record.offspring_male_count,
        "offspring_female_count": record.offspring_female_count,
        "cage_id": record.cage_id,
        "room_id": record.room_id,
        "remarks": record.remarks,
        "created_at": record.created_at,
        "animals_created": animals_created,
    }


def list_breeding_records(db: Session) -> list[dict]:
    rows = (
        db.query(BreedingRecord)
        .options(joinedload(BreedingRecord.species), joinedload(BreedingRecord.strain))
        .order_by(BreedingRecord.date.desc(), BreedingRecord.id.desc())
        .all()
    )
    return [_breeding_to_read(row) for row in rows]


def record_animal_outcome(db: Session, user: User, payload: AnimalOutcomeCreate) -> dict:
    animal = db.query(Animal).filter(Animal.id == payload.animal_id).first()
    if animal is None:
        raise CRUDNotFoundError("Animal not found.")

    outcome_key = payload.outcome_type.strip().lower()
    new_status = OUTCOME_STATUS_MAP.get(outcome_key)
    if new_status is None:
        raise CRUDValidationError(
            "Outcome type must be one of: sacrifice, euthanasia, natural_death, rehabilitation."
        )

    if new_status == "rehabilitated":
        animal.status = "rehabilitated"
        animal.rehabilitation_date = payload.date
        animal.protocol_id = None
        disposal = None
    else:
        if animal.status in {"sacrificed", "euthanized", "dead", "rehabilitated"}:
            raise CRUDValidationError(f"Animal is already marked as {animal.status}.")
        disposal = Disposal(
            animal_id=animal.id,
            experiment_id=payload.experiment_id,
            date=payload.date,
            method=payload.method or payload.outcome_type,
            reason=payload.reason,
            remarks=payload.remarks or "",
        )
        db.add(disposal)
        animal.status = new_status

    db.commit()
    record_activity(
        db,
        user=user,
        action="facility.animal.outcome",
        details=f"{payload.outcome_type} recorded for animal {animal.animal_number or animal.id}",
    )
    return {
        "id": disposal.id if disposal else 0,
        "animal_id": animal.id,
        "date": payload.date,
        "outcome_type": payload.outcome_type,
        "method": payload.method,
        "reason": payload.reason,
        "remarks": payload.remarks,
        "animal_status": animal.status,
    }


def create_care_log(db: Session, user: User, payload: FacilityCareLogCreate) -> dict:
    if payload.log_type not in {"feeding", "watering", "cleaning"}:
        raise CRUDValidationError("Care log type must be feeding, watering, or cleaning.")
    if payload.room_id is None and payload.cage_id is None:
        raise CRUDValidationError("Provide a room or cage for the care log.")
    if payload.room_id is not None and not db.query(FacilityRoom).filter(FacilityRoom.id == payload.room_id).first():
        raise CRUDNotFoundError("Room not found.")
    if payload.cage_id is not None and not db.query(Cage).filter(Cage.id == payload.cage_id).first():
        raise CRUDNotFoundError("Cage not found.")

    row = FacilityCareLog(
        **payload.model_dump(),
        recorded_by_user_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _care_log_to_read(row)


def list_care_logs(db: Session, log_type: str | None = None) -> list[dict]:
    query = (
        db.query(FacilityCareLog)
        .options(joinedload(FacilityCareLog.room), joinedload(FacilityCareLog.cage))
        .order_by(FacilityCareLog.date.desc(), FacilityCareLog.id.desc())
    )
    if log_type:
        query = query.filter(FacilityCareLog.log_type == log_type)
    return [_care_log_to_read(row) for row in query.all()]


def _care_log_to_read(row: FacilityCareLog) -> dict:
    return {
        "id": row.id,
        "log_type": row.log_type,
        "room_id": row.room_id,
        "cage_id": row.cage_id,
        "room_code": row.room.code if row.room else None,
        "cage_label": row.cage.label if row.cage else None,
        "date": row.date,
        "details": row.details,
        "performed_by_name": row.performed_by_name,
        "created_at": row.created_at,
    }


def release_from_quarantine(db: Session, animal_id: int, release_date: date | None = None) -> dict:
    animal = db.query(Animal).filter(Animal.id == animal_id).first()
    if animal is None:
        raise CRUDNotFoundError("Animal not found.")
    if animal.status != "quarantine":
        raise CRUDValidationError("Animal is not in quarantine.")
    animal.status = "available"
    animal.quarantine_end_date = release_date or date.today()
    db.commit()
    return get_animal(db, animal_id)


def get_cage_map(db: Session) -> list[dict]:
    rooms = (
        db.query(FacilityRoom)
        .order_by(FacilityRoom.code.asc())
        .all()
    )
    unassigned_cages = (
        db.query(Cage)
        .filter(Cage.room_id.is_(None))
        .order_by(Cage.label.asc())
        .all()
    )

    def cage_payload(cage: Cage) -> dict:
        animals = (
            db.query(Animal)
            .options(joinedload(Animal.species), joinedload(Animal.strain))
            .filter(Animal.cage_id == cage.id)
            .order_by(Animal.animal_number.asc(), Animal.id.asc())
            .all()
        )
        return {
            "id": cage.id,
            "label": cage.label,
            "location": cage.location,
            "capacity": cage.capacity,
            "status": cage.status,
            "animal_count": len(animals),
            "animals": [
                {
                    "id": animal.id,
                    "animal_number": animal.animal_number,
                    "status": animal.status,
                    "species_name": animal.species.name if animal.species else None,
                    "strain_name": animal.strain.name if animal.strain else None,
                }
                for animal in animals
            ],
        }

    result = []
    for room in rooms:
        cages = (
            db.query(Cage)
            .filter(Cage.room_id == room.id)
            .order_by(Cage.label.asc())
            .all()
        )
        result.append(
            {
                "id": room.id,
                "code": room.code,
                "name": room.name,
                "building": room.building,
                "cages": [cage_payload(cage) for cage in cages],
            }
        )

    if unassigned_cages:
        result.append(
            {
                "id": 0,
                "code": "UNASSIGNED",
                "name": "Unassigned cages",
                "building": None,
                "cages": [cage_payload(cage) for cage in unassigned_cages],
            }
        )
    return result


def get_animal_timeline(db: Session, animal_id: int) -> list[dict]:
    animal = (
        db.query(Animal)
        .options(joinedload(Animal.species), joinedload(Animal.strain))
        .filter(Animal.id == animal_id)
        .first()
    )
    if animal is None:
        raise CRUDNotFoundError("Animal not found.")

    events: list[dict] = []

    if animal.source_type:
        events.append(
            {
                "event_type": "intake",
                "date": (animal.quarantine_start_date or date.today()).isoformat(),
                "title": f"Intake ({animal.source_type})",
                "details": f"Animal {animal.animal_number or animal.id} entered inventory.",
            }
        )
    if animal.quarantine_start_date:
        events.append(
            {
                "event_type": "quarantine",
                "date": animal.quarantine_start_date.isoformat(),
                "title": "Quarantine started",
                "details": None,
            }
        )
    if animal.quarantine_end_date:
        events.append(
            {
                "event_type": "quarantine",
                "date": animal.quarantine_end_date.isoformat(),
                "title": "Quarantine released",
                "details": None,
            }
        )
    if animal.rehabilitation_date:
        events.append(
            {
                "event_type": "rehabilitation",
                "date": animal.rehabilitation_date.isoformat(),
                "title": "Rehabilitation release",
                "details": None,
            }
        )

    for weight in list_animal_weights(db, animal_id):
        events.append(
            {
                "event_type": "weight",
                "date": weight.date.isoformat(),
                "title": f"Weight recorded: {weight.weight_g} g",
                "details": None,
            }
        )

    movements = (
        db.query(AnimalMovement)
        .filter(AnimalMovement.animal_id == animal_id)
        .order_by(AnimalMovement.date.asc(), AnimalMovement.id.asc())
        .all()
    )
    for movement in movements:
        events.append(
            {
                "event_type": "movement",
                "date": movement.date.date().isoformat() if movement.date else date.today().isoformat(),
                "title": "Cage / room move",
                "details": movement.reason,
            }
        )

    disposal = db.query(Disposal).filter(Disposal.animal_id == animal_id).order_by(Disposal.date.desc()).first()
    if disposal:
        events.append(
            {
                "event_type": "outcome",
                "date": disposal.date.isoformat(),
                "title": f"Outcome: {disposal.method}",
                "details": disposal.reason,
            }
        )

    events.sort(key=lambda item: item["date"])
    return events


def get_animal_label_data(db: Session, animal_id: int) -> dict:
    animal = (
        db.query(Animal)
        .options(joinedload(Animal.species), joinedload(Animal.strain))
        .filter(Animal.id == animal_id)
        .first()
    )
    if animal is None:
        raise CRUDNotFoundError("Animal not found.")
    label_number = animal.animal_number or f"ID-{animal.id}"
    return {
        "animal_id": animal.id,
        "animal_number": label_number,
        "species_name": animal.species.name if animal.species else None,
        "strain_name": animal.strain.name if animal.strain else None,
        "barcode_value": label_number,
    }


# Rodent ear-tag label size (landscape PDF, millimeters).
EAR_TAG_WIDTH_MM = 32
EAR_TAG_HEIGHT_MM = 12


def render_animal_label_pdf(db: Session, animal_id: int) -> bytes:
    from io import BytesIO

    from fpdf import FPDF

    from crud.formb_documents import _safe_text

    label = get_animal_label_data(db, animal_id)
    pdf = FPDF(
        orientation="L",
        unit="mm",
        format=(EAR_TAG_WIDTH_MM, EAR_TAG_HEIGHT_MM),
    )
    pdf.set_margin(1)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 7)
    pdf.cell(0, 4, _safe_text(label["animal_number"]), ln=True, align="C")

    try:
        from barcode import Code128
        from barcode.writer import ImageWriter

        buffer = BytesIO()
        Code128(label["barcode_value"], writer=ImageWriter()).write(buffer, options={"write_text": False})
        buffer.seek(0)
        pdf.image(buffer, x=2, y=5, w=28, h=6)
    except Exception:
        pdf.set_font("Courier", "", 6)
        pdf.cell(0, 5, _safe_text(label["barcode_value"]), ln=True, align="C")

    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, str):
        return output.encode("latin-1")
    return output
