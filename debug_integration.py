from fastapi.testclient import TestClient
from main import app
from database.database import SessionLocal
from database.lmcpafm_models import Species, Strain, Animal

client = TestClient(app)

# Initialize DB
from database.database import init_db
init_db()

# 1 create project
proj_payload = {
    "title": "Integration Project",
    "investigator_name": "Dr. Integrate",
    "protocol_number": "INT-001",
    "approval_date": "2026-02-01",
    "status": "approved",
}
resp = client.post("/iaec/project", json=proj_payload)
print('project status', resp.status_code, resp.text)
project = resp.json()
project_id = project['id']

# 2 insert species/strain/animals
db = SessionLocal()
sp = Species(name='TestSpecies')
db.add(sp)
db.commit()
db.refresh(sp)
st = Strain(name='TestStrain', species_id=sp.id)
db.add(st)
db.commit()
db.refresh(st)
animals=[]
for i in range(3):
    a=Animal(species_id=sp.id, strain_id=st.id, status='available')
    db.add(a)
    animals.append(a)
db.commit()
for a in animals:
    db.refresh(a)
db.close()

# 3 requisition
req_payload = {
    "protocol_id": project_id,
    "requester_name": "Alice",
    "requester_role": "Researcher",
    "date": "2026-02-10",
    "purpose": "Integration test requisition",
    "items": [{"species_id": sp.id, "strain_id": st.id, "requested_count": 2}],
}
resp = client.post('/iaec/requisition', json=req_payload)
print('req', resp.status_code, resp.text)
req = resp.json()
req_id = req['id']
req_item_id = req['items'][0]['id']

# 4 allocation
alloc_payload = {
    "requisition_id": req_id,
    "date": "2026-02-11",
    "allocated_by": "Bob",
    "remarks": "Allocating two animals",
    "items": [{"requisition_item_id": req_item_id, "allocated_count": 2, "remaining_count": 0}],
}
resp = client.post('/iaec/allocation', json=alloc_payload)
print('alloc', resp.status_code, resp.text)
alloc = resp.json()
alloc_id = alloc['id']
alloc_item = alloc['items'][0]
allocated_animal_ids = [a['id'] for a in alloc_item['animals']]

# 5 experiment
exp_payload = {
    "protocol_id": project_id,
    "allocation_id": alloc_id,
    "date": "2026-02-12",
    "performed_by": "Dr. Integrate",
    "purpose": "Integration experiment",
    "procedure": "Test procedure",
    "dose": "N/A",
    "observations": "None",
    "animals": [{"animal_id": allocated_animal_ids[0]}, {"animal_id": allocated_animal_ids[1]}],
}
resp = client.post('/experiment/', json=exp_payload)
print('exp', resp.status_code, resp.text)
print('exp json', resp.json() if resp.status_code==200 else resp.text)
