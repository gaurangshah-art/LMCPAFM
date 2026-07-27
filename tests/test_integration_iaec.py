from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain, Animal

from tests.planning_helpers import create_experiment_group, seed_project_animal_cap


def test_integration_project_requisition_allocation_experiment(client, staff_auth_headers, iaec_auth_headers):
    # 1) Create IAEC project (protocol)
    proj_payload = {
        "title": "Integration Project",
        "investigator_name": "Dr. Integrate",
        "protocol_number": "INT-001",
        "approval_date": "2026-02-01",
        "status": "approved",
    }
    resp = client.post("/iaec/project", json=proj_payload, headers=iaec_auth_headers)
    assert resp.status_code == 200
    project = resp.json()
    project_id = project["id"]

    # 2) Insert species, strain, and animals directly into DB
    db = SessionLocal()
    suffix = uuid4().hex[:8]
    try:
        sp = Species(name=f"TestSpecies-{suffix}")
        db.add(sp)
        db.commit()
        db.refresh(sp)

        st = Strain(name=f"TestStrain-{suffix}", species_id=sp.id)
        db.add(st)
        db.commit()
        db.refresh(st)

        # create 3 available animals
        animals = []
        for i in range(3):
            a = Animal(species_id=sp.id, strain_id=st.id, status="available")
            db.add(a)
            animals.append(a)
        db.commit()
        for a in animals:
            db.refresh(a)

        seed_project_animal_cap(db, project_id, cap=3, species_id=sp.id, strain_id=st.id)
    finally:
        db.close()

    group_res = create_experiment_group(
        client,
        iaec_auth_headers,
        project_id,
        "Integration Group",
        3,
    )
    assert group_res.status_code == 200, group_res.text

    # 3) Submit a requisition requesting 2 animals
    req_payload = {
        "protocol_id": project_id,
        "date": "2026-02-10",
        "purpose": "Integration test requisition",
        "items": [{"species_id": sp.id, "strain_id": st.id, "requested_count": 2}],
    }
    resp = client.post("/iaec/requisition", json=req_payload, headers=staff_auth_headers)
    assert resp.status_code == 200
    requisition = resp.json()
    req_id = requisition["id"]
    assert len(requisition.get("items", [])) == 1
    req_item_id = requisition["items"][0]["id"]

    # 4) Submit an allocation for 2 animals for that requisition item
    alloc_payload = {
        "requisition_id": req_id,
        "date": "2026-02-11",
        "allocated_by": "Bob",
        "remarks": "Allocating two animals",
        "items": [{"requisition_item_id": req_item_id, "allocated_count": 2, "remaining_count": 0}],
    }
    resp = client.post("/iaec/allocation", json=alloc_payload, headers=staff_auth_headers)
    assert resp.status_code == 200
    allocation = resp.json()
    alloc_id = allocation["id"]
    assert len(allocation.get("items", [])) == 1
    alloc_item = allocation["items"][0]
    assert alloc_item.get("allocated_count") == 2
    # Ensure allocated animals are present
    animals_allocated = alloc_item.get("animals", [])
    assert len(animals_allocated) == 2
    allocated_animal_ids = [a["id"] for a in animals_allocated]

    # 5) Create an experiment using the allocated animals
    group_id = group_res.json()["id"]
    exp_payload = {
        "protocol_id": project_id,
        "experiment_group_id": group_id,
        "allocation_id": alloc_id,
        "date": "2026-02-12",
        "performed_by": "Dr. Integrate",
        "purpose": "Integration experiment",
        "procedure": "Test procedure",
        "dose": "N/A",
        "observations": "None",
        "animals": [{"animal_id": allocated_animal_ids[0]}, {"animal_id": allocated_animal_ids[1]}],
    }
    resp = client.post("/experiment/", json=exp_payload)
    assert resp.status_code == 200
    experiment = resp.json()
    assert experiment.get("id") is not None
    assert len(experiment.get("animals", [])) == 2
