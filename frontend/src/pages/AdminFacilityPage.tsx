import { useCallback, useEffect, useState } from "react";
import {
  addAnimalWeight,
  createBreedingRecord,
  createCareLog,
  createFacilityCage,
  createFacilityRoom,
  createProcurement,
  getBreedingRecords,
  getCareLogs,
  getFacilityAnimals,
  getFacilityCages,
  getFacilityRooms,
  getFacilitySummary,
  getFacilityCageMap,
  getProcurements,
  moveAnimal,
  recordAnimalOutcome,
  releaseQuarantine,
  type FacilityAnimal,
  type FacilityCage,
  type FacilityRoom,
  type FacilitySummary,
  downloadAdminBulkCageLabels,
  downloadAdminCageLabel,
  type CageLabelCategory,
} from "../api/adminFacilityApi";
import {
  getApprovedSpeciesOptions,
  getApprovedStrainsOptions,
  type LookupOption,
} from "../api/lookupApi";
import { getApiErrorMessage } from "../api/errors";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { DataTable } from "../components/tables/DataTable";
import { formatDisplayDate } from "../utils/dateFormat";
import { CageMapView } from "../components/facility/CageMapView";
import { CageLabelBulkActions } from "../components/facility/CageLabelBulkActions";
import { AnimalTimelinePanel } from "../components/facility/AnimalTimelinePanel";
import { FacilityDashboardPanel } from "../components/facility/FacilityDashboardPanel";
import { FacilityOperationsHub } from "../components/facility/FacilityOperationsHub";
import { SupplyInventoryPanel } from "../components/facility/SupplyInventoryPanel";
import { EnvironmentLogPanel } from "../components/facility/EnvironmentLogPanel";
import { createAdminEnvironmentLog, getAdminEnvironmentLogs } from "../api/adminFacilityApi";
import { CARE_LOG_TYPES } from "../constants/careLogTypes";
import type { FacilityCageMapRoom } from "../api/facilityTypes";

type TabKey =
  | "overview"
  | "dashboards"
  | "rooms"
  | "cages"
  | "map"
  | "animals"
  | "procurement"
  | "breeding"
  | "outcomes"
  | "care"
  | "supplies"
  | "environment";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Operations Hub" },
  { key: "dashboards", label: "Dashboards" },
  { key: "rooms", label: "Rooms" },
  { key: "cages", label: "Cages" },
  { key: "map", label: "Cage Map" },
  { key: "animals", label: "Animals" },
  { key: "procurement", label: "Procurement" },
  { key: "breeding", label: "Breeding" },
  { key: "outcomes", label: "Outcomes" },
  { key: "care", label: "Care Logs" },
  { key: "supplies", label: "Supplies" },
  { key: "environment", label: "Environment" },
];

