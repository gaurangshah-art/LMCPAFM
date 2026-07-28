import { apiClient } from "./client";
import type {
  FacilityAnimal,
  FacilityCageMapRoom,
  FacilitySummary,
  AnimalTimelineEvent,
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
