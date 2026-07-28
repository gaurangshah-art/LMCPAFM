import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getStaffCageMap,
  getStaffFacilityAnimals,
  getStaffFacilitySummary,
  downloadBulkCageLabels,
  downloadCageLabel,
  type CageLabelCategory,
} from "../api/facilityApi";
import type { FacilityAnimal, FacilityCageMapRoom, FacilitySummary } from "../api/facilityTypes";
import { getApiErrorMessage } from "../api/errors";
import { AnimalTimelinePanel } from "../components/facility/AnimalTimelinePanel";
import { CageMapView } from "../components/facility/CageMapView";
import { CageLabelBulkActions } from "../components/facility/CageLabelBulkActions";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { DataTable } from "../components/tables/DataTable";

type TabKey = "overview" | "map" | "animals";

export function StaffFacilityPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FacilitySummary | null>(null);
  const [cageMap, setCageMap] = useState<FacilityCageMapRoom[]>([]);
  const [animals, setAnimals] = useState<FacilityAnimal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [printingCageId, setPrintingCageId] = useState<number | null>(null);
  const [bulkLabelBusy, setBulkLabelBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedAnimal = animals.find((animal) => animal.id === selectedAnimalId) ?? null;

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [summaryData, mapData, animalData] = await Promise.all([
        getStaffFacilitySummary(),
        getStaffCageMap(),
        getStaffFacilityAnimals(),
      ]);
      setSummary(summaryData);
      setCageMap(mapData);
      setAnimals(animalData);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handlePrintCageLabel(cageId: number, cageLabel: string) {
    try {
      setActionMessage(null);
      setPrintingCageId(cageId);
      await downloadCageLabel(cageId, cageLabel);
      setActionMessage(`Cage label downloaded for ${cageLabel}.`);
    } catch (printError) {
      setActionMessage(getApiErrorMessage(printError));
    } finally {
      setPrintingCageId(null);
    }
  }

  async function handleBulkCageLabels(category: CageLabelCategory) {
    try {
      setActionMessage(null);
      setBulkLabelBusy(true);
      await downloadBulkCageLabels(category);
      setActionMessage(`Bulk ${category} cage labels downloaded.`);
    } catch (printError) {
      setActionMessage(getApiErrorMessage(printError));
    } finally {
      setBulkLabelBusy(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading facility inventory..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h1>Animal Facility Inventory</h1>
        <p>Read-only view for staff. Issue animals to investigators via the allocation workflow.</p>
      </header>

      <div className="info-card compact-info-card">
        <strong>Issue animals</strong>
        <p>Staff allocate available animals through approved requisitions.</p>
        <Link to="/allocations" className="btn">
          Go to Allocations
        </Link>
      </div>

      {error ? <ErrorAlert message={error} /> : null}
      {actionMessage ? <p className="success-text">{actionMessage}</p> : null}

      <nav className="tab-nav">
        {(
          [
            ["overview", "Overview"],
            ["map", "Cage Map"],
            ["animals", "Animals & Timeline"],
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

      {activeTab === "overview" && summary ? (
        <PageSection title="Inventory snapshot">
          <div className="summary-grid">
            <div className="summary-card"><strong>{summary.available_animals}</strong><span>Available to issue</span></div>
            <div className="summary-card"><strong>{summary.quarantine_animals}</strong><span>Quarantine</span></div>
            <div className="summary-card"><strong>{summary.allocated_animals}</strong><span>Allocated / in use</span></div>
            <div className="summary-card"><strong>{summary.total_rooms}</strong><span>Rooms</span></div>
            <div className="summary-card"><strong>{summary.total_cages}</strong><span>Cages</span></div>
          </div>
        </PageSection>
      ) : null}

      {activeTab === "map" ? (
        <PageSection title="Cage map">
          <CageLabelBulkActions onPrintCategory={handleBulkCageLabels} busy={bulkLabelBusy} />
          <CageMapView
            rooms={cageMap}
            printingCageId={printingCageId}
            onPrintCageLabel={handlePrintCageLabel}
            onSelectAnimal={(id) => {
              setSelectedAnimalId(id);
              setActiveTab("animals");
            }}
          />
        </PageSection>
      ) : null}

      {activeTab === "animals" ? (
        <>
          <PageSection title="Animals">
            <DataTable
              columns={[
                { header: "Number", cell: (row) => row.animal_number ?? row.id },
                { header: "Species", cell: (row) => row.species_name ?? "-" },
                { header: "Status", cell: (row) => row.status ?? "-" },
                { header: "Cage", cell: (row) => row.cage_label ?? "-" },
                {
                  header: "Timeline",
                  cell: (row) => (
                    <button type="button" className="btn-secondary btn-small" onClick={() => setSelectedAnimalId(row.id)}>
                      View
                    </button>
                  ),
                },
              ]}
              rows={animals}
              emptyText="No animals in inventory."
            />
          </PageSection>
          <AnimalTimelinePanel animal={selectedAnimal} />
        </>
      ) : null}
    </div>
  );
}
