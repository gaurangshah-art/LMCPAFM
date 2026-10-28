import { useCallback, useEffect, useState } from "react";
import {
  createEnvironmentLog,
  getEnvironmentLogs,
  getStaffFacilityRooms,
} from "../../api/facilityApi";
import type { FacilityEnvironmentLog, FacilityRoom } from "../../api/facilityTypes";
import { HVAC_STATUSES } from "../../constants/environmentLog";
import { getApiErrorMessage } from "../../api/errors";
import { PageSection } from "../common/PageSection";
import { DataTable } from "../tables/DataTable";
import { formatDisplayDate } from "../../utils/dateFormat";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface EnvironmentLogPanelProps {
  createLog?: (payload: {
    room_id: number;
    date: string;
    temperature_c?: number | null;
    humidity_pct?: number | null;
    hvac_status?: string;
    light_cycle?: string;
    notes?: string;
    performed_by_name?: string;
  }) => Promise<FacilityEnvironmentLog>;
  fetchLogs?: (params?: { room_id?: number; date?: string }) => Promise<FacilityEnvironmentLog[]>;
}

export function EnvironmentLogPanel({
  createLog = createEnvironmentLog,
  fetchLogs = getEnvironmentLogs,
}: EnvironmentLogPanelProps) {
  const [rooms, setRooms] = useState<FacilityRoom[]>([]);
  const [logs, setLogs] = useState<FacilityEnvironmentLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    room_id: "",
    date: todayIso(),
    temperature_c: "",
    humidity_pct: "",
    hvac_status: "normal",
    light_cycle: "",
    notes: "",
    performed_by_name: "",
  });

  const loadData = useCallback(async () => {
    const [roomData, logData] = await Promise.all([getStaffFacilityRooms(), fetchLogs()]);
    setRooms(roomData);
    setLogs(logData);
  }, [fetchLogs]);

  useEffect(() => {
    void loadData().catch((error) => setMessage(getApiErrorMessage(error)));
  }, [loadData]);

  async function handleSubmit() {
    try {
      setBusy(true);
      setMessage(null);
      await createLog({
        room_id: Number(form.room_id),
        date: form.date,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
        humidity_pct: form.humidity_pct ? Number(form.humidity_pct) : null,
        hvac_status: form.hvac_status,
        light_cycle: form.light_cycle.trim() || undefined,
        notes: form.notes.trim() || undefined,
        performed_by_name: form.performed_by_name.trim() || undefined,
      });
      setForm((prev) => ({
        ...prev,
        temperature_c: "",
        humidity_pct: "",
        light_cycle: "",
        notes: "",
      }));
      setMessage("Environment reading saved.");
      await loadData();
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    form.room_id &&
    (form.temperature_c || form.humidity_pct || form.notes.trim());

  return (
    <>
      <PageSection title="Room environment control (daily)">
        <p className="muted-text">
          Log temperature, humidity, HVAC status, and light cycle per room — typically once each morning.
        </p>
        <div className="form-grid">
          <label>
            Room
            <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.code} — {room.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>
            Temperature (°C)
            <input
              type="number"
              step="0.1"
              value={form.temperature_c}
              onChange={(e) => setForm({ ...form, temperature_c: e.target.value })}
              placeholder="e.g. 22.5"
            />
          </label>
          <label>
            Humidity (%)
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.humidity_pct}
              onChange={(e) => setForm({ ...form, humidity_pct: e.target.value })}
              placeholder="e.g. 55"
            />
          </label>
          <label>
            HVAC status
            <select value={form.hvac_status} onChange={(e) => setForm({ ...form, hvac_status: e.target.value })}>
              {HVAC_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Light cycle
            <input
              value={form.light_cycle}
              onChange={(e) => setForm({ ...form, light_cycle: e.target.value })}
              placeholder="e.g. 12:12 or 7am–7pm"
            />
          </label>
          <label>
            Recorded by (optional)
            <input
              value={form.performed_by_name}
              onChange={(e) => setForm({ ...form, performed_by_name: e.target.value })}
            />
          </label>
          <label className="full-width">
            Notes
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="IVC pressure check, filter change, alarm details..."
            />
          </label>
          <button type="button" className="btn" disabled={busy || !canSubmit} onClick={() => void handleSubmit()}>
            {busy ? "Saving..." : "Save reading"}
          </button>
        </div>
        {message ? <p className="success-text">{message}</p> : null}
      </PageSection>

      <PageSection title="Recent environment logs">
        <DataTable
          columns={[
            { header: "Date", cell: (row) => formatDisplayDate(row.date) },
            { header: "Room", cell: (row) => row.room_code ?? row.room_id },
            { header: "Temp °C", cell: (row) => row.temperature_c ?? "-" },
            { header: "RH %", cell: (row) => row.humidity_pct ?? "-" },
            { header: "HVAC", cell: (row) => row.hvac_status },
            { header: "Light", cell: (row) => row.light_cycle ?? "-" },
            { header: "Notes", cell: (row) => row.notes ?? "-" },
          ]}
          rows={logs.slice(0, 50)}
          emptyText="No environment readings yet."
        />
      </PageSection>
    </>
  );
}
