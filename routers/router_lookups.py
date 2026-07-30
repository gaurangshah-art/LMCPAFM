from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain, IAECProject, ExperimentGroup, Animal
from database.lmcpafm_requisition_allocation import (
    AnimalRequisition,
    AnimalRequisitionItem,
    AnimalAllocation,
    AnimalAllocationItem,
    allocation_item_animals,
)
from database.lmcpafm_experiments import Experiment


router = APIRouter(tags=["Lookups"])
lookup_router = APIRouter(prefix="/lookup", tags=["Approved Lookups"])


class LookupOption(BaseModel):
    id: int
    name: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _approved_protocol_ids(db: Session) -> list[int]:
    rows = (
        db.query(IAECProject.id)
        .filter(func.lower(func.coalesce(IAECProject.status, "")).contains("approved"))
        .all()
    )
    return [row[0] for row in rows]


@router.get("/species", response_model=list[LookupOption])
def list_species(db: Session = Depends(get_db)):
    rows = db.query(Species).order_by(Species.name.asc()).all()
    return [LookupOption(id=row.id, name=row.name) for row in rows]


@router.get("/strain", response_model=list[LookupOption])
def list_strains(db: Session = Depends(get_db)):
    rows = db.query(Strain).order_by(Strain.name.asc()).all()
    return [LookupOption(id=row.id, name=row.name) for row in rows]


@router.get("/project", response_model=list[LookupOption])
def list_projects(db: Session = Depends(get_db)):
    rows = db.query(IAECProject).order_by(IAECProject.title.asc()).all()
    return [LookupOption(id=row.id, name=row.title) for row in rows]


@router.get("/protocol", response_model=list[LookupOption])
def list_protocols(db: Session = Depends(get_db)):
    rows = db.query(IAECProject).order_by(IAECProject.id.asc()).all()
    return [
        LookupOption(
            id=row.id,
            name=(row.protocol_number or row.title or f"Protocol {row.id}"),
        )
        for row in rows
    ]


@router.get("/experiment-group", response_model=list[LookupOption])
def list_experiment_groups(db: Session = Depends(get_db)):
    rows = db.query(ExperimentGroup).order_by(ExperimentGroup.name.asc()).all()
    return [LookupOption(id=row.id, name=row.name) for row in rows]


@router.get("/requisition", response_model=list[LookupOption])
def list_requisitions(db: Session = Depends(get_db)):
    rows = db.query(AnimalRequisition).order_by(AnimalRequisition.id.asc()).all()
    return [LookupOption(id=row.id, name=f"Req {row.id} - {row.requester_name}") for row in rows]


@router.get("/requisition-item", response_model=list[LookupOption])
def list_requisition_items(db: Session = Depends(get_db)):
    rows = db.query(AnimalRequisitionItem).order_by(AnimalRequisitionItem.id.asc()).all()
    return [
        LookupOption(
            id=row.id,
            name=f"ReqItem {row.id} (Req {row.requisition_id})",
        )
        for row in rows
    ]


@router.get("/allocation", response_model=list[LookupOption])
def list_allocations(db: Session = Depends(get_db)):
    rows = db.query(AnimalAllocation).order_by(AnimalAllocation.id.asc()).all()
    return [LookupOption(id=row.id, name=f"Allocation {row.id}") for row in rows]


@router.get("/animal", response_model=list[LookupOption])
def list_animals(db: Session = Depends(get_db)):
    rows = db.query(Animal).order_by(Animal.id.asc()).all()
    return [LookupOption(id=row.id, name=f"Animal {row.id}") for row in rows]


@lookup_router.get("/approved-protocols", response_model=list[LookupOption])
def approved_protocols(db: Session = Depends(get_db)):
    rows = (
        db.query(IAECProject)
        .filter(func.lower(func.coalesce(IAECProject.status, "")).contains("approved"))
        .order_by(IAECProject.id.asc())
        .all()
    )
    return [
        LookupOption(
            id=row.id,
            name=(row.protocol_number or row.title or f"Protocol {row.id}"),
        )
        for row in rows
    ]


@lookup_router.get("/approved-species", response_model=list[LookupOption])
def approved_species(db: Session = Depends(get_db)):
    approved_ids = _approved_protocol_ids(db)
    if not approved_ids:
        return []

    rows = (
        db.query(Species)
        .join(AnimalRequisitionItem, AnimalRequisitionItem.species_id == Species.id)
        .join(AnimalRequisition, AnimalRequisition.id == AnimalRequisitionItem.requisition_id)
        .filter(AnimalRequisition.protocol_id.in_(approved_ids))
        .distinct()
        .order_by(Species.name.asc())
        .all()
    )
    return [LookupOption(id=row.id, name=row.name) for row in rows]


