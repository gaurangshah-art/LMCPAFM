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
