"""CRUD for species and strain master data."""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from crud.exceptions import CRUDDatabaseError, CRUDNotFoundError, CRUDValidationError
from database.lmcpafm_models import Species, Strain


def list_species(db: Session) -> list[Species]:
    return db.query(Species).order_by(Species.name.asc()).all()


def create_species(db: Session, name: str) -> Species:
    cleaned = name.strip()
    if not cleaned:
        raise CRUDValidationError("Species name is required.")

    existing = db.query(Species).filter(Species.name == cleaned).first()
    if existing is not None:
        raise CRUDValidationError(f"Species '{cleaned}' already exists.")

    record = Species(name=cleaned)
    db.add(record)
    try:
        db.commit()
        db.refresh(record)
    except IntegrityError as exc:
        db.rollback()
        raise CRUDValidationError(f"Species '{cleaned}' already exists.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc
    return record


def update_species(db: Session, species_id: int, name: str) -> Species:
    record = db.query(Species).filter(Species.id == species_id).first()
    if record is None:
        raise CRUDNotFoundError("Species not found.")

    cleaned = name.strip()
    if not cleaned:
        raise CRUDValidationError("Species name is required.")

    record.name = cleaned
    try:
        db.commit()
        db.refresh(record)
    except IntegrityError as exc:
        db.rollback()
        raise CRUDValidationError(f"Species '{cleaned}' already exists.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc
    return record


def delete_species(db: Session, species_id: int) -> None:
    record = db.query(Species).filter(Species.id == species_id).first()
    if record is None:
        raise CRUDNotFoundError("Species not found.")

    strain_count = db.query(Strain).filter(Strain.species_id == species_id).count()
    if strain_count:
        raise CRUDValidationError("Remove all strains for this species before deleting it.")

    try:
        db.delete(record)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc


def list_strains(db: Session, species_id: int | None = None) -> list[Strain]:
    query = db.query(Strain).order_by(Strain.name.asc())
    if species_id is not None:
        query = query.filter(Strain.species_id == species_id)
    return query.all()


def create_strain(db: Session, species_id: int, name: str) -> Strain:
    species = db.query(Species).filter(Species.id == species_id).first()
    if species is None:
        raise CRUDNotFoundError("Species not found.")

    cleaned = name.strip()
    if not cleaned:
        raise CRUDValidationError("Strain name is required.")

    existing = (
        db.query(Strain)
        .filter(Strain.species_id == species_id, Strain.name == cleaned)
        .first()
    )
    if existing is not None:
        raise CRUDValidationError(
            f"Strain '{cleaned}' already exists for species '{species.name}'."
        )

    record = Strain(species_id=species_id, name=cleaned)
    db.add(record)
    try:
        db.commit()
        db.refresh(record)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc
    return record


def update_strain(db: Session, strain_id: int, name: str) -> Strain:
    record = db.query(Strain).filter(Strain.id == strain_id).first()
    if record is None:
        raise CRUDNotFoundError("Strain not found.")

    cleaned = name.strip()
    if not cleaned:
        raise CRUDValidationError("Strain name is required.")

    record.name = cleaned
    try:
        db.commit()
        db.refresh(record)
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc
    return record


def delete_strain(db: Session, strain_id: int) -> None:
    record = db.query(Strain).filter(Strain.id == strain_id).first()
    if record is None:
        raise CRUDNotFoundError("Strain not found.")

    try:
        db.delete(record)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise CRUDDatabaseError(str(exc)) from exc
