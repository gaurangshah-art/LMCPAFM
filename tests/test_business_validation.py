from datetime import date
from uuid import uuid4

import pytest

from database.database import SessionLocal
from database.lmcpafm_models import Animal, FormB, IAECMeeting, Species, Strain

from tests.planning_helpers import create_experiment_group, seed_project_animal_cap
from utils.business_validation import parse_weight_grams, validate_weight_grams


def test_parse_weight_grams_accepts_common_formats():
    assert parse_weight_grams("200 g") == (200.0, None)
    assert parse_weight_grams("200-250 g") == (200.0, 250.0)
    assert parse_weight_grams("200 to 250 grams") == (200.0, 250.0)


def test_validate_weight_grams_rejects_non_numeric():
    with pytest.raises(ValueError, match="numeric"):
        validate_weight_grams("heavy")


def _create_approved_project(client, iaec_auth_headers, protocol_number: str, approval_date: str):
    response = client.post(
        "/iaec/project",
        json={
            "title": "Validation Test Project",
            "investigator_name": "Dr. Validate",
            "protocol_number": protocol_number,
            "approval_date": approval_date,
            "status": "approved",
        },
        headers=iaec_auth_headers,
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def _seed_inventory(project_id: int, cap: int = 5):
    suffix = uuid4().hex[:8]
    db = SessionLocal()
    try:
        species = Species(name=f"ValSpecies-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"ValStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        seed_project_animal_cap(db, project_id, cap=cap, species_id=species.id, strain_id=strain.id)
        for _ in range(cap):
            db.add(Animal(species_id=species.id, strain_id=strain.id, status="available"))
        db.commit()
        return species.id, strain.id
    finally:
        db.close()


def test_requisition_date_cannot_precede_approval(client, staff_auth_headers, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers, "VAL-REQ-001", "2026-02-01")
    species_id, strain_id = _seed_inventory(project_id)
    group_res = create_experiment_group(client, iaec_auth_headers, project_id, "Validation Group", 5)
    assert group_res.status_code == 200, group_res.text

    response = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-01-15",
            "purpose": "Too early",
            "items": [{"species_id": species_id, "strain_id": strain_id, "requested_count": 1}],
        },
        headers=staff_auth_headers,
    )
    assert response.status_code == 400
    assert "approval date" in response.json()["detail"].lower()


def test_allocation_date_cannot_precede_requisition(client, staff_auth_headers, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers, "VAL-ALLOC-001", "2026-02-01")
    species_id, strain_id = _seed_inventory(project_id)
    group_res = create_experiment_group(client, iaec_auth_headers, project_id, "Validation Group", 5)
    assert group_res.status_code == 200, group_res.text

    req_res = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-02-05",
            "purpose": "Allocation validation",
            "items": [{"species_id": species_id, "strain_id": strain_id, "requested_count": 2}],
        },
        headers=staff_auth_headers,
    )
    assert req_res.status_code == 200, req_res.text
    req_item_id = req_res.json()["items"][0]["id"]

    alloc_res = client.post(
        "/iaec/allocation",
        json={
            "requisition_id": req_res.json()["id"],
            "date": "2026-02-04",
            "allocated_by": "Staff",
            "remarks": "Too early",
            "items": [{"requisition_item_id": req_item_id, "allocated_count": 1, "remaining_count": 1}],
        },
        headers=staff_auth_headers,
    )
    assert alloc_res.status_code == 400
    assert "requisition date" in alloc_res.json()["detail"].lower()


def test_experiment_date_cannot_precede_meeting_or_allocation(
    client,
    staff_auth_headers,
    iaec_auth_headers,
):
    project_id = _create_approved_project(client, iaec_auth_headers, "VAL-EXP-001", "2026-02-10")
    species_id, strain_id = _seed_inventory(project_id, cap=2)

    db = SessionLocal()
    try:
        form_b = db.query(FormB).filter(FormB.project_id == project_id).first()
        if form_b is None:
            form_b = FormB(project_id=project_id, application_data={})
            db.add(form_b)
            db.commit()
            db.refresh(form_b)

        meeting = IAECMeeting(
            meeting_number="01",
            date=date(2026, 2, 8),
            minutes="Validation meeting",
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        form_b.meeting_id = meeting.id
        db.commit()
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, "Validation Group", 2)
    assert group_res.status_code == 200, group_res.text
    group_id = group_res.json()["id"]

    req_res = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-02-11",
            "purpose": "Experiment validation",
            "items": [{"species_id": species_id, "strain_id": strain_id, "requested_count": 2}],
        },
        headers=staff_auth_headers,
    )
    assert req_res.status_code == 200, req_res.text
    req_item_id = req_res.json()["items"][0]["id"]

    alloc_res = client.post(
        "/iaec/allocation",
        json={
            "requisition_id": req_res.json()["id"],
            "date": "2026-02-12",
            "allocated_by": "Staff",
            "remarks": "Allocate",
            "items": [{"requisition_item_id": req_item_id, "allocated_count": 2, "remaining_count": 0}],
        },
        headers=staff_auth_headers,
    )
    assert alloc_res.status_code == 200, alloc_res.text
    alloc_id = alloc_res.json()["id"]
    animal_ids = [animal["id"] for animal in alloc_res.json()["items"][0]["animals"]]

    exp_res = client.post(
        "/experiment/",
        json={
            "protocol_id": project_id,
            "allocation_id": alloc_id,
            "experiment_group_id": group_id,
            "date": "2026-02-07",
            "performed_by": "Dr. Validate",
            "purpose": "Too early",
            "procedure": "Procedure",
            "dose": "1 mg/kg",
            "observations": "Done",
            "animals": [{"animal_id": animal_ids[0]}],
        },
    )
    assert exp_res.status_code == 400
    assert "meeting date" in exp_res.json()["detail"].lower()

    exp_res_after_alloc = client.post(
        "/experiment/",
        json={
            "protocol_id": project_id,
            "allocation_id": alloc_id,
            "experiment_group_id": group_id,
            "date": "2026-02-11",
            "performed_by": "Dr. Validate",
            "purpose": "Before issue",
            "procedure": "Procedure",
            "dose": "1 mg/kg",
            "observations": "Done",
            "animals": [{"animal_id": animal_ids[1]}],
        },
    )
    assert exp_res_after_alloc.status_code == 400
    assert "animal issue date" in exp_res_after_alloc.json()["detail"].lower()