@lookup_router.get("/approved-strains", response_model=list[LookupOption])
def approved_strains(
    species_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    approved_ids = _approved_protocol_ids(db)
    if not approved_ids:
        return []

    query = (
        db.query(Strain)
        .join(AnimalRequisitionItem, AnimalRequisitionItem.strain_id == Strain.id)
        .join(AnimalRequisition, AnimalRequisition.id == AnimalRequisitionItem.requisition_id)
        .filter(AnimalRequisition.protocol_id.in_(approved_ids))
    )
    if species_id is not None:
        query = query.filter(Strain.species_id == species_id)

    rows = query.distinct().order_by(Strain.name.asc()).all()
    return [LookupOption(id=row.id, name=row.name) for row in rows]


@lookup_router.get("/approved-genders", response_model=list[LookupOption])
def approved_genders():
    return [
        LookupOption(id=1, name="Male"),
        LookupOption(id=2, name="Female"),
        LookupOption(id=3, name="Unknown"),
    ]


@lookup_router.get("/approved-experiment-groups", response_model=list[LookupOption])
def approved_experiment_groups(db: Session = Depends(get_db)):
    approved_ids = _approved_protocol_ids(db)
    if not approved_ids:
        return []

    rows = (
        db.query(ExperimentGroup)
        .filter(ExperimentGroup.project_id.in_(approved_ids))
        .order_by(ExperimentGroup.name.asc())
        .all()
    )
    return [LookupOption(id=row.id, name=row.name) for row in rows]


@lookup_router.get("/approved-requisitions", response_model=list[LookupOption])
def approved_requisitions(db: Session = Depends(get_db)):
    approved_ids = _approved_protocol_ids(db)
    if not approved_ids:
        return []

    rows = (
        db.query(AnimalRequisition)
        .filter(AnimalRequisition.protocol_id.in_(approved_ids))
        .order_by(AnimalRequisition.id.asc())
        .all()
    )
    return [LookupOption(id=row.id, name=f"Req {row.id} - {row.requester_name}") for row in rows]


@lookup_router.get("/approved-requisition-items", response_model=list[LookupOption])
def approved_requisition_items(
    requisition_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    approved_ids = _approved_protocol_ids(db)
    if not approved_ids:
        return []

    query = (
        db.query(AnimalRequisitionItem)
        .join(AnimalRequisition, AnimalRequisition.id == AnimalRequisitionItem.requisition_id)
        .filter(AnimalRequisition.protocol_id.in_(approved_ids))
    )
    if requisition_id is not None:
        query = query.filter(AnimalRequisitionItem.requisition_id == requisition_id)

    rows = query.order_by(AnimalRequisitionItem.id.asc()).all()
    return [
        LookupOption(id=row.id, name=f"ReqItem {row.id} (Req {row.requisition_id})")
        for row in rows
    ]


@lookup_router.get("/approved-allocations", response_model=list[LookupOption])
def approved_allocations(db: Session = Depends(get_db)):
    approved_ids = _approved_protocol_ids(db)
    if not approved_ids:
        return []

    rows = (
        db.query(AnimalAllocation)
        .join(AnimalRequisition, AnimalRequisition.id == AnimalAllocation.requisition_id)
        .filter(AnimalRequisition.protocol_id.in_(approved_ids))
        .order_by(AnimalAllocation.id.asc())
        .all()
    )
    return [LookupOption(id=row.id, name=f"Allocation {row.id}") for row in rows]


@lookup_router.get("/approved-animals", response_model=list[LookupOption])
def approved_animals(
    db: Session = Depends(get_db),
    allocation_id: int | None = Query(None, gt=0),
):
    approved_ids = _approved_protocol_ids(db)
    if not approved_ids:
        return []

    query = db.query(Animal).filter(Animal.protocol_id.in_(approved_ids))

    if allocation_id is not None:
        query = (
            query.join(allocation_item_animals, allocation_item_animals.c.animal_id == Animal.id)
            .join(
                AnimalAllocationItem,
                AnimalAllocationItem.id == allocation_item_animals.c.allocation_item_id,
            )
            .filter(AnimalAllocationItem.allocation_id == allocation_id)
        )

    rows = query.order_by(Animal.animal_number.asc(), Animal.id.asc()).all()
    return [
        LookupOption(
            id=row.id,
            name=row.animal_number or f"Animal {row.id}",
        )
        for row in rows
    ]


@lookup_router.get("/approved-experiments", response_model=list[LookupOption])
def approved_experiments(db: Session = Depends(get_db)):
    approved_ids = _approved_protocol_ids(db)
    if not approved_ids:
        return []

    rows = (
        db.query(Experiment)
        .filter(Experiment.protocol_id.in_(approved_ids))
        .order_by(Experiment.id.asc())
        .all()
    )
    return [LookupOption(id=row.id, name=f"Experiment {row.id} - {row.purpose}") for row in rows]
