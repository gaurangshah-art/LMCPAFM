from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Animal, Species, Strain

from tests.planning_helpers import create_experiment_group, seed_project_animal_cap


def _create_approved_project(client, iaec_auth_headers, protocol_number: str):
    response = client.post(
        "/iaec/project",
        json={
            "title": "Certificate Test Project",
            "investigator_name": "Dr. Cert",
            "protocol_number": protocol_number,
            "approval_date": "2026-01-01",
            "status": "approved",
        },
        headers=iaec_auth_headers,
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def test_signed_certificate_upload_requires_digital_final(client, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers, "CERT-SIGNED-BLOCK")

    upload_res = client.post(
        f"/iaec/project/{project_id}/certificate/signed",
        files={"file": ("signed_cert.pdf", b"%PDF-1.4", "application/pdf")},
        headers=iaec_auth_headers,
    )
    assert upload_res.status_code == 400
    assert "experiment records are complete" in upload_res.json()["detail"].lower()


def test_provisional_certificate_before_experiments(client, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers, "CERT-PROV-001")

    response = client.get(f"/iaec/project/{project_id}/certificate", headers=iaec_auth_headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["certificate_type"] == "provisional"
    assert data["is_final"] is False
    assert data["publication_ready"] is False
    assert data["work_state"] == "not_initiated"
    assert "NOT valid for journal publication" in (data["disclaimer"] or "")


def test_final_certificate_after_complete_workflow(client, staff_auth_headers, iaec_auth_headers):
    project_id = _create_approved_project(client, iaec_auth_headers, "CERT-FINAL-001")
    suffix = uuid4().hex[:8]

    db = SessionLocal()
    try:
        species = Species(name=f"CertSpecies-{suffix}")
        db.add(species)
        db.commit()
        db.refresh(species)
        strain = Strain(name=f"CertStrain-{suffix}", species_id=species.id)
        db.add(strain)
        db.commit()
        db.refresh(strain)
        seed_project_animal_cap(db, project_id, cap=2, species_id=species.id, strain_id=strain.id)
        for _ in range(2):
            db.add(Animal(species_id=species.id, strain_id=strain.id, status="available"))
        db.commit()
    finally:
        db.close()

    group_res = create_experiment_group(client, iaec_auth_headers, project_id, "Cert Group", 2)
    assert group_res.status_code == 200, group_res.text
    group_id = group_res.json()["id"]

    req_res = client.post(
        "/iaec/requisition",
        json={
            "protocol_id": project_id,
            "date": "2026-01-02",
            "purpose": "Certificate workflow",
            "items": [{"species_id": species.id, "strain_id": strain.id, "requested_count": 2}],
        },
        headers=staff_auth_headers,
    )
    assert req_res.status_code == 200, req_res.text
    req_item_id = req_res.json()["items"][0]["id"]

    alloc_res = client.post(
        "/iaec/allocation",
        json={
            "requisition_id": req_res.json()["id"],
            "date": "2026-01-03",
            "allocated_by": "Staff",
            "remarks": "Allocate",
            "items": [{"requisition_item_id": req_item_id, "allocated_count": 2, "remaining_count": 0}],
        },
        headers=staff_auth_headers,
    )
    assert alloc_res.status_code == 200, alloc_res.text
    alloc_id = alloc_res.json()["id"]
    animal_ids = [animal["id"] for animal in alloc_res.json()["items"][0]["animals"]]

    provisional = client.get(f"/iaec/project/{project_id}/certificate", headers=iaec_auth_headers)
    assert provisional.status_code == 200
    assert provisional.json()["certificate_type"] == "provisional"

    exp_res = client.post(
        "/experiment/",
        json={
            "protocol_id": project_id,
            "allocation_id": alloc_id,
            "experiment_group_id": group_id,
            "date": "2026-01-04",
            "performed_by": "Dr. Cert",
            "purpose": "Certificate test",
            "procedure": "Procedure",
            "dose": "1 mg/kg",
            "observations": "Done",
            "animals": [{"animal_id": animal_ids[0]}, {"animal_id": animal_ids[1]}],
        },
    )
    assert exp_res.status_code == 200, exp_res.text

    final = client.get(f"/iaec/project/{project_id}/certificate", headers=iaec_auth_headers)
    assert final.status_code == 200, final.text
    data = final.json()
    assert data["certificate_type"] == "final"
    assert data["is_final"] is True
    assert data["publication_ready"] is False
    assert data["work_state"] == "completed"
    assert data["final_attestation"]
    assert data["completion_date"]

    pdf_res = client.get(f"/iaec/project/{project_id}/certificate/download", headers=iaec_auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")
    assert "IAEC_Final_Certificate" in pdf_res.headers["content-disposition"]

    upload_res = client.post(
        f"/iaec/project/{project_id}/certificate/signed",
        files={"file": ("signed_cert.pdf", b"%PDF-1.4 signed hard copy", "application/pdf")},
        headers=iaec_auth_headers,
    )
    assert upload_res.status_code == 200, upload_res.text
    signed = upload_res.json()
    assert signed["original_filename"] == "signed_cert.pdf"

    final_after_upload = client.get(f"/iaec/project/{project_id}/certificate", headers=iaec_auth_headers)
    assert final_after_upload.json()["publication_ready"] is True

    signed_download = client.get(
        f"/iaec/project/{project_id}/certificate/signed/download",
        headers=iaec_auth_headers,
    )
    assert signed_download.status_code == 200
    assert signed_download.content == b"%PDF-1.4 signed hard copy"
