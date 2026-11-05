import { useCallback, useEffect, useState } from "react";
import { createAdminEnvironmentLog, getAdminEnvironmentLogs, getAdminOperationsSummary } from "../../api/adminFacilityApi";
import { getOperationsSummary } from "../../api/facilityApi";
import type { FacilityOperationsSummary } from "../../api/facilityTypes";
import { getApiErrorMessage } from "../../api/errors";
import { ErrorAlert } from "../common/ErrorAlert";
import { LoadingState } from "../common/LoadingState";
import { PageSection } from "../common/PageSection";
import { DataTable } from "../tables/DataTable";
import { CareLogPanel } from "./CareLogPanel";
import { EnvironmentLogPanel } from "./EnvironmentLogPanel";
import { SupplyInventoryPanel } from "./SupplyInventoryPanel";
import { formatDisplayDate } from "../../utils/dateFormat";

type QuickLogTab = "care" | "supplies" | "environment";

interface FacilityOperationsHubProps {
  mode: "staff" | "admin";
  fetchSummary?: (staleDays?: number) => Promise<FacilityOperationsSummary>;
}

export function FacilityOperationsHub({
  mode,
  fetchSummary,
}: FacilityOperationsHubProps) {
  const isAdmin = mode === "admin";
  const loadSummaryFn = fetchSummary ?? (isAdmin ? getAdminOperationsSummary : getOperationsSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FacilityOperationsSummary | null>(null);
  const [quickTab, setQuickTab] = useState<QuickLogTab>("environment");

  const loadSummary = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await loadSummaryFn();
      setSummary(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [loadSummaryFn]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading) {
    return <LoadingState label="Loading facility operations..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!summary) {
    return <p>No operations data available.</p>;
  }

  const fs = summary.facility_summary;

  return (
    <div className="operations-hub">
      {(summary.stale_care_room_count > 0 ||
        summary.low_stock_count > 0 ||
        summary.rooms_missing_env_today > 0) && (
        <div className="operations-alerts">
          {summary.rooms_missing_env_today > 0 ? (
            <div className="info-card compact-info-card warning-info-card">
              <strong>
                {summary.rooms_missing_env_today} room(s) missing today&apos;s environment log
              </strong>
              <span>
                {summary.rooms_logged_today}/{summary.total_rooms} rooms logged today
              </span>
            </div>
          ) : null}
          {summary.stale_care_room_count > 0 ? (
            <div className="info-card compact-info-card warning-info-card">
              <strong>{summary.stale_care_room_count} room(s) with stale care logs</strong>
            </div>
          ) : null}
          {summary.low_stock_count > 0 ? (
            <div className="info-card compact-info-card warning-info-card">
              <strong>{summary.low_stock_count} supply item(s) at or below reorder level</strong>
            </div>
          ) : null}
        </div>
      )}

      <PageSection title="Facility snapshot">
        <div className="summary-grid">
          <div className="summary-card">
            <strong>{fs.total_animals}</strong>
            <span>Total animals</span>
          </div>
          <div className="summary-card">
            <strong>{fs.available_animals}</strong>
            <span>Available</span>
          </div>
          <div className="summary-card">
            <strong>{fs.quarantine_animals}</strong>
            <span>Quarantine</span>
          </div>
          <div className="summary-card">
            <strong>{fs.allocated_animals}</strong>
            <span>Allocated</span>
          </div>
          <div className="summary-card">
            <strong>{fs.total_rooms}</strong>
            <span>Rooms</span>
          </div>
          <div className="summary-card">
            <strong>{fs.total_cages}</strong>
            <span>Cages</span>
          </div>
          <div className="summary-card">
            <strong>{summary.rooms_logged_today}</strong>
            <span>Env logs today</span>
          </div>
          <div className="summary-card">
            <strong>{summary.low_stock_count}</strong>
            <span>Low stock items</span>
          </div>
        </div>
      </PageSection>

      <PageSection title="Recent facility activity">
        <DataTable
          columns={[
            { header: "Date", cell: (row) => formatDisplayDate(row.date) },
            { header: "Type", cell: (row) => row.kind },
            { header: "Event", cell: (row) => row.title },
            { header: "Location", cell: (row) => row.subtitle },
            { header: "Details", cell: (row) => row.details },
          ]}
          rows={summary.recent_activity}
          emptyText="No care, supply, or environment logs yet."
        />
      </PageSection>

      <PageSection title="Quick log entry">
        <nav className="tab-nav nested-tab-nav">
          {(
            [
              ["environment", "Environment"],
              ["care", "Care / sanitation"],
              ["supplies", "Supplies"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={quickTab === key ? "tab-button active" : "tab-button"}
              onClick={() => setQuickTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        {quickTab === "environment" ? (
          <EnvironmentLogPanel
            createLog={isAdmin ? createAdminEnvironmentLog : undefined}
            fetchLogs={isAdmin ? getAdminEnvironmentLogs : undefined}
          />
        ) : null}
        {quickTab === "care" ? <CareLogPanel /> : null}
        {quickTab === "supplies" ? <SupplyInventoryPanel mode={mode} /> : null}
      </PageSection>
    </div>
  );
}
