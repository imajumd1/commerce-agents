// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState } from "react";
import type { FlightSearchRequest } from "@/lib/types";

const FIELD =
  "w-full rounded-(--radius) border border-(--line) bg-(--surface) px-3 py-2 text-[14px] text-(--ink) outline-none focus:border-(--accent)";

const LABEL = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-(--ink-soft)";

export default function FlightSearchForm({
  initial,
  busy,
  onSearch,
}: {
  initial?: Partial<FlightSearchRequest>;
  busy?: boolean;
  onSearch: (request: FlightSearchRequest) => void;
}) {
  const [origin, setOrigin] = useState(initial?.origin ?? "New York");
  const [destination, setDestination] = useState(initial?.destination ?? "Lisbon");
  const [departDate, setDepartDate] = useState(initial?.depart_date ?? "2026-10-15");
  const [returnDate, setReturnDate] = useState(initial?.return_date ?? "2026-10-22");
  const [adults, setAdults] = useState(initial?.adults ?? 2);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const [budget, setBudget] = useState(initial?.budget ? String(initial.budget) : "2500");

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedBudget = Number(budget);
        onSearch({
          origin: origin.trim(),
          destination: destination.trim(),
          depart_date: departDate,
          return_date: returnDate,
          adults,
          children,
          budget: Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : null,
          query: `flights from ${origin} to ${destination}`,
          limit: 12,
        });
      }}
    >
      <label className="block">
        <span className={LABEL}>From</span>
        <input className={FIELD} value={origin} onChange={(e) => setOrigin(e.target.value)} required />
      </label>
      <label className="block">
        <span className={LABEL}>To</span>
        <input className={FIELD} value={destination} onChange={(e) => setDestination(e.target.value)} required />
      </label>
      <label className="block">
        <span className={LABEL}>Depart</span>
        <input className={FIELD} type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} required />
      </label>
      <label className="block">
        <span className={LABEL}>Return</span>
        <input className={FIELD} type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
      </label>
      <label className="block">
        <span className={LABEL}>Adults</span>
        <input
          className={FIELD}
          type="number"
          min={1}
          max={9}
          value={adults}
          onChange={(e) => setAdults(Number(e.target.value) || 1)}
        />
      </label>
      <label className="block">
        <span className={LABEL}>Children</span>
        <input
          className={FIELD}
          type="number"
          min={0}
          max={9}
          value={children}
          onChange={(e) => setChildren(Number(e.target.value) || 0)}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className={LABEL}>Budget (USD, all travelers)</span>
        <input className={FIELD} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="btn-primary inline-flex items-center justify-center rounded-(--radius) px-4 py-2.5 text-[14px] font-semibold disabled:opacity-50"
        >
          {busy ? "Searching sites…" : "Search tickets"}
        </button>
      </div>
    </form>
  );
}
