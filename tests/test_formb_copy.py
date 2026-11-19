from uuid import uuid4

from database.database import SessionLocal
from database.lmcpafm_models import FormB, Species, Strain
from tests.formb_payloads import (
    step1_body,
    study_plan_body,
    upload_required_form_b_attachments,
    wizard_steps_after_step1,
)
from tests.test_formb_wizard_steps import (
    _complete_profile,
    _register_and_login,
    _save_steps_2_to_7,
    _start_form_b,
)


def test_copy_submitted_form_b_creates_editable_draft(client, monkeypatch):
    headers, payload = _register_and_login(client, monkeypatch)
    _complete_profile(client, headers)
    source_id = _start_form_b(client, headers, payload)

    suffix = uuid4().hex[:4]
    species_name = f"RatCopy-{suffix}"
    strain_name = f"WistarCopy-{suffix}"
    with SessionLocal() as db:
        species = Species(name=species_name)
        db.add(species)
        db.flush()
        db.add(Strain(name=strain_name, species_id=species.id))
        db.commit()
        species_id = species.id
        strain_id = species.id

    with SessionLocal() as db:
        strain = db.query(Strain).filter(Strain.name == strain_name).first()
        strain_id = strain.id

    _save_steps_2_to_7(client, headers, source_id, species_name, strain_name)
    upload_required_form_b_attachments(client, headers, source_id)
    submit_res = client.post("/formb/submit", json={"form_b_id": source_id}, headers=headers)
    assert submit_res.status_code == 200, submit_res.text

    sources_res = client.get("/formb/copy-sources", headers=headers)
    assert sources_res.status_code == 200, sources_res.text
    sources = sources_res.json()
    assert any(row["form_b_id"] == source_id for row in sources)

    copy_res = client.post("/formb/copy", json={"source_form_b_id": source_id}, headers=headers)
    assert copy_res.status_code == 200, copy_res.text
    copied = copy_res.json()
    assert copied["id"] != source_id
    assert copied["source_form_b_id"] == source_id
    assert copied["attachments_not_copied"] is True

    review = client.get(f"/formb/{copied['id']}/review", headers=headers).json()
    assert review["submitted"] is False
    assert review["step2"]["title"] == "Pain study"
    assert "Renewal/amendment" in review["step2"]["summary"]
    assert review["step3"]["requirements"][0]["species"] == species_name

    with SessionLocal() as db:
        new_form = db.query(FormB).filter(FormB.id == copied["id"]).first()
        assert new_form is not None
        assert new_form.submitted_at is None
        assert len(new_form.study_phases) >= 1
