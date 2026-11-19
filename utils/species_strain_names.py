from __future__ import annotations

from sqlalchemy.orm import Session

from database.lmcpafm_models import Species, Strain


def resolve_species_strain_labels(
    *,
    species_id: int | None,
    strain_id: int | None,
    species_other: str | None,
    strain_other: str | None,
    db: Session,
) -> tuple[str, str]:
    other_species = (species_other or "").strip()
    other_strain = (strain_other or "").strip()
    if other_species:
        if not other_strain:
            raise ValueError("Strain is required when species is Other.")
        return other_species, other_strain

    if species_id is None:
        raise ValueError("Species is required.")

    species = db.query(Species).filter(Species.id == species_id).first()
    if species is None:
        raise ValueError("Invalid species selected.")

    if other_strain:
        return species.name, other_strain

    if strain_id is None:
        raise ValueError("Strain is required.")

    strain = db.query(Strain).filter(Strain.id == strain_id).first()
    if strain is None:
        raise ValueError("Invalid strain selected.")
    if strain.species_id != species.id:
        raise ValueError("Selected strain does not belong to the selected species.")

    return species.name, strain.name


def get_or_create_species_strain(db: Session, species_name: str, strain_name: str) -> tuple[Species, Strain]:
    name = species_name.strip()
    strain_label = strain_name.strip()
    if not name or not strain_label:
        raise ValueError("Species and strain names are required.")

    species = db.query(Species).filter(Species.name.ilike(name)).first()
    if species is None:
        species = Species(name=name)
        db.add(species)
        db.flush()

    strain = (
        db.query(Strain)
        .filter(Strain.species_id == species.id, Strain.name.ilike(strain_label))
        .first()
    )
    if strain is None:
        strain = Strain(name=strain_label, species_id=species.id)
        db.add(strain)
        db.flush()

    return species, strain
