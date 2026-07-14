from sqlalchemy.orm import class_mapper

from database.lmcpafm_models import (
    IAECProject,
    ExperimentGroup,
    AnimalExperiment,
    Animal,
    Species,
    Strain,
)
from database.lmcpafm_requisition_allocation import (
    AnimalRequisition,
    AnimalRequisitionItem,
    AnimalAllocation,
    AnimalAllocationItem,
)
from database.lmcpafm_experiments import Experiment, ExperimentAnimal


def test_iaec_project_relationships():
    mapper = class_mapper(IAECProject)
    rel = {r.key: r for r in mapper.relationships}

    assert "experiment_groups" in rel
    assert rel["experiment_groups"].back_populates == "project"

    assert "animals" in rel
    assert rel["animals"].back_populates == "protocol"

    assert "requisitions" in rel
    assert rel["requisitions"].back_populates == "protocol"

    assert "experiments" in rel
    assert rel["experiments"].back_populates == "protocol"


def test_experiment_relationships():
    mapper = class_mapper(Experiment)
    rel = {r.key: r for r in mapper.relationships}

    assert "protocol" in rel
    assert rel["protocol"].back_populates == "experiments"

    assert "allocation" in rel
    assert rel["allocation"].back_populates == "experiments"

    assert "animals" in rel
    assert rel["animals"].back_populates == "experiment"


def test_experiment_animal_relationships():
    mapper = class_mapper(ExperimentAnimal)
    rel = {r.key: r for r in mapper.relationships}

    assert "experiment" in rel
    assert rel["experiment"].back_populates == "animals"

    assert "animal" in rel
    assert rel["animal"].back_populates == "experiments"


def test_requisition_allocation_relationships():
    req_mapper = class_mapper(AnimalRequisition)
    req_rel = {r.key: r for r in req_mapper.relationships}

    assert "protocol" in req_rel
    assert req_rel["protocol"].back_populates == "requisitions"
    assert "items" in req_rel
    assert req_rel["items"].back_populates == "requisition"
    assert "allocations" in req_rel
    assert req_rel["allocations"].back_populates == "requisition"

    alloc_mapper = class_mapper(AnimalAllocation)
    alloc_rel = {r.key: r for r in alloc_mapper.relationships}

    assert "requisition" in alloc_rel
    assert alloc_rel["requisition"].back_populates == "allocations"
    assert "items" in alloc_rel
    assert alloc_rel["items"].back_populates == "allocation"
    assert "experiments" in alloc_rel
    assert alloc_rel["experiments"].back_populates == "allocation"


def test_requisition_item_relationships():
    item_mapper = class_mapper(AnimalRequisitionItem)
    item_rel = {r.key: r for r in item_mapper.relationships}

    assert "requisition" in item_rel
    assert item_rel["requisition"].back_populates == "items"
    assert "species" in item_rel
    assert item_rel["species"].back_populates == "requisition_items"
    assert "strain" in item_rel
    assert item_rel["strain"].back_populates == "requisition_items"
    assert "allocations" in item_rel
    assert item_rel["allocations"].back_populates == "requisition_item"


def test_species_strain_relationships():
    species_mapper = class_mapper(Species)
    species_rel = {r.key: r for r in species_mapper.relationships}

    assert "strains" in species_rel
    assert species_rel["strains"].back_populates == "species"
    assert "animals" in species_rel
    assert species_rel["animals"].back_populates == "species"
    assert "requisition_items" in species_rel
    assert species_rel["requisition_items"].back_populates == "species"

    strain_mapper = class_mapper(Strain)
    strain_rel = {r.key: r for r in strain_mapper.relationships}

    assert "species" in strain_rel
    assert strain_rel["species"].back_populates == "strains"
    assert "animals" in strain_rel
    assert strain_rel["animals"].back_populates == "strain"
    assert "requisition_items" in strain_rel
    assert strain_rel["requisition_items"].back_populates == "strain"
