import { apiClient } from "./client";

export interface FacilitySummary {
  total_animals: number;
  available_animals: number;
  quarantine_animals: number;
  allocated_animals: number;
  deceased_animals: number;
  rehabilitated_animals: number;
  total_rooms: number;
  total_cages: number;
  procurements_this_month: number;
  breeding_records_this_month: number;
}

export interface FacilityRoom {
  id: number;
  code: string;
  name: string;
  building?: string | null;
  notes?: string | null;
}

export interface FacilityCage {
  id: number;
  label: string;
  location: string;
  room_id?: number | null;
  capacity: number;
  status: string;
  room_code?: string | null;
  room_name?: string | null;
  animal_count: number;
}

export interface FacilityAnimal {
  id: number;
  animal_number?: string | null;
  species_id: number;
  strain_id: number;
  species_name?: string | null;
  strain_name?: string | null;
  cage_id?: number | null;
  cage_label?: string | null;
  room_code?: string | null;
  sex?: string | null;
  status?: string | null;
  source_type?: string | null;
  latest_weight_g?: number | null;
  quarantine_start_date?: string | null;
  quarantine_end_date?: string | null;
  rehabilitation_date?: string | null;
  notes?: string | null;
}

export async function getFacilitySummary(): Promise<FacilitySummary> {
  const { data } = await apiClient.get<FacilitySummary>("/admin/facility/summary");
  return data;
}

export async function getFacilityRooms(): Promise<FacilityRoom[]> {
  const { data } = await apiClient.get<FacilityRoom[]>("/admin/facility/rooms");
  return data;
}

export async function createFacilityRoom(payload: Omit<FacilityRoom, "id">): Promise<FacilityRoom> {
  const { data } = await apiClient.post<FacilityRoom>("/admin/facility/rooms", payload);
  return data;
}

export async function getFacilityCages(): Promise<FacilityCage[]> {
  const { data } = await apiClient.get<FacilityCage[]>("/admin/facility/cages");
  return data;
}

export async function createFacilityCage(payload: {
  label: string;
  location: string;
  room_id?: number | null;
  capacity?: number;
  status?: string;
}): Promise<FacilityCage> {
  const { data } = await apiClient.post<FacilityCage>("/admin/facility/cages", payload);
  return data;
}

export async function getFacilityAnimals(params?: {
  status?: string;
  species_id?: number;
  room_id?: number;
}): Promise<FacilityAnimal[]> {
  const { data } = await apiClient.get<FacilityAnimal[]>("/admin/facility/animals", { params });
  return data;
}

export async function createProcurement(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/admin/facility/procurements", payload);
  return data;
}

export async function createBreedingRecord(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/admin/facility/breeding", payload);
  return data;
}

export async function recordAnimalOutcome(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/admin/facility/outcomes", payload);
  return data;
}

export async function createCareLog(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/admin/facility/care-logs", payload);
  return data;
}

export async function getCareLogs(logType?: string) {
  const { data } = await apiClient.get("/admin/facility/care-logs", {
    params: logType ? { log_type: logType } : undefined,
  });
  return data;
}

export async function moveAnimal(animalId: number, payload: Record<string, unknown>) {
  const { data } = await apiClient.post(`/admin/facility/animals/${animalId}/move`, payload);
  return data;
}

export async function releaseQuarantine(animalId: number) {
  const { data } = await apiClient.post(`/admin/facility/animals/${animalId}/release-quarantine`);
  return data;
}

export async function addAnimalWeight(animalId: number, payload: { date: string; weight_g: number }) {
  const { data } = await apiClient.post(`/admin/facility/animals/${animalId}/weights`, payload);
  return data;
}

export async function getProcurements() {
  const { data } = await apiClient.get("/admin/facility/procurements");
  return data;
}

export async function getBreedingRecords() {
  const { data } = await apiClient.get("/admin/facility/breeding");
  return data;
}

export async function getFacilityCageMap() {
  const { data } = await apiClient.get("/admin/facility/cage-map");
  return data;
}

export type CageLabelCategory = "quarantine" | "available" | "rehabilitated";

export async function downloadAdminCageLabel(cageId: number, cageLabel: string): Promise<void> {
  const response = await apiClient.get(`/admin/facility/cages/${cageId}/label/download`, {
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

export async function downloadAdminBulkCageLabels(
  category: CageLabelCategory,
  roomId?: number,
): Promise<void> {
  const response = await apiClient.get("/admin/facility/labels/cages/download", {
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

export interface AdminSupplyItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  quantity_on_hand: number;
  active: boolean;
  notes?: string | null;
  low_stock: boolean;
}

export interface AdminSupplyTransaction {
  id: number;
  item_id: number;
  item_name: string;
  item_category: string;
  item_unit: string;
  txn_type: string;
  quantity: number;
  date: string;
  notes?: string | null;
  room_id?: number | null;
  room_code?: string | null;
  created_at: string;
}

export async function getAdminSupplyItems(includeInactive = false): Promise<AdminSupplyItem[]> {
  const { data } = await apiClient.get<AdminSupplyItem[]>("/admin/facility/supplies/items", {
    params: { include_inactive: includeInactive },
  });
  return data;
}

export async function createAdminSupplyItem(payload: {
  name: string;
  category: string;
  unit?: string;
  reorder_level?: number;
  initial_quantity?: number;
  notes?: string;
}): Promise<AdminSupplyItem> {
  const { data } = await apiClient.post<AdminSupplyItem>("/admin/facility/supplies/items", payload);
  return data;
}

export async function updateAdminSupplyItem(
  itemId: number,
  payload: Partial<{
    name: string;
    category: string;
    unit: string;
    reorder_level: number;
    active: boolean;
    notes: string;
  }>,
): Promise<AdminSupplyItem> {
  const { data } = await apiClient.put<AdminSupplyItem>(`/admin/facility/supplies/items/${itemId}`, payload);
  return data;
}

export async function getAdminSupplyTransactions(params?: {
  item_id?: number;
  txn_type?: string;
}): Promise<AdminSupplyTransaction[]> {
  const { data } = await apiClient.get<AdminSupplyTransaction[]>("/admin/facility/supplies/transactions", { params });
  return data;
}

export async function recordAdminSupplyTransaction(payload: {
  item_id: number;
  txn_type: "in" | "out" | "adjust";
  quantity: number;
  date: string;
  notes?: string;
  room_id?: number | null;
}): Promise<AdminSupplyTransaction> {
  const { data } = await apiClient.post<AdminSupplyTransaction>("/admin/facility/supplies/transactions", payload);
  return data;
}
