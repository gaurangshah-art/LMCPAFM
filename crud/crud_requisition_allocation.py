from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload
from database.lmcpafm_requisition_allocation import (
    AnimalRequisition,
    AnimalRequisitionItem,
    AnimalAllocation,
    AnimalAllocationItem,
)
from schemas.schemas_requisition_allocation import (
    AnimalRequisitionCreate,
    AnimalAllocationCreate,
)
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError


# =========================================================
# AVAILABILITY + ALLOCATION HELPERS
# =========================================================

def get_available_animals(db: Session, species_id: int, strain_id: int):
    from database.lmcpafm_models import Animal

    available = (
        db.query(Animal)
        .filter(
            Animal.species_id == species_id,
            Animal.strain_id == strain_id,
            Animal.status == "available",
        )
        .count()
    )
    return available


def get_animals_for_allocation(
    db: Session, species_id: int, strain_id: int, count: int
):
    from database.lmcpafm_models import Animal

    animals = (
        db.query(Animal)
        .filter(
            Animal.species_id == species_id,
            Animal.strain_id == strain_id,
            Animal.status == "available",
        )
        .limit(count)
        .all()
    )
    return animals


def get_total_allocated_for_requisition_item(
    db: Session, requisition_item_id: int
) -> int:
    total = (
        db.query(AnimalAllocationItem)
        .filter(AnimalAllocationItem.requisition_item_id == requisition_item_id)
        .with_entities(AnimalAllocationItem.allocated_count)
        .all()
    )
    return sum([t[0] for t in total]) if total else 0


# =========================================================
# CREATE REQUISITION
# =========================================================

def create_requisition(db: Session, req: AnimalRequisitionCreate):
    db_req = AnimalRequisition(
        protocol_id=req.protocol_id,
        requester_name=req.requester_name,
        requester_role=req.requester_role,
        date=req.date,
        purpose=req.purpose,
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)

    for item in req.items:
        db_item = AnimalRequisitionItem(
            requisition_id=db_req.id,
            species_id=item.species_id,
            strain_id=item.strain_id,
            requested_count=item.requested_count,
        )
        db.add(db_item)

    try:
        db.commit()
        db.refresh(db_req)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc))
    return db_req


# =========================================================
# CREATE ALLOCATION (PARTIAL OR FULL)
# =========================================================

def create_allocation(db: Session, alloc: AnimalAllocationCreate):
    db_alloc = AnimalAllocation(
        requisition_id=alloc.requisition_id,
        date=alloc.date,
        allocated_by=alloc.allocated_by,
        remarks=alloc.remarks,
    )
    db.add(db_alloc)
    db.commit()
    db.refresh(db_alloc)

    for item in alloc.items:
        # Get requisition item
        req_item = (
            db.query(AnimalRequisitionItem)
            .filter(AnimalRequisitionItem.id == item.requisition_item_id)
            .first()
        )
        if not req_item:
            raise CRUDNotFoundError(
                f"Requisition item {item.requisition_item_id} not found."
            )

        # -------------------------------
        # 5E: Validate protocol approval
        # -------------------------------
        protocol = req_item.requisition.protocol

        if not protocol:
            raise CRUDNotFoundError("Protocol not found for this requisition.")

        if not protocol.protocol_number:
            raise CRUDValidationError(
                f"Protocol {protocol.id} does not have an IAEC-approved protocol number."
            )

        if not protocol.approval_date:
            raise CRUDValidationError(
                f"Protocol {protocol.protocol_number} is not approved by IAEC."
            )

        if hasattr(protocol, "status") and protocol.status.lower() != "approved":
            raise CRUDValidationError(
                f"Protocol {protocol.protocol_number} is not approved. "
                f"Current status: {protocol.status}"
            )

        # -------------------------------
        # 5A: Check availability
        # -------------------------------
        available = get_available_animals(
            db, req_item.species_id, req_item.strain_id
        )
        if item.allocated_count > available:
            raise CRUDValidationError(
                f"Cannot allocate {item.allocated_count} animals. "
                f"Only {available} available."
            )

        # -------------------------------
        # 5D: Cumulative allocation check
        # -------------------------------
        total_allocated_so_far = get_total_allocated_for_requisition_item(
            db, item.requisition_item_id
        )
        total_after_allocation = total_allocated_so_far + item.allocated_count

        if total_after_allocation > req_item.requested_count:
            raise CRUDValidationError(
                f"Cannot allocate {item.allocated_count} animals. "
                f"Requested: {req_item.requested_count}, "
                f"Already allocated: {total_allocated_so_far}, "
                f"Total would become: {total_after_allocation}."
            )

        # -------------------------------
        # 5B: Get actual animals + mark allocated
        # -------------------------------
        animals_to_allocate = get_animals_for_allocation(
            db,
            req_item.species_id,
            req_item.strain_id,
            item.allocated_count,
        )

        for animal in animals_to_allocate:
            animal.status = "allocated"
            animal.protocol_id = protocol.id
            db.add(animal)

        # Remaining count after this allocation
        remaining = req_item.requested_count - total_after_allocation

        # Create allocation item
        db_item = AnimalAllocationItem(
            allocation_id=db_alloc.id,
            requisition_item_id=item.requisition_item_id,
            allocated_count=item.allocated_count,
            remaining_count=remaining,
        )

        # Link allocated animals (if relationship exists)
        db_item.animals = animals_to_allocate

        db.add(db_item)

    try:
        db.commit()
        db.refresh(db_alloc)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc))
    return db_alloc


# =========================================================
# GET REQUISITION
# =========================================================

def get_requisition(db: Session, req_id: int):
    return (
        db.query(AnimalRequisition)
        .filter(AnimalRequisition.id == req_id)
        .options(
            selectinload(AnimalRequisition.items).selectinload(
                AnimalRequisitionItem.allocations
            )
        )
        .first()
    )


# =========================================================
# GET ALLOCATION
# =========================================================

def get_allocation(db: Session, alloc_id: int):
    return (
        db.query(AnimalAllocation)
        .filter(AnimalAllocation.id == alloc_id)
        .options(
            selectinload(AnimalAllocation.items).selectinload(
                AnimalAllocationItem.animals
            )
        )
        .first()
    )
