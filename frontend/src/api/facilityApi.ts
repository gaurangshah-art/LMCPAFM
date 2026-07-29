import { apiClient } from "./client";
import type {
  FacilityAnimal,
  FacilityCage,
  FacilityCareLog,
  FacilityCageMapRoom,
  FacilityRoom,
  FacilitySummary,
  AnimalTimelineEvent,
  PiDashboard,
  RoomDashboard,
  StrainDashboard,
  SupplyItem,
  SupplyTransaction,
  FacilityEnvironmentLog,
  FacilityOperationsSummary,
} from "./facilityTypes";

export async function getStaffFacilitySummary(): Promise<FacilitySummary> {
  const { data } = await apiClient.get<FacilitySummary>("/facility/summary");
  return data;
}

export async function getStaffCageMap(): Promise<FacilityCageMapRoom[]> {
  const { data } = await apiClient.get<FacilityCageMapRoom[]>("/facility/cage-map");
  return data;
}

export async function getStaffFacilityAnimals(params?: {
  status?: string;
}): Promise<FacilityAnimal[]> {
  const { data } = await apiClient.get<FacilityAnimal[]>("/facility/animals", { params });
  return data;
}

export async function getStaffFacilityRooms(): Promise<FacilityRoom[]> {
  const { data } = await apiClient.get<FacilityRoom[]>("/facility/rooms");
  return data;
}

export async function getStaffFacilityCages(): Promise<FacilityCage[]> {
  const { data } = await apiClient.get<FacilityCage[]>("/facility/cages");
  return data;
}

export async function getStaffCareLogs(logType?: string): Promise<FacilityCareLog[]> {
  const { data } = await apiClient.get<FacilityCareLog[]>("/facility/care-logs", {
    params: logType ? { log_type: logType } : undefined,
  });
  return data;
}

export async function createStaffCareLog(payload: {
  log_type: string;
  room_id?: number | null;
  cage_id?: number | null;
  date: string;
  details: string;
  performed_by_name?: string;
}): Promise<FacilityCareLog> {
  const { data } = await apiClient.post<FacilityCareLog>("/facility/care-logs", payload);
  return data;
}

export async function getPiDashboard(protocolId?: number): Promise<PiDashboard> {
  const { data } = await apiClient.get<PiDashboard>("/facility/dashboard/pi", {
    params: protocolId ? { protocol_id: protocolId } : undefined,
  });
  return data;
}

export async function getRoomDashboard(staleDays = 7): Promise<RoomDashboard> {
  const { data } = await apiClient.get<RoomDashboard>("/facility/dashboard/rooms", {
    params: { stale_days: staleDays },
  });
  return data;
}

export async function getStrainDashboard(): Promise<StrainDashboard> {
  const { data } = await apiClient.get<StrainDashboard>("/facility/dashboard/strains");
  return data;
}

export async function getSupplyItems(): Promise<SupplyItem[]> {
  const { data } = await apiClient.get<SupplyItem[]>("/facility/supplies/items");
  return data;
}

export async function getSupplyTransactions(params?: {
  item_id?: number;
  txn_type?: string;
}): Promise<SupplyTransaction[]> {
  const { data } = await apiClient.get<SupplyTransaction[]>("/facility/supplies/transactions", { params });
  return data;
}

export async function recordSupplyUsage(payload: {
  item_id: number;
  quantity: number;
  date: string;
  notes?: string;
  room_id?: number | null;
}): Promise<SupplyTransaction> {
  const { data } = await apiClient.post<SupplyTransaction>("/facility/supplies/transactions", payload);
  return data;
}

export async function getOperationsSummary(staleDays = 7): Promise<FacilityOperationsSummary> {
  const { data } = await apiClient.get<FacilityOperationsSummary>("/facility/operations-summary", {
    params: { stale_days: staleDays },
  });
  return data;
}

export async function getEnvironmentLogs(params?: {
  room_id?: number;
  date?: string;
}): Promise<FacilityEnvironmentLog[]> {
  const { data } = await apiClient.get<FacilityEnvironmentLog[]>("/facility/environment-logs", { params });
  return data;
}

export async function createEnvironmentLog(payload: {
  room_id: number;
  date: string;
  temperature_c?: number | null;
  humidity_pct?: number | null;
  hvac_status?: string;
  light_cycle?: string;
  notes?: string;
  performed_by_name?: string;
}): Promise<FacilityEnvironmentLog> {
  const { data } = await apiClient.post<FacilityEnvironmentLog>("/facility/environment-logs", payload);
  return data;
}

export async function getAnimalTimeline(animalId: number): Promise<AnimalTimelineEvent[]> {
  const { data } = await apiClient.get<AnimalTimelineEvent[]>(`/facility/animals/${animalId}/timeline`);
  return data;
}

export function getAnimalLabelDownloadUrl(animalId: number): string {
  const base = apiClient.defaults.baseURL ?? "";
  return `${base}/facility/animals/${animalId}/label/download`;
}

export type CageLabelCategory = "quarantine" | "available" | "rehabilitated";

export interface CageLabel {
  cage_id: number;
  cage_label: string;
  room_code?: string | null;
  location: string;
  category: CageLabelCategory;
  banner_text: string;
  species_summary?: string | null;
  strain_summary?: string | null;
  subtitle?: string | null;
  barcode_value: string;
  animals: Array<{ id: number; animal_number?: string | null; status?: string | null }>;
}

export async function downloadCageLabel(cageId: number, cageLabel: string): Promise<void> {
  const response = await apiClient.get(`/facility/cages/${cageId}/label/download`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cage_label_${cageLabel.replace(/\//g, "-")}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadBulkCageLabels(category: CageLabelCategory, roomId?: number): Promise<void> {
  const response = await apiClient.get("/facility/labels/cages/download", {
    params: { category, room_id: roomId },
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cage_labels_${category}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadAnimalLabel(animalId: number, animalNumber: string): Promise<void> {
  const response = await apiClient.get(`/facility/animals/${animalId}/label/download`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `label_${animalNumber.replace(/\//g, "-")}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadFormCPdf(): Promise<void> {
  const response = await apiClient.get("/inventory/form-c/download", { responseType: "blob" });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Form_C_Register.pdf";
  link.click();
  window.URL.revokeObjectURL(url);
}
