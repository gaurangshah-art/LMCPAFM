import { apiClient } from "./client";

export interface ResourceCatalogItem {
  slug: string;
  title: string;
  summary: string;
  category: string;
}

export interface ResourceDocument {
  slug: string;
  title: string;
  summary: string;
  category: string;
  markdown: string;
  html: string;
}

export async function getResourceCatalog(): Promise<ResourceCatalogItem[]> {
  const { data } = await apiClient.get<{ items: ResourceCatalogItem[] }>("/resources/catalog");
  return data.items;
}

export async function getResourceDocument(slug: string): Promise<ResourceDocument> {
  const { data } = await apiClient.get<ResourceDocument>(`/resources/docs/${slug}`);
  return data;
}

async function downloadBlob(path: string, fallbackFilename: string): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.get(path, { responseType: "blob" });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;
  return { blob: response.data as Blob, filename };
}

export async function downloadQaSopPackZip(): Promise<{ blob: Blob; filename: string }> {
  return downloadBlob("/resources/qa-pack/download", "LMCPAFM-QA-SOP-Pack.zip");
}

export async function downloadCombinedQaMarkdown(): Promise<{ blob: Blob; filename: string }> {
  return downloadBlob("/resources/qa-pack/combined.md", "LMCPAFM-QA-Validation-Pack.md");
}
