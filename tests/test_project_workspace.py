from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain

from tests.planning_helpers import create_experiment_group, seed_project_animal_cap


def test_project_workspace_endpoint(client, staff_auth_headers, iaec_auth_headers):
    project_res = client.post(
        "/iaec/project",
        json={
            "title": "Workspace Project",
            "investigator_name": "Dr. Workspace",
            "protocol_number": "WS-001",
            "approval_date": "2026-01-01",
            "status": "approved",
        },
        headers=iaec_auth_headers,
    )
    assert project_res.status_code == 200, project_res.text
    project_id = project_res.json()["id"]

    suffix = uuid4().hex[:8]
    db = SessionLocal()
    try:
        species = Species(name=f"WsSpecies-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"WsStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        seed_project_animal_cap(db, project_id, cap=3, species_id=species.id, strain_id=strain.id)
    finally:
        db.close()

    before_res = client.get(f"/iaec/project/{project_id}/workspace", headers=iaec_auth_headers)
    assert before_res.status_code == 200, before_res.text
    before = before_res.json()
    assert before["project"]["id"] == project_id
    assert before["workflow"]["planning_complete"] is False

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, "Workspace Group", 3)
    assert group_res.status_code == 200, group_res.text

    after_res = client.get(f"/iaec/project/{project_id}/workspace", headers=iaec_auth_headers)
    assert after_res.status_code == 200, after_res.text
    after = after_res.json()
    assert after["workflow"]["planning_complete"] is True
    assert after["workflow"]["can_create_requisition"] is True
    assert len(after["groups"]) == 1
