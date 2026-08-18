from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from crud.exceptions import CRUDNotFoundError, CRUDValidationError, CRUDDatabaseError
from crud import master_data as master_data_crud
from crud.activity_log import record_activity
from database.database import get_db
from dependencies.auth import require_admin
from models.user import User
from schemas.schemas_master_data import SpeciesCreate, SpeciesRead, StrainCreate, StrainRead
from utils.formb_funding_proof import FUNDING_PROOF_REFERENCE_OPTIONS

router = APIRouter(prefix="/admin/masters", tags=["Admin Masters"])


@router.get("/funding-proof-options")
def read_funding_proof_options(
    _current_user: User = Depends(require_admin),
):
    return list(FUNDING_PROOF_REFERENCE_OPTIONS)


@router.get("/species", response_model=list[SpeciesRead])
def read_species(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return master_data_crud.list_species(db)


@router.post("/species", response_model=SpeciesRead, status_code=201)
def create_species(
    payload: SpeciesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        record = master_data_crud.create_species(db, payload.name)
        record_activity(
            db,
            user=current_user,
            action="master.species.created",
            details=f"Added species '{record.name}'",
        )
        db.commit()
        return record
    except CRUDValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CRUDDatabaseError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")


@router.put("/species/{species_id}", response_model=SpeciesRead)
def update_species(
    species_id: int,
    payload: SpeciesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        record = master_data_crud.update_species(db, species_id, payload.name)
        record_activity(
            db,
            user=current_user,
            action="master.species.updated",
            details=f"Updated species {species_id} to '{record.name}'",
        )
        db.commit()
        return record
    except CRUDNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CRUDDatabaseError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/species/{species_id}", status_code=204)
def delete_species(
    species_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        master_data_crud.delete_species(db, species_id)
        record_activity(
            db,
            user=current_user,
            action="master.species.deleted",
            details=f"Deleted species {species_id}",
        )
        db.commit()
    except CRUDNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CRUDDatabaseError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/strains", response_model=list[StrainRead])
def read_strains(
    species_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    rows = master_data_crud.list_strains(db, species_id=species_id)
    return [
        StrainRead(
            id=row.id,
            species_id=row.species_id,
            name=row.name,
            species_name=row.species.name if row.species else None,
        )
        for row in rows
    ]


@router.post("/strains", response_model=StrainRead, status_code=201)
def create_strain(
    payload: StrainCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        record = master_data_crud.create_strain(db, payload.species_id, payload.name)
        record_activity(
            db,
            user=current_user,
            action="master.strain.created",
            details=f"Added strain '{record.name}' for species {payload.species_id}",
        )
        db.commit()
        return StrainRead(
            id=record.id,
            species_id=record.species_id,
            name=record.name,
            species_name=record.species.name if record.species else None,
        )
    except CRUDNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CRUDDatabaseError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")


@router.put("/strains/{strain_id}", response_model=StrainRead)
def update_strain(
    strain_id: int,
    payload: SpeciesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        record = master_data_crud.update_strain(db, strain_id, payload.name)
        record_activity(
            db,
            user=current_user,
            action="master.strain.updated",
            details=f"Updated strain {strain_id} to '{record.name}'",
        )
        db.commit()
        return StrainRead(
            id=record.id,
            species_id=record.species_id,
            name=record.name,
            species_name=record.species.name if record.species else None,
        )
    except CRUDNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CRUDDatabaseError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/strains/{strain_id}", status_code=204)
def delete_strain(
    strain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        master_data_crud.delete_strain(db, strain_id)
        record_activity(
            db,
            user=current_user,
            action="master.strain.deleted",
            details=f"Deleted strain {strain_id}",
        )
        db.commit()
    except CRUDNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CRUDValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CRUDDatabaseError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
