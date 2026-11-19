import { useCallback, useEffect, useState } from "react";
import {
  createAdminSupplyItem,
  getAdminSupplyItems,
  getAdminSupplyTransactions,
  recordAdminSupplyTransaction,
  updateAdminSupplyItem,
  type AdminSupplyItem,
  type AdminSupplyTransaction,
} from "../../api/adminFacilityApi";
import {
  getStaffFacilityRooms,
  getSupplyItems,
  getSupplyTransactions,
  recordSupplyUsage,
} from "../../api/facilityApi";
import type { FacilityRoom, SupplyItem, SupplyTransaction } from "../../api/facilityTypes";
import { SUPPLY_CATEGORIES, SUPPLY_UNITS } from "../../constants/supplyCategories";
import { getApiErrorMessage } from "../../api/errors";
import { PageSection } from "../common/PageSection";
import { DataTable } from "../tables/DataTable";
import { formatDisplayDate } from "../../utils/dateFormat";

type PanelMode = "staff" | "admin";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatQty(value: number, unit: string): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${rounded} ${unit}`;
}

interface SupplyInventoryPanelProps {
  mode: PanelMode;
}

export function SupplyInventoryPanel({ mode }: SupplyInventoryPanelProps) {
  const isAdmin = mode === "admin";
  const [items, setItems] = useState<Array<SupplyItem | AdminSupplyItem>>([]);
  const [transactions, setTransactions] = useState<Array<SupplyTransaction | AdminSupplyTransaction>>([]);
  const [rooms, setRooms] = useState<FacilityRoom[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [itemForm, setItemForm] = useState({
    name: "",
    category: "food",
    unit: "bag",
    reorder_level: "5",
    initial_quantity: "0",
    notes: "",
  });

  const [usageForm, setUsageForm] = useState({
    item_id: "",
    quantity: "",
    date: todayIso(),
    notes: "",
    room_id: "",
  });

  const [receiveForm, setReceiveForm] = useState({
    item_id: "",
    quantity: "",
    date: todayIso(),
    notes: "",
  });

  const loadAll = useCallback(async () => {
    const [itemData, txnData, roomData] = await Promise.all([
      isAdmin ? getAdminSupplyItems() : getSupplyItems(),
      isAdmin ? getAdminSupplyTransactions() : getSupplyTransactions(),
      getStaffFacilityRooms(),
    ]);
    setItems(itemData);
    setTransactions(txnData);
    setRooms(roomData);
  }, [isAdmin]);

  useEffect(() => {
    void loadAll().catch((error) => setMessage(getApiErrorMessage(error)));
  }, [loadAll]);

  async function handleCreateItem() {
    try {
      setBusy(true);
      setMessage(null);
      await createAdminSupplyItem({
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit,
        reorder_level: Number(itemForm.reorder_level) || 0,
        initial_quantity: Number(itemForm.initial_quantity) || 0,
        notes: itemForm.notes.trim() || undefined,
      });
      setItemForm({
        name: "",
        category: "food",
        unit: "bag",
        reorder_level: "5",
        initial_quantity: "0",
        notes: "",
      });
      setMessage("Supply item created.");
      await loadAll();
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleUsage() {
    try {
      setBusy(true);
      setMessage(null);
      const payload = {
        item_id: Number(usageForm.item_id),
        quantity: Number(usageForm.quantity),
        date: usageForm.date,
        notes: usageForm.notes.trim() || undefined,
        room_id: usageForm.room_id ? Number(usageForm.room_id) : null,
      };
      if (isAdmin) {
        await recordAdminSupplyTransaction({ ...payload, txn_type: "out" });
      } else {
        await recordSupplyUsage(payload);
      }
      setUsageForm((prev) => ({ ...prev, quantity: "", notes: "" }));
      setMessage("Usage recorded.");
      await loadAll();
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleReceive() {
    try {
      setBusy(true);
      setMessage(null);
      await recordAdminSupplyTransaction({
        item_id: Number(receiveForm.item_id),
        txn_type: "in",
        quantity: Number(receiveForm.quantity),
        date: receiveForm.date,
        notes: receiveForm.notes.trim() || undefined,
      });
      setReceiveForm((prev) => ({ ...prev, quantity: "", notes: "" }));
      setMessage("Stock received.");
      await loadAll();
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(item: AdminSupplyItem) {
    try {
      setBusy(true);
      await updateAdminSupplyItem(item.id, { active: !item.active });
      await loadAll();
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const lowStockCount = items.filter((item) => item.low_stock).length;

  return (
    <>
      {lowStockCount > 0 ? (
        <div className="info-card compact-info-card warning-info-card">
          <strong>{lowStockCount} item(s) at or below reorder level</strong>
        </div>
      ) : null}

      {message ? <p className="success-text">{message}</p> : null}

      <PageSection title="On-hand stock">
        <DataTable
          columns={[
            { header: "Item", cell: (row) => row.name },
            { header: "Category", cell: (row) => row.category },
            {
              header: "On hand",
              cell: (row) => (
                <span className={row.low_stock ? "low-stock-qty" : undefined}>
                  {formatQty(row.quantity_on_hand, row.unit)}
                </span>
              ),
            },
            { header: "Reorder at", cell: (row) => formatQty(row.reorder_level, row.unit) },
            {
              header: "Status",
              cell: (row) => (
                <span className={row.low_stock ? "status-badge warning" : "status-badge ok"}>
                  {row.low_stock ? "Low stock" : "OK"}
                </span>
              ),
            },
            ...(isAdmin
              ? [
                  {
                    header: "Active",
                    cell: (row: AdminSupplyItem) => (
                      <button
                        type="button"
                        className="btn-secondary btn-small"
                        disabled={busy}
                        onClick={() => void handleToggleActive(row)}
                      >
                        {row.active ? "Deactivate" : "Activate"}
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
          rows={items}
          emptyText="No supply items yet. Admin can add food, bedding, cages, and IVC consumables."
        />
      </PageSection>

      {isAdmin ? (
        <PageSection title="Add supply item">
          <div className="form-grid">
            <label>
              Name
              <input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            </label>
            <label>
              Category
              <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
                {SUPPLY_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit
              <select value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}>
                {SUPPLY_UNITS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reorder level
              <input
                type="number"
                min={0}
                step="any"
                value={itemForm.reorder_level}
                onChange={(e) => setItemForm({ ...itemForm, reorder_level: e.target.value })}
              />
            </label>
            <label>
              Initial quantity
              <input
                type="number"
                min={0}
                step="any"
                value={itemForm.initial_quantity}
                onChange={(e) => setItemForm({ ...itemForm, initial_quantity: e.target.value })}
              />
            </label>
            <label className="full-width">
              Notes
              <input value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
            </label>
            <button
              type="button"
              className="btn"
              disabled={busy || !itemForm.name.trim()}
              onClick={() => void handleCreateItem()}
            >
              Add item
            </button>
          </div>
        </PageSection>
      ) : null}

      <PageSection title="Log usage (OUT)">
        <div className="form-grid">
          <label>
            Item
            <select value={usageForm.item_id} onChange={(e) => setUsageForm({ ...usageForm, item_id: e.target.value })}>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatQty(item.quantity_on_hand, item.unit)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min={0.01}
              step="any"
              value={usageForm.quantity}
              onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })}
            />
          </label>
          <label>
            Room (optional)
            <select value={usageForm.room_id} onChange={(e) => setUsageForm({ ...usageForm, room_id: e.target.value })}>
              <option value="">Not room-specific</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={usageForm.date} onChange={(e) => setUsageForm({ ...usageForm, date: e.target.value })} />
          </label>
          <label className="full-width">
            Notes
            <input value={usageForm.notes} onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })} />
          </label>
          <button
            type="button"
            className="btn"
            disabled={busy || !usageForm.item_id || !usageForm.quantity}
            onClick={() => void handleUsage()}
          >
            Record usage
          </button>
        </div>
      </PageSection>

      {isAdmin ? (
        <PageSection title="Receive stock (IN)">
          <div className="form-grid">
            <label>
              Item
              <select
                value={receiveForm.item_id}
                onChange={(e) => setReceiveForm({ ...receiveForm, item_id: e.target.value })}
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity received
              <input
                type="number"
                min={0.01}
                step="any"
                value={receiveForm.quantity}
                onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={receiveForm.date}
                onChange={(e) => setReceiveForm({ ...receiveForm, date: e.target.value })}
              />
            </label>
            <label className="full-width">
              Notes
              <input value={receiveForm.notes} onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })} />
            </label>
            <button
              type="button"
              className="btn"
              disabled={busy || !receiveForm.item_id || !receiveForm.quantity}
              onClick={() => void handleReceive()}
            >
              Receive stock
            </button>
          </div>
        </PageSection>
      ) : null}

      <PageSection title="Recent transactions">
        <DataTable
          columns={[
            { header: "Date", cell: (row) => formatDisplayDate(row.date) },
            { header: "Item", cell: (row) => row.item_name },
            { header: "Type", cell: (row) => row.txn_type.toUpperCase() },
            { header: "Qty", cell: (row) => formatQty(row.quantity, row.item_unit) },
            { header: "Room", cell: (row) => row.room_code ?? "-" },
            { header: "Notes", cell: (row) => row.notes ?? "-" },
          ]}
          rows={transactions.slice(0, 50)}
          emptyText="No supply transactions yet."
        />
      </PageSection>
    </>
  );
}
