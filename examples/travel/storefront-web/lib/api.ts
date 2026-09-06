// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { AgentApi } from "web-shared";
import type {
  FlightSearchRequest,
  FlightSearchResponse,
  Product,
  SavedSearch,
  ShoppingSite,
  PriceWatch,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export const api = new AgentApi(API_URL, "/api");

export const UNREACHABLE =
  "Couldn't reach the travel API on port 8001. Start it with " +
  "`uvicorn travel.api.main:app --app-dir examples --port 8001` and try again.";

export async function fetchProducts(): Promise<Product[] | null> {
  const data = await api.get<{ products: Product[] }>("/products", { limit: "100" });
  return data?.products ?? null;
}

async function putJson<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${api.base}${path}`, {
      method: "PUT",
      headers: api.headers(true),
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchSites(): Promise<ShoppingSite[] | null> {
  const data = await api.get<{ sites: ShoppingSite[] }>("/sites");
  return data?.sites ?? null;
}

export async function updateSites(enabled: Record<string, boolean>): Promise<ShoppingSite[] | null> {
  const data = await putJson<{ sites: ShoppingSite[] }>("/sites", { enabled });
  return data?.sites ?? null;
}

export async function searchFlights(body: FlightSearchRequest): Promise<FlightSearchResponse | null> {
  return api.post<FlightSearchResponse>("/flight-search", body);
}

export async function saveFlightSearch(body: {
  title: string;
  request: FlightSearchRequest;
  results: Product[];
}): Promise<SavedSearch | null> {
  const data = await api.post<{ saved: SavedSearch }>("/saved-searches", body);
  return data?.saved ?? null;
}

export async function fetchSavedSearches(): Promise<SavedSearch[] | null> {
  const data = await api.get<{ saved: SavedSearch[] }>("/saved-searches");
  return data?.saved ?? null;
}

export async function createPriceWatch(body: {
  title: string;
  request: FlightSearchRequest;
  budget: number;
  baseline_price?: number | null;
}): Promise<PriceWatch | null> {
  const data = await api.post<{ watch: PriceWatch }>("/watches", body);
  return data?.watch ?? null;
}

export async function fetchWatches(): Promise<PriceWatch[] | null> {
  const data = await api.get<{ watches: PriceWatch[] }>("/watches");
  return data?.watches ?? null;
}

export async function checkWatch(watchId: string): Promise<PriceWatch | null> {
  const data = await api.post<{ watch: PriceWatch }>(`/watches/${watchId}/check`);
  return data?.watch ?? null;
}
