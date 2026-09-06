// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { formatPrice } from "@/lib/format";
import type { FlightSearchRequest, Product } from "@/lib/types";

function siteBadge(product: Product): string {
  return product.attributes?.source_site_name ?? product.attributes?.source_site ?? "Site";
}

export default function FlightResults({
  results,
  request,
  busy,
  onSave,
  onWatch,
  status,
}: {
  results: Product[];
  request: FlightSearchRequest | null;
  busy?: boolean;
  onSave?: () => void;
  onWatch?: () => void;
  status?: string | null;
}) {
  if (busy) {
    return <p className="text-[14px] text-(--ink-soft)">Checking Expedia, Google Flights, and Travelocity…</p>;
  }
  if (!request) {
    return <p className="text-[14px] text-(--ink-soft)">Enter trip details to compare fares across your shopping sites.</p>;
  }
  if (!results.length) {
    return (
      <p className="text-[14px] text-(--ink-soft)">
        No fares matched on the enabled sites. Try different dates, cities, or raise the budget.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-(--ink-2)">
          {results.length} fare{results.length === 1 ? "" : "s"} · {request.origin} → {request.destination}
        </p>
        <div className="flex flex-wrap gap-2">
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              className="rounded-full border border-(--line) bg-(--surface) px-3 py-1.5 text-[12.5px] font-semibold text-(--ink)"
            >
              Save results
            </button>
          ) : null}
          {onWatch ? (
            <button
              type="button"
              onClick={onWatch}
              className="rounded-full border border-(--ink) bg-(--ink) px-3 py-1.5 text-[12.5px] font-semibold text-(--surface)"
            >
              Create price watch
            </button>
          ) : null}
        </div>
      </div>
      {status ? <p className="text-[12.5px] font-semibold text-(--ok)">{status}</p> : null}
      <ul className="flex flex-col gap-2.5">
        {results.map((product) => (
          <li
            key={product.product_id}
            className="rounded-(--radius-lg) border border-(--line) bg-(--surface) px-3.5 py-3 shadow-(--shadow-sm)"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-(--accent-soft) px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-(--accent-ink)">
                    {siteBadge(product)}
                  </span>
                  {product.labels?.slice(0, 2).map((label) => (
                    <span key={label} className="text-[11px] font-semibold text-(--ink-soft)">
                      {label}
                    </span>
                  ))}
                </div>
                <h3 className="al-display text-[17px] font-semibold leading-snug text-(--ink)">{product.title}</h3>
                <p className="mt-1 text-[13px] text-(--ink-2)">{product.short_description}</p>
              </div>
              <div className="text-right">
                <div className="al-display text-[22px] font-semibold text-(--ink)">{formatPrice(product.price)}</div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-(--ink-soft)">
                  {product.attributes?.price_unit?.replace(/_/g, " ") ?? "fare"}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
