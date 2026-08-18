def test_admin_can_manage_species_and_strains(client, admin_auth_headers):
    species_res = client.post(
        "/admin/masters/species",
        json={"name": "Guinea Pig"},
        headers=admin_auth_headers,
    )
    assert species_res.status_code == 201, species_res.text
    species_id = species_res.json()["id"]

    strain_res = client.post(
        "/admin/masters/strains",
        json={"species_id": species_id, "name": "Dunkin Hartley"},
        headers=admin_auth_headers,
    )
    assert strain_res.status_code == 201, strain_res.text
    assert strain_res.json()["name"] == "Dunkin Hartley"

    list_res = client.get("/admin/masters/species", headers=admin_auth_headers)
    assert list_res.status_code == 200
    assert any(row["name"] == "Guinea Pig" for row in list_res.json())
