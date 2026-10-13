import { useCallback, useEffect, useState } from "react";
import { getPiDashboard, getRoomDashboard, getStrainDashboard } from "../../api/facilityApi";
import type {
  PiDashboardProtocol,
  RoomDashboardRow,
  StrainDashboardRow,
} from "../../api/facilityTypes";
import { getProjects } from "../../api/iaecApi";
import type { IAECProject } from "../../api/types";
import { getApiErrorMessage } from "../../api/errors";
import { ErrorAlert } from "../common/ErrorAlert";
import { LoadingState } from "../common/LoadingState";
import { PageSection } from "../common/PageSection";
import { DataTable } from "../tables/DataTable";
import { formatDisplayDate } from "../../utils/dateFormat";

type DashboardTab = "pi" | "rooms" | "strains";

export function FacilityDashboardPanel() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("rooms");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [piRows, setPiRows] = useState<PiDashboardProtocol[]>([]);
  const [roomRows, setRoomRows] = useState<RoomDashboardRow[]>([]);
  const [strainRows, setStrainRows] = useState<StrainDashboardRow[]>([]);
  const [staleDays, setStaleDays] = useState(7);
  const [protocolFilter, setProtocolFilter] = useState("");
  const [projects, setProjects] = useState<IAECProject[]>([]);

  const loadDashboards = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const protocolId = protocolFilter ? Number(protocolFilter) : undefined;
      const [piData, roomData, strainData] = await Promise.all([
        getPiDashboard(protocolId),
        getRoomDashboard(staleDays),
        getStrainDashboard(),
      ]);
      setPiRows(piData.protocols);
      setRoomRows(roomData.rooms);
      setStrainRows(strainData.strains);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [protocolFilter, staleDays]);

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

  useEffect(() => {
    void getProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  if (loading) {
    return <LoadingState label="Loading facility dashboards..." />;
  }

  return (
    <div>
      {error ? <ErrorAlert message={error} /> : null}

      <nav className="tab-nav nested-tab-nav">
        {(
          [
            ["rooms", "By room"],
            ["pi", "By PI / protocol"],
            ["strains", "By strain"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "rooms" ? (
        <PageSection title="Room census & care status">
          <div className="form-grid compact-form-grid">
            <label>
              Flag stale if no care log in (days)
              <input
                type="number"
                min={1}
                max={90}
                value={staleDays}
                onChange={(e) => setStaleDays(Number(e.target.value) || 7)}
              />
            </label>
            <div className="form-actions-inline">
              <button type="button" className="btn-secondary" onClick={() => void loadDashboards()}>
                Refresh
              </button>
            </div>
          </div>
          <DataTable
            columns={[
              { header: "Room", cell: (row) => row.room_code },
              { header: "Animals", cell: (row) => row.animal_count },
              { header: "Cages", cell: (row) => `${row.occupied_cages}/${row.cage_count}` },
              { header: "Capacity", cell: (row) => row.total_capacity },
              { header: "Quarantine", cell: (row) => row.quarantine_count },
              { header: "Available", cell: (row) => row.available_count },
              { header: "Allocated", cell: (row) => row.allocated_count },
              {
                header: "Last care",
                cell: (row) => (row.last_care_date ? formatDisplayDate(row.last_care_date) : "Never"),
              },
              {
                header: "Status",
                cell: (row) => (
                  <span className={row.care_stale ? "status-badge warning" : "status-badge ok"}>
                    {row.care_stale ? "Needs attention" : "OK"}
                  </span>
                ),
              },
            ]}
            rows={roomRows}
            emptyText="No rooms configured yet."
          />
        </PageSection>
      ) : null}

      {activeTab === "pi" ? (
        <PageSection title="PI / protocol animal census">
          <div className="form-grid compact-form-grid">
            <label>
              Filter by protocol
              <select value={protocolFilter} onChange={(e) => setProtocolFilter(e.target.value)}>
                <option value="">All protocols</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.protocol_number ?? project.title} — {project.principal_investigator ?? project.investigator_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DataTable
            columns={[
              {
                header: "Protocol",
                cell: (row) => row.protocol_number ?? `#${row.protocol_id}`,
              },
              { header: "PI", cell: (row) => row.principal_investigator ?? "-" },
              { header: "Title", cell: (row) => row.title },
              { header: "Live animals", cell: (row) => row.total_animals },
              { header: "Allocated", cell: (row) => row.allocated_count },
              { header: "In experiment", cell: (row) => row.in_experiment_count },
              { header: "Caged", cell: (row) => row.caged_count },
              { header: "Uncaged", cell: (row) => row.uncaged_count },
              {
                header: "Groups",
                cell: (row) =>
                  row.groups.length
                    ? row.groups.map((g) => `${g.group_name} (${g.animal_count})`).join(", ")
                    : "-",
              },
            ]}
            rows={piRows}
            emptyText="No protocol-linked animals yet."
          />
        </PageSection>
      ) : null}

      {activeTab === "strains" ? (
        <PageSection title="Strain inventory">
          <DataTable
            columns={[
              { header: "Species", cell: (row) => row.species_name ?? "-" },
              { header: "Strain", cell: (row) => row.strain_name },
              { header: "Live", cell: (row) => row.total_animals },
              { header: "Available", cell: (row) => row.available_count },
              { header: "Quarantine", cell: (row) => row.quarantine_count },
              { header: "Allocated", cell: (row) => row.allocated_count },
              { header: "In experiment", cell: (row) => row.in_experiment_count },
              { header: "Deceased", cell: (row) => row.deceased_count },
            ]}
            rows={strainRows}
            emptyText="No strains with animals yet."
          />
        </PageSection>
      ) : null}
    </div>
  );
}
