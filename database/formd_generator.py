from sqlalchemy.orm import Session

from database.lmcpafm_models import IAECProject, Animal
from database.lmcpafm_requisition_allocation import AnimalAllocation, AnimalAllocationItem
from database.lmcpafm_experiments import Experiment, ExperimentAnimal
from database.lmcpafm_disposal import Disposal


def generate_form_d(db: Session, protocol_id: int):
    # -------------------------------------------------------
    # 1. Fetch protocol
    # -------------------------------------------------------
    protocol = db.query(IAECProject).filter(IAECProject.id == protocol_id).first()
    if not protocol:
        raise Exception("Protocol not found.")

    # -------------------------------------------------------
    # 2. Fetch allocations under this protocol
    # -------------------------------------------------------
    allocations = (
        db.query(AnimalAllocation)
        .filter(AnimalAllocation.requisition.has(protocol_id=protocol_id))
        .all()
    )

    allocation_items = []
    for alloc in allocations:
        items = (
            db.query(AnimalAllocationItem)
            .filter(AnimalAllocationItem.allocation_id == alloc.id)
            .all()
        )
        allocation_items.extend(items)

    # -------------------------------------------------------
    # 3. Fetch experiments under this protocol
    # -------------------------------------------------------
    experiments = (
        db.query(Experiment)
        .filter(Experiment.protocol_id == protocol_id)
        .all()
    )

    experiment_animals = (
        db.query(ExperimentAnimal)
        .join(Experiment)
        .filter(Experiment.protocol_id == protocol_id)
        .all()
    )

    # -------------------------------------------------------
    # 4. Fetch disposal records under this protocol
    # -------------------------------------------------------
    disposal_records = (
        db.query(Disposal)
        .join(Animal)
        .filter(Animal.protocol_id == protocol_id)
        .all()
    )

    # -------------------------------------------------------
    # 5. Compute counts
    # -------------------------------------------------------
    allocated_count = sum(item.allocated_count for item in allocation_items)
    used_count = len(experiment_animals)
    disposed_count = len(disposal_records)

    # Remaining = allocated - disposed
    remaining_count = allocated_count - disposed_count

    # -------------------------------------------------------
    # 6. Build Form‑D data structure
    # -------------------------------------------------------
    form_d = {
        "protocol_number": protocol.protocol_number,
        "approval_date": protocol.approval_date,
        "title": protocol.title,
        "principal_investigator": protocol.principal_investigator,
        "purpose": protocol.purpose,

        "allocated_count": allocated_count,
        "used_in_experiment": used_count,
        "disposed_count": disposed_count,
        "remaining_count": remaining_count,

        "allocations": [
            {
                "allocation_id": alloc.id,
                "date": alloc.date,
                "allocated_by": alloc.allocated_by,
                "remarks": alloc.remarks,
            }
            for alloc in allocations
        ],

        "allocation_items": [
            {
                "species_id": item.species_id,
                "strain_id": item.strain_id,
                "allocated_count": item.allocated_count,
                "remaining_count": item.remaining_count,
            }
            for item in allocation_items
        ],

        "experiments": [
            {
                "experiment_id": exp.id,
                "date": exp.date,
                "performed_by": exp.performed_by,
                "purpose": exp.purpose,
                "procedure": exp.procedure,
                "dose": exp.dose,
                "observations": exp.observations,
                "animal_ids": [
                    ea.animal_id
                    for ea in experiment_animals
                    if ea.experiment_id == exp.id
                ],
            }
            for exp in experiments
        ],

        "disposals": [
            {
                "disposal_id": disp.id,
                "animal_id": disp.animal_id,
                "date": disp.date,
                "method": disp.method,
                "reason": disp.reason,
                "remarks": disp.remarks,
            }
            for disp in disposal_records
        ],
    }

    return form_d
