// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** Mirrors shopping_agent/types.py and tools/presentation.py; detail extras are the vertical's api/. */

export interface Product {
  product_id: string;
  title: string;
  brand?: string | null;
  price: number;
  currency?: string;
  rating?: number | null;
  review_count?: number | null;
  image_url?: string | null;
  category?: string | null;
  labels?: string[];
  attributes?: Record<string, string>;
  in_stock?: boolean;
  short_description?: string | null;
  /** Options still to choose on a family record; the cart takes one of its variants. */
  options?: Record<string, string[]>;
  /** A variant's value for each option. */
  option_values?: Record<string, string>;
  variant_of?: string | null;
}

export interface CartItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  option_values?: Record<string, string>;
  variant_of?: string | null;
  line_total: number;
}

export interface CartPayload {
  items: CartItem[];
  /** Sum of quantities. */
  item_count: number;
  subtotal: number;
  currency: string;
}

// --- Presentation payloads, as streamed after server enrichment ---

export interface ProductsPayload {
  title?: string;
  layout?: "carousel" | "grid" | "list";
  items: { product: Product; reason?: string | null }[];
}

export interface ComparisonPayload {
  title?: string;
  entries: {
    product_id: string;
    product: Product;
    pros?: string[];
    cons?: string[];
    best_for?: string | null;
  }[];
  dimensions?: string[];
  recommended_product_id?: string | null;
  // Stamped by the server: the spread between the cheapest and dearest compared items.
  price_delta?: {
    amount: number;
    low_product_id: string;
    low_price: number;
    high_product_id: string;
    high_price: number;
  };
}

export interface PlanPayload {
  title: string;
  intro?: string;
  steps: { label: string; detail?: string | null; products: Product[] }[];
}

export interface GuidePayload {
  title: string;
  sections: { heading: string; body: string }[];
  related_products?: Product[];
  sources?: string[];
}

export interface OrderStatusPayload {
  order_id: string;
  summary: string;
  next_step?: string;
  order?: {
    order_id: string;
    status: string;
    placed_at: string;
    items: { product_id: string; title: string; quantity: number; price: number }[];
    total: number;
    currency?: string;
    estimated_delivery?: string;
    tracking_url?: string;
  };
}

export interface CheckoutHandoff {
  url: string;
  label?: string;
  seller?: string;
}

export interface CheckoutPayload {
  /** Where payment happens when it is not a route in this app; filled by the backend. */
  handoffs?: CheckoutHandoff[];
  note?: string;
  fulfillment_method?: "delivery" | "pickup" | "shipping";
  cart: CartPayload;
}

/** `present_itinerary`; `days[].products` are enriched server-side. */
export interface ItineraryPayload {
  title: string;
  travel_dates?: string;
  days: { label: string; note?: string; products: Product[] }[];
}

/** `present_flight_results`; cross-site ticket shortlist. */
export interface FlightResultsPayload {
  title: string;
  note?: string;
  items: {
    product: Product;
    source_site?: string;
    source_site_name?: string;
  }[];
  best_product_id?: string;
  sites?: string[];
}

export interface ShoppingSite {
  site_id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string;
  adults: number;
  children: number;
  budget?: number | null;
  query?: string;
  limit?: number;
}

export interface FlightSearchResponse {
  request: FlightSearchRequest;
  sites: ShoppingSite[];
  results: Product[];
  count: number;
}

export interface SavedSearch {
  id: string;
  session_id: string;
  title: string;
  request: FlightSearchRequest;
  results: Product[];
  created_at: string;
}

export interface PriceWatchAlert {
  id: string;
  created_at: string;
  message: string;
  best_price: number;
  product_id: string;
  source_site?: string;
}

export interface PriceWatch {
  id: string;
  session_id: string;
  title: string;
  request: FlightSearchRequest;
  budget: number;
  baseline_price: number | null;
  active: boolean;
  created_at: string;
  last_checked_at: string | null;
  check_count: number;
  alerts: PriceWatchAlert[];
}