export function AdminFacilityPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FacilitySummary | null>(null);
  const [rooms, setRooms] = useState<FacilityRoom[]>([]);
  const [cages, setCages] = useState<FacilityCage[]>([]);
  const [animals, setAnimals] = useState<FacilityAnimal[]>([]);
  const [procurements, setProcurements] = useState<Array<Record<string, unknown>>>([]);
  const [breedingRecords, setBreedingRecords] = useState<Array<Record<string, unknown>>>([]);
  const [careLogs, setCareLogs] = useState<Array<Record<string, unknown>>>([]);
  const [cageMap, setCageMap] = useState<FacilityCageMapRoom[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [speciesOptions, setSpeciesOptions] = useState<LookupOption[]>([]);
  const [strainOptions, setStrainOptions] = useState<LookupOption[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [printingCageId, setPrintingCageId] = useState<number | null>(null);
  const [bulkLabelBusy, setBulkLabelBusy] = useState(false);

  const selectedAnimal = animals.find((animal) => animal.id === selectedAnimalId) ?? null;

  const [roomForm, setRoomForm] = useState({ code: "", name: "", building: "", notes: "" });
  const [cageForm, setCageForm] = useState({ label: "", location: "", room_id: "", capacity: "1" });
  const [procurementForm, setProcurementForm] = useState({
    species_id: "",
    strain_id: "",
    count: "1",
    date: new Date().toISOString().slice(0, 10),
    supplier_name: "",
    acquired_from: "",
    voucher_or_bill_number: "",
    received_by_name: "",
    remarks: "",
  });
  const [breedingForm, setBreedingForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    species_id: "",
    strain_id: "",
    offspring_count: "1",
    litter_count: "1",
    remarks: "",
  });
  const [outcomeForm, setOutcomeForm] = useState({
    animal_id: "",
    date: new Date().toISOString().slice(0, 10),
    outcome_type: "natural_death",
    reason: "",
    remarks: "",
  });
  const [careForm, setCareForm] = useState({
    log_type: "feeding",
    room_id: "",
    date: new Date().toISOString().slice(0, 10),
    details: "",
    performed_by_name: "",
  });
  const [moveForm, setMoveForm] = useState({ animal_id: "", to_cage_id: "", reason: "" });
  const [weightForm, setWeightForm] = useState({
    animal_id: "",
    date: new Date().toISOString().slice(0, 10),
    weight_g: "",
  });

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [
        summaryData,
        roomData,
        cageData,
        animalData,
        procurementData,
        breedingData,
        careData,
        speciesData,
        mapData,
      ] = await Promise.all([
        getFacilitySummary(),
        getFacilityRooms(),
        getFacilityCages(),
        getFacilityAnimals(),
        getProcurements(),
        getBreedingRecords(),
        getCareLogs(),
        getApprovedSpeciesOptions(),
        getFacilityCageMap(),
      ]);
      setSummary(summaryData);
      setRooms(roomData);
      setCages(cageData);
      setAnimals(animalData);
      setProcurements(procurementData);
      setBreedingRecords(breedingData);
      setCareLogs(careData);
      setSpeciesOptions(speciesData);
      setCageMap(mapData);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    async function loadStrains() {
      const speciesId = Number(procurementForm.species_id || breedingForm.species_id);
      if (!speciesId) {
        setStrainOptions([]);
        return;
      }
      setStrainOptions(await getApprovedStrainsOptions(speciesId));
    }
    void loadStrains();
  }, [procurementForm.species_id, breedingForm.species_id]);

  async function handlePrintCageLabel(cageId: number, cageLabel: string) {
    try {
      setActionMessage(null);
      setPrintingCageId(cageId);
      await downloadAdminCageLabel(cageId, cageLabel);
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
      await downloadAdminBulkCageLabels(category);
      setActionMessage(`Bulk ${category} cage labels downloaded.`);
    } catch (printError) {
      setActionMessage(getApiErrorMessage(printError));
    } finally {
      setBulkLabelBusy(false);
    }
  }

  async function handleCreateRoom() {
    try {
      setActionMessage(null);
      await createFacilityRoom({
        code: roomForm.code.trim(),
        name: roomForm.name.trim(),
        building: roomForm.building.trim() || null,
        notes: roomForm.notes.trim() || null,
      });
      setRoomForm({ code: "", name: "", building: "", notes: "" });
      setActionMessage("Room created.");
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  async function handleCreateCage() {
    try {
      setActionMessage(null);
      await createFacilityCage({
        label: cageForm.label.trim(),
        location: cageForm.location.trim(),
        room_id: cageForm.room_id ? Number(cageForm.room_id) : null,
        capacity: Number(cageForm.capacity) || 1,
      });
      setCageForm({ label: "", location: "", room_id: "", capacity: "1" });
      setActionMessage("Cage created.");
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  async function handleCreateProcurement() {
    try {
      setActionMessage(null);
      await createProcurement({
        species_id: Number(procurementForm.species_id),
        strain_id: Number(procurementForm.strain_id),
        count: Number(procurementForm.count),
        date: procurementForm.date,
        supplier_name: procurementForm.supplier_name || null,
        acquired_from: procurementForm.acquired_from || null,
        voucher_or_bill_number: procurementForm.voucher_or_bill_number || null,
        received_by_name: procurementForm.received_by_name || null,
        remarks: procurementForm.remarks || null,
        create_animals: true,
        start_quarantine: true,
      });
      setActionMessage("Procurement recorded and animals created in quarantine.");
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  async function handleCreateBreeding() {
    try {
      setActionMessage(null);
      await createBreedingRecord({
        date: breedingForm.date,
        species_id: Number(breedingForm.species_id),
        strain_id: Number(breedingForm.strain_id),
        offspring_count: Number(breedingForm.offspring_count),
        litter_count: Number(breedingForm.litter_count),
        remarks: breedingForm.remarks || null,
        create_offspring: true,
        start_quarantine: true,
      });
      setActionMessage("Breeding record saved and offspring created in quarantine.");
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  async function handleRecordOutcome() {
    try {
      setActionMessage(null);
      await recordAnimalOutcome({
        animal_id: Number(outcomeForm.animal_id),
        date: outcomeForm.date,
        outcome_type: outcomeForm.outcome_type,
        reason: outcomeForm.reason,
        remarks: outcomeForm.remarks || null,
      });
      setActionMessage("Animal outcome recorded.");
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  async function handleCreateCareLog() {
    try {
      setActionMessage(null);
      await createCareLog({
        log_type: careForm.log_type,
        room_id: careForm.room_id ? Number(careForm.room_id) : null,
        date: careForm.date,
        details: careForm.details,
        performed_by_name: careForm.performed_by_name,
      });
      setActionMessage("Care log saved.");
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  async function handleMoveAnimal() {
    try {
      setActionMessage(null);
      await moveAnimal(Number(moveForm.animal_id), {
        to_cage_id: Number(moveForm.to_cage_id),
        reason: moveForm.reason || null,
      });
      setActionMessage("Animal moved.");
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  async function handleAddWeight() {
    try {
      setActionMessage(null);
      await addAnimalWeight(Number(weightForm.animal_id), {
        date: weightForm.date,
        weight_g: Number(weightForm.weight_g),
      });
      setActionMessage("Weight recorded.");
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  async function handleReleaseQuarantine(animalId: number) {
    try {
      setActionMessage(null);
      await releaseQuarantine(animalId);
      setActionMessage(`Animal ${animalId} released from quarantine.`);
      await loadAll();
    } catch (submitError) {
      setActionMessage(getApiErrorMessage(submitError));
    }
  }

  if (loading) {
    return <LoadingState label="Loading facility inventory..." />;
  }

  return (
    <div className="page-card">
      <header className="section-header">
        <h1>Animal Facility Control</h1>
        <p>Admin-only inventory, housing, procurement, breeding, outcomes, and daily care records.</p>
      </header>

      {error ? <ErrorAlert message={error} /> : null}
      {actionMessage ? <p className="success-note">{actionMessage}</p> : null}

      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? <FacilityOperationsHub mode="admin" /> : null}

      {activeTab === "dashboards" ? (
        <PageSection title="Facility Dashboard">
          <FacilityDashboardPanel />
        </PageSection>
      ) : null}

      {activeTab === "rooms" ? (
        <>
          <PageSection title="Add Room">
            <div className="form-grid">
              <label>Code<input value={roomForm.code} onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })} /></label>
              <label>Name<input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} /></label>
              <label>Building<input value={roomForm.building} onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })} /></label>
              <label className="full-width">Notes<textarea rows={2} value={roomForm.notes} onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })} /></label>
              <button type="button" className="btn" onClick={() => void handleCreateRoom()}>Create Room</button>
            </div>
          </PageSection>
          <PageSection title="Rooms">
            <DataTable
              columns={[
                { header: "Code", cell: (row) => row.code },
                { header: "Name", cell: (row) => row.name },
                { header: "Building", cell: (row) => row.building ?? "-" },
              ]}
              rows={rooms}
              emptyText="No rooms defined yet."
            />
          </PageSection>
        </>
      ) : null}

      {activeTab === "cages" ? (
        <>
          <PageSection title="Add Cage">
            <div className="form-grid">
              <label>Label<input value={cageForm.label} onChange={(e) => setCageForm({ ...cageForm, label: e.target.value })} /></label>
              <label>Location<input value={cageForm.location} onChange={(e) => setCageForm({ ...cageForm, location: e.target.value })} /></label>
              <label>Room
                <select value={cageForm.room_id} onChange={(e) => setCageForm({ ...cageForm, room_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{room.code} — {room.name}</option>)}
                </select>
              </label>
              <label>Capacity<input type="number" min={1} value={cageForm.capacity} onChange={(e) => setCageForm({ ...cageForm, capacity: e.target.value })} /></label>
              <button type="button" className="btn" onClick={() => void handleCreateCage()}>Create Cage</button>
            </div>
          </PageSection>
          <PageSection title="Cages">
            <DataTable
              columns={[
                { header: "Label", cell: (row) => row.label },
                { header: "Room", cell: (row) => row.room_code ?? "-" },
                { header: "Location", cell: (row) => row.location },
                { header: "Animals", cell: (row) => row.animal_count },
                { header: "Capacity", cell: (row) => row.capacity },
                { header: "Status", cell: (row) => row.status },
              ]}
              rows={cages}
              emptyText="No cages defined yet."
            />
          </PageSection>
        </>
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
          <PageSection title="Move Animal / Record Weight">
            <div className="form-grid">
              <label>Animal ID<input value={moveForm.animal_id} onChange={(e) => setMoveForm({ ...moveForm, animal_id: e.target.value })} /></label>
              <label>To Cage ID<input value={moveForm.to_cage_id} onChange={(e) => setMoveForm({ ...moveForm, to_cage_id: e.target.value })} /></label>
              <label>Reason<input value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} /></label>
              <button type="button" className="btn-secondary" onClick={() => void handleMoveAnimal()}>Move Animal</button>
              <label>Animal ID<input value={weightForm.animal_id} onChange={(e) => setWeightForm({ ...weightForm, animal_id: e.target.value })} /></label>
              <label>Date<input type="date" value={weightForm.date} onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })} /></label>
              <label>Weight (g)<input type="number" min={1} value={weightForm.weight_g} onChange={(e) => setWeightForm({ ...weightForm, weight_g: e.target.value })} /></label>
              <button type="button" className="btn-secondary" onClick={() => void handleAddWeight()}>Add Weight</button>
            </div>
          </PageSection>
          <PageSection title="Animals">
            <DataTable
              columns={[
                { header: "Number", cell: (row) => row.animal_number ?? row.id },
                { header: "Species", cell: (row) => row.species_name ?? "-" },
                { header: "Strain", cell: (row) => row.strain_name ?? "-" },
                { header: "Status", cell: (row) => row.status ?? "-" },
                { header: "Cage", cell: (row) => row.cage_label ?? "-" },
                { header: "Room", cell: (row) => row.room_code ?? "-" },
                { header: "Weight (g)", cell: (row) => row.latest_weight_g ?? "-" },
                {
                  header: "Actions",
                  cell: (row) => (
                    <div className="inline-actions">
                      <button type="button" className="btn-secondary btn-small" onClick={() => setSelectedAnimalId(row.id)}>
                        Timeline
                      </button>
                      {row.status === "quarantine" ? (
                        <button type="button" className="btn-secondary btn-small" onClick={() => void handleReleaseQuarantine(row.id)}>
                          Release
                        </button>
                      ) : null}
                    </div>
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

      {activeTab === "procurement" ? (
        <>
          <PageSection title="Record External Procurement">
            <div className="form-grid">
              <label>Species
                <select value={procurementForm.species_id} onChange={(e) => setProcurementForm({ ...procurementForm, species_id: e.target.value, strain_id: "" })}>
                  <option value="">Select species</option>
                  {speciesOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <label>Strain
                <select value={procurementForm.strain_id} onChange={(e) => setProcurementForm({ ...procurementForm, strain_id: e.target.value })}>
                  <option value="">Select strain</option>
                  {strainOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <label>Count<input type="number" min={1} value={procurementForm.count} onChange={(e) => setProcurementForm({ ...procurementForm, count: e.target.value })} /></label>
              <label>Date<input type="date" value={procurementForm.date} onChange={(e) => setProcurementForm({ ...procurementForm, date: e.target.value })} /></label>
              <label>Supplier<input value={procurementForm.supplier_name} onChange={(e) => setProcurementForm({ ...procurementForm, supplier_name: e.target.value })} /></label>
              <label>Source facility<input value={procurementForm.acquired_from} onChange={(e) => setProcurementForm({ ...procurementForm, acquired_from: e.target.value })} /></label>
              <label>Voucher / bill<input value={procurementForm.voucher_or_bill_number} onChange={(e) => setProcurementForm({ ...procurementForm, voucher_or_bill_number: e.target.value })} /></label>
              <label className="full-width">Remarks<textarea rows={2} value={procurementForm.remarks} onChange={(e) => setProcurementForm({ ...procurementForm, remarks: e.target.value })} /></label>
              <button type="button" className="btn" onClick={() => void handleCreateProcurement()}>Record Procurement</button>
            </div>
          </PageSection>
          <PageSection title="Procurement History">
            <DataTable
              columns={[
                { header: "Date", cell: (row) => formatDisplayDate(String(row.date)) },
                { header: "Species", cell: (row) => String(row.species_name ?? "-") },
                { header: "Strain", cell: (row) => String(row.strain_name ?? "-") },
                { header: "Count", cell: (row) => String(row.count ?? "-") },
                { header: "Supplier", cell: (row) => String(row.supplier_name ?? "-") },
                { header: "Voucher", cell: (row) => String(row.voucher_or_bill_number ?? "-") },
              ]}
              rows={procurements}
              emptyText="No procurement records yet."
            />
          </PageSection>
        </>
      ) : null}

      {activeTab === "breeding" ? (
        <>
          <PageSection title="Record Breeding">
            <div className="form-grid">
              <label>Date<input type="date" value={breedingForm.date} onChange={(e) => setBreedingForm({ ...breedingForm, date: e.target.value })} /></label>
              <label>Species
                <select value={breedingForm.species_id} onChange={(e) => setBreedingForm({ ...breedingForm, species_id: e.target.value, strain_id: "" })}>
                  <option value="">Select species</option>
                  {speciesOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <label>Strain
                <select value={breedingForm.strain_id} onChange={(e) => setBreedingForm({ ...breedingForm, strain_id: e.target.value })}>
                  <option value="">Select strain</option>
                  {strainOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <label>Litters<input type="number" min={1} value={breedingForm.litter_count} onChange={(e) => setBreedingForm({ ...breedingForm, litter_count: e.target.value })} /></label>
              <label>Offspring<input type="number" min={1} value={breedingForm.offspring_count} onChange={(e) => setBreedingForm({ ...breedingForm, offspring_count: e.target.value })} /></label>
              <label className="full-width">Remarks<textarea rows={2} value={breedingForm.remarks} onChange={(e) => setBreedingForm({ ...breedingForm, remarks: e.target.value })} /></label>
              <button type="button" className="btn" onClick={() => void handleCreateBreeding()}>Save Breeding Record</button>
            </div>
          </PageSection>
          <PageSection title="Breeding History">
            <DataTable
              columns={[
                { header: "Date", cell: (row) => formatDisplayDate(String(row.date)) },
                { header: "Species", cell: (row) => String(row.species_name ?? "-") },
                { header: "Offspring", cell: (row) => String(row.offspring_count ?? "-") },
                { header: "Animals Created", cell: (row) => String(row.animals_created ?? "-") },
              ]}
              rows={breedingRecords}
              emptyText="No breeding records yet."
            />
          </PageSection>
        </>
      ) : null}

      {activeTab === "outcomes" ? (
        <PageSection title="Record Sacrifice / Death / Rehabilitation">
          <div className="form-grid">
            <label>Animal ID<input value={outcomeForm.animal_id} onChange={(e) => setOutcomeForm({ ...outcomeForm, animal_id: e.target.value })} /></label>
            <label>Date<input type="date" value={outcomeForm.date} onChange={(e) => setOutcomeForm({ ...outcomeForm, date: e.target.value })} /></label>
            <label>Outcome
              <select value={outcomeForm.outcome_type} onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome_type: e.target.value })}>
                <option value="sacrifice">Sacrifice</option>
                <option value="euthanasia">Euthanasia</option>
                <option value="natural_death">Natural death</option>
                <option value="rehabilitation">Rehabilitation release</option>
              </select>
            </label>
            <label className="full-width">Reason<textarea rows={2} value={outcomeForm.reason} onChange={(e) => setOutcomeForm({ ...outcomeForm, reason: e.target.value })} /></label>
            <button type="button" className="btn" onClick={() => void handleRecordOutcome()}>Record Outcome</button>
          </div>
        </PageSection>
      ) : null}

      {activeTab === "care" ? (
        <>
          <PageSection title="Feeding / Watering / Cleaning / Sanitation Log">
            <div className="form-grid">
              <label>Type
                <select value={careForm.log_type} onChange={(e) => setCareForm({ ...careForm, log_type: e.target.value })}>
                  {CARE_LOG_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>Room
                <select value={careForm.room_id} onChange={(e) => setCareForm({ ...careForm, room_id: e.target.value })}>
                  <option value="">Select room</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}
                </select>
              </label>
              <label>Date<input type="date" value={careForm.date} onChange={(e) => setCareForm({ ...careForm, date: e.target.value })} /></label>
              <label>Performed by<input value={careForm.performed_by_name} onChange={(e) => setCareForm({ ...careForm, performed_by_name: e.target.value })} /></label>
              <label className="full-width">Details<textarea rows={2} value={careForm.details} onChange={(e) => setCareForm({ ...careForm, details: e.target.value })} /></label>
              <button type="button" className="btn" onClick={() => void handleCreateCareLog()}>Save Care Log</button>
            </div>
          </PageSection>
          <PageSection title="Recent Care Logs">
            <DataTable
              columns={[
                { header: "Date", cell: (row) => formatDisplayDate(String(row.date)) },
                { header: "Type", cell: (row) => String(row.log_type ?? "-") },
                { header: "Room", cell: (row) => String(row.room_code ?? "-") },
                { header: "Performed By", cell: (row) => String(row.performed_by_name ?? "-") },
                { header: "Details", cell: (row) => String(row.details ?? "-") },
              ]}
              rows={careLogs}
              emptyText="No care logs yet."
            />
          </PageSection>
        </>
      ) : null}

      {activeTab === "supplies" ? <SupplyInventoryPanel mode="admin" /> : null}

      {activeTab === "environment" ? (
        <EnvironmentLogPanel createLog={createAdminEnvironmentLog} fetchLogs={getAdminEnvironmentLogs} />
      ) : null}
    </div>
  );
}
