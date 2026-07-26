from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient

from database.database import SessionLocal, init_db
from database.lmcpafm_models import Animal, Cage, Procurement, Species, Strain
from main import app


def test_form_c_data_endpoint():
    init_db()
    db = SessionLocal()

    sp = Species(name=f"Sp-{uuid4().hex[:4]}")
    db.add(sp)
    db.commit()
    db.refresh(sp)

    st = Strain(name="Wistar", species_id=sp.id)
    db.add(st)
    db.commit()
    db.refresh(st)

    cage = Cage(label=f"C-{uuid4().hex[:4]}", location="R1")
    db.add(cage)
    db.commit()
    db.refresh(cage)

    db.add(
        Animal(
            species_id=sp.id,
            strain_id=st.id,
            cage_id=cage.id,
            status="available",
        )
    )
    db.add(
        Procurement(
            species_id=sp.id,
            strain_id=st.id,
            count=5,
            date=date.today(),
        )
    )
    db.commit()
    db.close()

    client = TestClient(app)
    response = client.get("/inventory/form-c-data")
    assert response.status_code == 200
    payload = response.json()
    assert "stock_rows" in payload
    assert "acquisition_rows" in payload
    assert "supplied_rows" in payload
    assert len(payload["acquisition_rows"]) >= 1
