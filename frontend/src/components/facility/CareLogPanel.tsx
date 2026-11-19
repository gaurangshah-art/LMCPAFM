import { useCallback, useEffect, useState } from "react";
import {
  createStaffCareLog,
  getStaffCareLogs,
  getStaffFacilityCages,
  getStaffFacilityRooms,
} from "../../api/facilityApi";
import type { FacilityCareLog, FacilityCage, FacilityRoom } from "../../api/facilityTypes";
import { CARE_LOG_TYPES, ROOM_ONLY_CARE_LOG_TYPES } from "../../constants/careLogTypes";
import { getApiErrorMessage } from "../../api/errors";
import { PageSection } from "../common/PageSection";
import { DataTable } from "../tables/DataTable";
import { formatDisplayDate } from "../../utils/dateFormat";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CareLogPanel() {
  const [rooms, setRooms] = useState<FacilityRoom[]>([]);
  const [cages, setCages] = useState<FacilityCage[]>([]);
  const [careLogs, setCareLogs] = useState<FacilityCareLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    log_type: "feeding",
    room_id: "",
    cage_id: "",
    date: todayIso(),
    details: "",
    performed_by_name: "",
  });

  const roomRequired = ROOM_ONLY_CARE_LOG_TYPES.has(form.log_type as never);

  const loadData = useCallback(async () => {
    const [roomData, cageData, logData] = await Promise.all([
      getStaffFacilityRooms(),
      getStaffFacilityCages(),
      getStaffCareLogs(),
    ]);
    setRooms(roomData);
    setCages(cageData);
    setCareLogs(logData);
  }, []);

  useEffect(() => {
    void loadData().catch((error) => setMessage(getApiErrorMessage(error)));
  }, [loadData]);

  async function handleSubmit() {
    try {
      setBusy(true);
      setMessage(null);
      await createStaffCareLog({
        log_type: form.log_type,
        room_id: form.room_id ? Number(form.room_id) : null,
        cage_id: roomRequired ? null : form.cage_id ? Number(form.cage_id) : null,
        date: form.date,
        details: form.details.trim(),
        performed_by_name: form.performed_by_name.trim() || undefined,
      });
      setForm((prev) => ({ ...prev, details: "" }));
      setMessage("Care log saved.");
      await loadData();
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const filteredCages = form.room_id
    ? cages.filter((cage) => cage.room_id === Number(form.room_id))
    : cages;

  return (
    <>
      <PageSection title="Log feeding, cleaning, or sanitation">
        <div className="form-grid">
          <label>
            Type
            <select
              value={form.log_type}
              onChange={(e) => setForm({ ...form, log_type: e.target.value, cage_id: "" })}
            >
              {CARE_LOG_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Room {roomRequired ? "(required)" : "(optional)"}
            <select
              value={form.room_id}
              onChange={(e) => setForm({ ...form, room_id: e.target.value, cage_id: "" })}
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.code} — {room.name}
                </option>
              ))}
            </select>
          </label>
          {!roomRequired ? (
            <label>
              Cage (optional)
              <select value={form.cage_id} onChange={(e) => setForm({ ...form, cage_id: e.target.value })}>
                <option value="">Room-level only</option>
                {filteredCages.map((cage) => (
                  <option key={cage.id} value={cage.id}>
                    {cage.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Date
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Performed by (optional)
            <input
              value={form.performed_by_name}
              onChange={(e) => setForm({ ...form, performed_by_name: e.target.value })}
              placeholder="Defaults to your account name"
            />
          </label>
          <label className="full-width">
            Details
            <textarea
              rows={2}
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              placeholder="Brief note, e.g. standard chow, autoclave load #2"
            />
          </label>
          <button type="button" className="btn" disabled={busy || !form.details.trim()} onClick={() => void handleSubmit()}>
            {busy ? "Saving..." : "Save log"}
          </button>
        </div>
        {message ? <p className={message.endsWith(".") && !message.includes("Error") ? "success-text" : "error-text"}>{message}</p> : null}
      </PageSection>

      <PageSection title="Recent logs">
        <DataTable
          columns={[
            { header: "Date", cell: (row) => formatDisplayDate(row.date) },
            { header: "Type", cell: (row) => row.log_type },
            { header: "Room", cell: (row) => row.room_code ?? "-" },
            { header: "Cage", cell: (row) => row.cage_label ?? "-" },
            { header: "By", cell: (row) => row.performed_by_name },
            { header: "Details", cell: (row) => row.details },
          ]}
          rows={careLogs.slice(0, 50)}
          emptyText="No care logs yet."
        />
      </PageSection>
    </>
  );
}
