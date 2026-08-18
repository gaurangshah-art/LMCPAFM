from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session, joinedload

from database.lmcpafm_disposal import Disposal
from database.lmcpafm_models import Animal, BreedingRecord, Procurement, Species, Strain
from database.lmcpafm_requisition_allocation import (
    AnimalAllocation,
    AnimalAllocationItem,
    AnimalRequisitionItem,
)


def get_form_c_data(db: Session, as_of_date: date | None = None) -> dict:
    """Build read-only Form C register data from current inventory snapshots."""
    snapshot_date = as_of_date or date.today()

    stock_counts: dict[tuple[int, int], int] = defaultdict(int)
    animals = (
        db.query(Animal)
        .options(joinedload(Animal.species), joinedload(Animal.strain))
        .filter(Animal.status == "available")
        .all()
    )
    for animal in animals:
        stock_counts[(animal.species_id, animal.strain_id)] += 1

    stock_rows = []
    for (species_id, strain_id), count in sorted(stock_counts.items()):
        species = db.query(Species).filter(Species.id == species_id).first()
        strain = db.query(Strain).filter(Strain.id == strain_id).first()
        stock_rows.append(
            {
                "date": snapshot_date,
                "number_in_stock": count,
                "species_id": species_id,
                "species_name": species.name if species else "",
                "strain_id": strain_id,
                "strain_name": strain.name if strain else "",
                "sex": None,
                "age": None,
                "voucher_or_bill_number": None,
            }
        )

    acquisition_rows = []
    procurements = (
        db.query(Procurement)
        .options(joinedload(Procurement.species), joinedload(Procurement.strain))
        .order_by(Procurement.date.asc(), Procurement.id.asc())
        .all()
    )
    for row in procurements:
        acquisition_rows.append(
            {
                "date": row.date,
                "number_acquired": row.count,
                "source_type": "procurement",
                "supplier_name": row.supplier_name,
                "supplier_address": row.supplier_address,
                "acquired_from": row.acquired_from,
                "species_id": row.species_id,
                "species_name": row.species.name if row.species else "",
                "strain_id": row.strain_id,
                "strain_name": row.strain.name if row.strain else "",
                "sex": None,
                "age": None,
                "voucher_or_bill_number": row.voucher_or_bill_number,
                "procurement_id": row.id,
            }
        )

    breeding_rows = []
    breeding_records = (
        db.query(BreedingRecord)
        .options(joinedload(BreedingRecord.species), joinedload(BreedingRecord.strain))
        .order_by(BreedingRecord.date.asc(), BreedingRecord.id.asc())
        .all()
    )
    for row in breeding_records:
        breeding_rows.append(
            {
                "date": row.date,
                "number_born": row.offspring_count,
                "litter_count": row.litter_count,
                "species_id": row.species_id,
                "species_name": row.species.name if row.species else "",
                "strain_id": row.strain_id,
                "strain_name": row.strain.name if row.strain else "",
                "breeding_record_id": row.id,
                "remarks": row.remarks,
            }
        )

    disposal_rows = []
    disposals = (
        db.query(Disposal)
        .options(joinedload(Disposal.animal).joinedload(Animal.species), joinedload(Disposal.animal).joinedload(Animal.strain))
        .order_by(Disposal.date.asc(), Disposal.id.asc())
        .all()
    )
    for row in disposals:
        animal = row.animal
        disposal_rows.append(
            {
                "date": row.date,
                "animal_id": row.animal_id,
                "animal_number": animal.animal_number if animal else None,
                "method": row.method,
                "reason": row.reason,
                "species_id": animal.species_id if animal else 0,
                "species_name": animal.species.name if animal and animal.species else "",
                "strain_id": animal.strain_id if animal else 0,
                "strain_name": animal.strain.name if animal and animal.strain else "",
                "disposal_id": row.id,
            }
        )

    supplied_rows = []
    allocation_items = (
        db.query(AnimalAllocationItem)
        .join(AnimalAllocation)
        .options(
            joinedload(AnimalAllocationItem.allocation).joinedload(AnimalAllocation.requisition),
            joinedload(AnimalAllocationItem.requisition_item).joinedload(AnimalRequisitionItem.species),
            joinedload(AnimalAllocationItem.requisition_item).joinedload(AnimalRequisitionItem.strain),
        )
        .order_by(AnimalAllocation.date.asc(), AnimalAllocationItem.id.asc())
        .all()
    )

    for item in allocation_items:
        allocation = item.allocation
        requisition = allocation.requisition if allocation else None
        req_item = item.requisition_item
        species = req_item.species if req_item else None
        strain = req_item.strain if req_item else None
        supplied_rows.append(
            {
                "date": allocation.date if allocation else snapshot_date,
                "number_supplied": item.allocated_count,
                "destination_name": requisition.requester_name if requisition else None,
                "destination_address": None,
                "destination_registration_number": None,
                "species_id": req_item.species_id if req_item else 0,
                "species_name": species.name if species else "",
                "strain_id": req_item.strain_id if req_item else 0,
                "strain_name": strain.name if strain else "",
                "sex": None,
                "age": None,
                "allocation_id": allocation.id if allocation else 0,
            }
        )

    return {
        "as_of_date": snapshot_date,
        "stock_rows": stock_rows,
        "acquisition_rows": acquisition_rows,
        "breeding_rows": breeding_rows,
        "disposal_rows": disposal_rows,
        "supplied_rows": supplied_rows,
    }
