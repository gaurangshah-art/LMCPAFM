from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session, joinedload

from crud.exceptions import CRUDNotFoundError, CRUDValidationError
from database.lmcpafm_models import FacilityRoom, SupplyItem, SupplyTransaction
from models.user import User
from schemas.schemas_supply import (
    SUPPLY_CATEGORIES,
    SUPPLY_TXN_TYPES,
    SupplyItemCreate,
    SupplyItemUpdate,
    SupplyStaffTransactionCreate,
    SupplyTransactionCreate,
)


def _normalize_category(category: str) -> str:
    value = category.strip().lower()
    if value not in SUPPLY_CATEGORIES:
        allowed = ", ".join(sorted(SUPPLY_CATEGORIES))
        raise CRUDValidationError(f"Category must be one of: {allowed}.")
    return value


def _normalize_txn_type(txn_type: str) -> str:
    value = txn_type.strip().lower()
    if value not in SUPPLY_TXN_TYPES:
        allowed = ", ".join(sorted(SUPPLY_TXN_TYPES))
        raise CRUDValidationError(f"Transaction type must be one of: {allowed}.")
    return value


def _item_to_read(item: SupplyItem) -> dict:
    reorder = float(item.reorder_level or 0)
    qty = float(item.quantity_on_hand or 0)
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "unit": item.unit,
        "reorder_level": reorder,
        "quantity_on_hand": qty,
        "active": item.active,
        "notes": item.notes,
        "low_stock": reorder > 0 and qty <= reorder,
    }


def _txn_to_read(row: SupplyTransaction) -> dict:
    return {
        "id": row.id,
        "item_id": row.item_id,
        "item_name": row.item.name if row.item else "",
        "item_category": row.item.category if row.item else "",
        "item_unit": row.item.unit if row.item else "",
        "txn_type": row.txn_type,
        "quantity": float(row.quantity),
        "date": row.date,
        "notes": row.notes,
        "room_id": row.room_id,
        "room_code": row.room.code if row.room else None,
        "created_at": row.created_at,
    }


def list_supply_items(db: Session, *, include_inactive: bool = False) -> list[dict]:
    query = db.query(SupplyItem).order_by(SupplyItem.category.asc(), SupplyItem.name.asc())
    if not include_inactive:
        query = query.filter(SupplyItem.active.is_(True))
    return [_item_to_read(item) for item in query.all()]


def create_supply_item(db: Session, payload: SupplyItemCreate) -> dict:
    category = _normalize_category(payload.category)
    if db.query(SupplyItem).filter(SupplyItem.name == payload.name.strip(), SupplyItem.category == category).first():
        raise CRUDValidationError(f"Supply item '{payload.name}' already exists in category '{category}'.")

    item = SupplyItem(
        name=payload.name.strip(),
        category=category,
        unit=payload.unit.strip() or "each",
        reorder_level=payload.reorder_level,
        quantity_on_hand=0,
        notes=payload.notes,
    )
    db.add(item)
    db.flush()

    if payload.initial_quantity > 0:
        db.add(
            SupplyTransaction(
                item_id=item.id,
                txn_type="in",
                quantity=payload.initial_quantity,
                date=date.today(),
                notes="Initial stock",
            )
        )
        item.quantity_on_hand = payload.initial_quantity

    db.commit()
    db.refresh(item)
    return _item_to_read(item)


def update_supply_item(db: Session, item_id: int, payload: SupplyItemUpdate) -> dict:
    item = db.query(SupplyItem).filter(SupplyItem.id == item_id).first()
    if item is None:
        raise CRUDNotFoundError("Supply item not found.")

    data = payload.model_dump(exclude_unset=True)
    if "category" in data and data["category"] is not None:
        data["category"] = _normalize_category(data["category"])
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()
    if "unit" in data and data["unit"] is not None:
        data["unit"] = data["unit"].strip() or item.unit

    new_name = data.get("name", item.name)
    new_category = data.get("category", item.category)
    if (new_name != item.name or new_category != item.category) and db.query(SupplyItem).filter(
        SupplyItem.name == new_name,
        SupplyItem.category == new_category,
        SupplyItem.id != item.id,
    ).first():
        raise CRUDValidationError(f"Supply item '{new_name}' already exists in category '{new_category}'.")

    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return _item_to_read(item)


def _apply_transaction(
    db: Session,
    user: User,
    *,
    item: SupplyItem,
    txn_type: str,
    quantity: float,
    txn_date,
    notes: str | None,
    room_id: int | None,
) -> SupplyTransaction:
    if room_id is not None and not db.query(FacilityRoom).filter(FacilityRoom.id == room_id).first():
        raise CRUDNotFoundError("Room not found.")

    if txn_type == "out":
        if float(item.quantity_on_hand) < quantity:
            raise CRUDValidationError(
                f"Insufficient stock for '{item.name}'. On hand: {item.quantity_on_hand} {item.unit}."
            )
        item.quantity_on_hand = float(item.quantity_on_hand) - quantity
    elif txn_type == "in":
        item.quantity_on_hand = float(item.quantity_on_hand) + quantity
    elif txn_type == "adjust":
        item.quantity_on_hand = quantity
    else:
        raise CRUDValidationError("Invalid transaction type.")

    row = SupplyTransaction(
        item_id=item.id,
        txn_type=txn_type,
        quantity=quantity,
        date=txn_date,
        notes=notes,
        room_id=room_id,
        recorded_by_user_id=user.id,
    )
    db.add(row)
    return row


def record_supply_transaction(db: Session, user: User, payload: SupplyTransactionCreate) -> dict:
    txn_type = _normalize_txn_type(payload.txn_type)
    item = db.query(SupplyItem).filter(SupplyItem.id == payload.item_id, SupplyItem.active.is_(True)).first()
    if item is None:
        raise CRUDNotFoundError("Supply item not found.")

    row = _apply_transaction(
        db,
        user,
        item=item,
        txn_type=txn_type,
        quantity=payload.quantity,
        txn_date=payload.date,
        notes=payload.notes,
        room_id=payload.room_id,
    )
    db.commit()
    db.refresh(row)
    row = (
        db.query(SupplyTransaction)
        .options(joinedload(SupplyTransaction.item), joinedload(SupplyTransaction.room))
        .filter(SupplyTransaction.id == row.id)
        .one()
    )
    return _txn_to_read(row)


def record_staff_supply_usage(db: Session, user: User, payload: SupplyStaffTransactionCreate) -> dict:
    return record_supply_transaction(
        db,
        user,
        SupplyTransactionCreate(
            item_id=payload.item_id,
            txn_type="out",
            quantity=payload.quantity,
            date=payload.date,
            notes=payload.notes,
            room_id=payload.room_id,
        ),
    )


def list_supply_transactions(
    db: Session,
    *,
    item_id: int | None = None,
    txn_type: str | None = None,
    limit: int = 100,
) -> list[dict]:
    query = (
        db.query(SupplyTransaction)
        .options(joinedload(SupplyTransaction.item), joinedload(SupplyTransaction.room))
        .order_by(SupplyTransaction.date.desc(), SupplyTransaction.id.desc())
    )
    if item_id is not None:
        query = query.filter(SupplyTransaction.item_id == item_id)
    if txn_type:
        query = query.filter(SupplyTransaction.txn_type == txn_type.strip().lower())
    return [_txn_to_read(row) for row in query.limit(limit).all()]
