from uuid import uuid4


def test_admin_supply_inventory_workflow(client, staff_auth_headers, admin_auth_headers):
    suffix = uuid4().hex[:6]

    create_res = client.post(
        "/admin/facility/supplies/items",
        json={
            "name": f"Rodent Chow {suffix}",
            "category": "food",
            "unit": "bag",
            "reorder_level": 5,
            "initial_quantity": 10,
        },
        headers=admin_auth_headers,
    )
    assert create_res.status_code == 200, create_res.text
    item = create_res.json()
    assert item["quantity_on_hand"] == 10
    assert item["low_stock"] is False

    receive_res = client.post(
        "/admin/facility/supplies/transactions",
        json={
            "item_id": item["id"],
            "txn_type": "in",
            "quantity": 3,
            "date": "2026-07-28",
            "notes": "Delivery from vendor",
        },
        headers=admin_auth_headers,
    )
    assert receive_res.status_code == 200, receive_res.text

    usage_res = client.post(
        "/facility/supplies/transactions",
        json={
            "item_id": item["id"],
            "quantity": 9,
            "date": "2026-07-28",
            "notes": "Room A daily feed",
        },
        headers=staff_auth_headers,
    )
    assert usage_res.status_code == 200, usage_res.text
    assert usage_res.json()["txn_type"] == "out"

    items_res = client.get("/facility/supplies/items", headers=staff_auth_headers)
    assert items_res.status_code == 200
    updated = next(row for row in items_res.json() if row["id"] == item["id"])
    assert updated["quantity_on_hand"] == 4
    assert updated["low_stock"] is True

    overdraw_res = client.post(
        "/facility/supplies/transactions",
        json={
            "item_id": item["id"],
            "quantity": 10,
            "date": "2026-07-28",
        },
        headers=staff_auth_headers,
    )
    assert overdraw_res.status_code == 400

    txn_res = client.get("/admin/facility/supplies/transactions", headers=admin_auth_headers)
    assert txn_res.status_code == 200
    assert len(txn_res.json()) >= 3


def test_staff_cannot_create_supply_item(client, staff_auth_headers):
    response = client.post(
        "/admin/facility/supplies/items",
        json={"name": "Hidden Item", "category": "other", "unit": "each"},
        headers=staff_auth_headers,
    )
    assert response.status_code == 403
