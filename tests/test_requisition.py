from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain


def test_create_and_get_requisition(client, staff_auth_headers, iaec_auth_headers):
    suffix = uuid4().hex[:8]
    project_res = client.post(
        "/iaec/project",
        json={
            "title": "Requisition Test Project",
            "investigator_name": "Dr. Request",
            "protocol_number": "REQ-001",
            "approval_date": "2026-01-01",
            "status": "approved",
        },
        headers=iaec_auth_headers,
    )
    assert project_res.status_code == 200, project_res.text
    project_id = project_res.json()["id"]

    db = SessionLocal()
    try:
        species = Species(name=f"ReqSpecies-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)

        strain = Strain(name=f"ReqStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
    finally:
        db.close()

    payload = {
        "protocol_id": project_id,
        "date": "2026-01-02",
        "purpose": "Testing requisition",
        "items": [
            {"species_id": species.id, "strain_id": strain.id, "requested_count": 2}
        ]
    }
    resp = client.post("/iaec/requisition", json=payload, headers=staff_auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None

    req_id = data.get("id")
    resp2 = client.get(f"/iaec/requisition/{req_id}", headers=staff_auth_headers)
    assert resp2.status_code == 200
    got = resp2.json()
    assert got.get("id") == req_id
