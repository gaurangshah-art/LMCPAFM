from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain, IAECProject, ExperimentGroup, Animal
from database.lmcpafm_requisition_allocation import AnimalRequisition, AnimalRequisitionItem, AnimalAllocation


router = APIRouter(tags=["Lookups"])


class LookupOption(BaseModel):
    id: int
    name: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
