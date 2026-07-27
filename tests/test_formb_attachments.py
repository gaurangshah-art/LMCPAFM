from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain
from tests.formb_payloads import (
    step1_body,
    upload_required_form_b_attachments,
    wizard_steps_after_step1,
)


def _register_and_login(client, monkeypatch):
    monkeypatch.setenv("LMCP_INSTITUTIONAL_EMAIL_DOMAINS", "lmcp.ac.in")
    suffix = uuid4().hex[:8]
    payload = {
        "name": "Dr. Attachment Test",
        "email": f"attach_{suffix}@lmcp.ac.in",
        "password": "StrongPass@123",
    }
    client.post("/auth/register-investigator", json=payload)
    login_res = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    client.put(
        "/investigator-profile/me",
        json={
            "institution_name": "LMCP",
            "department": "Pharmacology",
            "designation": "Assistant Professor",
            "qualification": "PhD",
            "is_lmcp_faculty": True,
        },
        headers=headers,
    )
    return headers, payload


def _start_form_b(client, headers, payload):
    start_res = client.post("/formb/start", headers=headers)
    form_b_id = start_res.json()["id"]
    client.post("/formb/step-1", json=step1_body(form_b_id, payload), headers=headers)
    return form_b_id


def _complete_wizard_steps(client, headers, form_b_id: int) -> None:
    suffix = uuid4().hex[:4]
    species_name = f"Rat-{suffix}"
    strain_name = f"Wistar-{suffix}"
    with SessionLocal() as db:
        species = Species(name=species_name)
        db.add(species)
        db.flush()
        db.add(Strain(name=strain_name, species_id=species.id))
        db.commit()

    for path, body in wizard_steps_after_step1(form_b_id):
        if path == "/formb/step-3":
            body = {
                **body,
                "requirements": [
                    {**body["requirements"][0], "species": species_name, "strain": strain_name},
                ],
            }
        res = client.post(path, json=body, headers=headers)
        assert res.status_code == 200, res.text


def test_form_b_attachment_upload_list_download_delete(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    form_b_id = _start_form_b(client, headers, payload)

    upload_res = client.post(
        f"/formb/{form_b_id}/attachments?category=funding_proof",
        files={"file": ("grant-letter.pdf", b"%PDF-1.4 grant", "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code == 200, upload_res.text
    attachment = upload_res.json()
    assert attachment["category"] == "funding_proof"
    assert attachment["original_filename"] == "grant-letter.pdf"

    list_res = client.get(f"/formb/{form_b_id}/attachments", headers=headers)
    assert list_res.status_code == 200, list_res.text
    assert len(list_res.json()) == 1

    download_res = client.get(
        f"/formb/{form_b_id}/attachments/{attachment['id']}",
        headers=headers,
    )
    assert download_res.status_code == 200, download_res.text
    assert download_res.content.startswith(b"%PDF")

    replace_res = client.post(
        f"/formb/{form_b_id}/attachments?category=funding_proof",
        files={"file": ("updated-grant.pdf", b"%PDF-1.4 updated", "application/pdf")},
        headers=headers,
    )
    assert replace_res.status_code == 200, replace_res.text
    assert replace_res.json()["original_filename"] == "updated-grant.pdf"
    assert len(client.get(f"/formb/{form_b_id}/attachments", headers=headers).json()) == 1

    delete_res = client.delete(
        f"/formb/{form_b_id}/attachments/{replace_res.json()['id']}",
        headers=headers,
    )
    assert delete_res.status_code == 200, delete_res.text
    assert client.get(f"/formb/{form_b_id}/attachments", headers=headers).json() == []


def test_form_b_submit_requires_mandatory_attachments(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    form_b_id = _start_form_b(client, headers, payload)
    _complete_wizard_steps(client, headers, form_b_id)

    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 400
    assert "funding proof" in submit_res.json()["detail"].lower()

    upload_res = client.post(
        f"/formb/{form_b_id}/attachments?category=funding_proof",
        files={"file": ("funding-proof.pdf", b"%PDF-1.4 test content", "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code == 200, upload_res.text

    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 400
    assert "study plan annexure" in submit_res.json()["detail"].lower()

    upload_required_form_b_attachments(client, headers, form_b_id)
    submit_res = client.post("/formb/submit", json={"form_b_id": form_b_id}, headers=headers)
    assert submit_res.status_code == 200, submit_res.text
