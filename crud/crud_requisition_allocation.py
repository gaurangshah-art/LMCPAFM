from datetime import datetime, timezone

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload
from database.lmcpafm_requisition_allocation import (
    AnimalRequisition,
    AnimalRequisitionItem,
    AnimalAllocation,
    AnimalAllocationItem,
)
from schemas.schemas_requisition_allocation import (
    AnimalRequisitionCreateInternal,
    AnimalAllocationCreate,
)
from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from crud.experiment_group_planning import assert_requisition_allowed
from crud.formb_membership import user_is_principal_investigator
from models.user import User
from crud.experiment_group_assignment import validate_group_assignment_capacity
from utils.business_validation import assert_allocation_date_valid, assert_requisition_date_valid


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


REQUISITION_STATUS_ACTIVE = "active"
REQUISITION_STATUS_CANCELLED = "cancelled"


def requisition_has_allocations(db: Session, requisition_id: int) -> bool:
    count = (
        db.query(AnimalAllocation)
        .filter(AnimalAllocation.requisition_id == requisition_id)
        .count()
    )
    return count > 0


def get_requisition_manage_flags(db: Session, requisition: AnimalRequisition, user: User) -> dict:
    has_alloc = requisition_has_allocations(db, requisition.id)
    is_pi = user_is_principal_investigator(db, user.id, requisition.protocol_id)
    is_active = (requisition.status or REQUISITION_STATUS_ACTIVE) == REQUISITION_STATUS_ACTIVE
    can_manage = is_pi and is_active and not has_alloc
    return {
        "status": requisition.status or REQUISITION_STATUS_ACTIVE,
        "has_allocation": has_alloc,
        "can_amend": can_manage,
        "can_cancel": can_manage,
    }


def assert_pi_can_manage_requisition(db: Session, requisition: AnimalRequisition, user: User) -> None:
    flags = get_requisition_manage_flags(db, requisition, user)
    if not flags["can_amend"]:
        if (requisition.status or REQUISITION_STATUS_ACTIVE) == REQUISITION_STATUS_CANCELLED:
            raise CRUDValidationError("This requisition has been cancelled.")
        if flags["has_allocation"]:
            raise CRUDValidationError(
                "This requisition cannot be changed after animal house staff have recorded an allocation."
            )
        if not user_is_principal_investigator(db, user.id, requisition.protocol_id):
            raise CRUDValidationError(
                "Only the principal investigator for this project can amend or cancel the requisition."
            )
        raise CRUDValidationError("This requisition cannot be amended or cancelled.")


# =========================================================
# CREATE REQUISITION
# =========================================================

def create_requisition(db: Session, req: AnimalRequisitionCreateInternal):
    requested_total = sum(item.requested_count for item in req.items)
    assert_requisition_allowed(db, req.protocol_id, requested_total)
    assert_requisition_date_valid(db, req.protocol_id, req.date)

    db_req = AnimalRequisition(
        protocol_id=req.protocol_id,
        requester_user_id=req.requester_user_id,
        requester_name=req.requester_name,
        requester_role=req.requester_role,
        date=req.date,
        purpose=req.purpose,
        status=REQUISITION_STATUS_ACTIVE,
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
    requisition = (
        db.query(AnimalRequisition)
        .filter(AnimalRequisition.id == alloc.requisition_id)
        .first()
    )
    if not requisition:
        raise CRUDNotFoundError(f"Requisition {alloc.requisition_id} not found.")

    if (requisition.status or REQUISITION_STATUS_ACTIVE) != REQUISITION_STATUS_ACTIVE:
        raise CRUDValidationError(
            "Cannot allocate animals for a cancelled requisition. "
            "Ask the PI to submit a new requisition if needed."
        )

    assert_allocation_date_valid(
        db,
        protocol_id=requisition.protocol_id,
        requisition_date=requisition.date,
        allocation_date=alloc.date,
    )

    experiment_group = None
    if alloc.experiment_group_id is not None:
        from database.lmcpafm_models import ExperimentGroup

        experiment_group = (
            db.query(ExperimentGroup)
            .filter(ExperimentGroup.id == alloc.experiment_group_id)
            .first()
        )
        if experiment_group is None:
            raise CRUDNotFoundError(f"Experiment group {alloc.experiment_group_id} not found.")
        if experiment_group.project_id != requisition.protocol_id:
            raise CRUDValidationError(
                "Experiment group does not belong to the requisition protocol."
            )

    total_to_allocate = sum(item.allocated_count for item in alloc.items)
    if experiment_group is not None and total_to_allocate > 0:
        validate_group_assignment_capacity(db, experiment_group, total_to_allocate)

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
            if experiment_group is not None:
                animal.experiment_group_id = experiment_group.id
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

def amend_requisition(
    db: Session,
    req_id: int,
    user: User,
    *,
    date,
    purpose: str,
    items,
) -> AnimalRequisition:
    requisition = get_requisition(db, req_id)
    if not requisition:
        raise CRUDNotFoundError(f"Requisition {req_id} not found.")

    assert_pi_can_manage_requisition(db, requisition, user)

    requested_total = sum(item.requested_count for item in items)
    assert_requisition_allowed(db, requisition.protocol_id, requested_total)
    assert_requisition_date_valid(db, requisition.protocol_id, date)

    requisition.date = date
    requisition.purpose = purpose
    requisition.amended_at = datetime.now(timezone.utc)

    for existing in list(requisition.items):
        db.delete(existing)
    db.flush()

    for item in items:
        db.add(
            AnimalRequisitionItem(
                requisition_id=requisition.id,
                species_id=item.species_id,
                strain_id=item.strain_id,
                requested_count=item.requested_count,
            )
        )

    try:
        db.commit()
        db.refresh(requisition)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc

    return get_requisition(db, req_id)


def cancel_requisition(db: Session, req_id: int, user: User) -> AnimalRequisition:
    requisition = get_requisition(db, req_id)
    if not requisition:
        raise CRUDNotFoundError(f"Requisition {req_id} not found.")

    assert_pi_can_manage_requisition(db, requisition, user)

    requisition.status = REQUISITION_STATUS_CANCELLED
    requisition.cancelled_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(requisition)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc

    return get_requisition(db, req_id)


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


def list_requisitions_by_protocol(db: Session, protocol_id: int) -> list[AnimalRequisition]:
    return (
        db.query(AnimalRequisition)
        .filter(AnimalRequisition.protocol_id == protocol_id)
        .options(selectinload(AnimalRequisition.items))
        .order_by(AnimalRequisition.date.desc(), AnimalRequisition.id.asc())
        .all()
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
