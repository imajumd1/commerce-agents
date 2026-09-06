// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  checkWatch,
  createPriceWatch,
  fetchSavedSearches,
  fetchWatches,
  saveFlightSearch,
  searchFlights,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { FlightSearchRequest, Product, SavedSearch, ShoppingSite, PriceWatch } from "@/lib/types";
import FlightResults from "../FlightResults";
import FlightSearchForm from "../FlightSearchForm";
import SitePicker, { useShoppingSites } from "../SitePicker";

export function SearchView({ ready = true }: { ready?: boolean }) {
  const { sites, setSites } = useShoppingSites(ready);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<FlightSearchRequest | null>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const runSearch = useCallback(async (next: FlightSearchRequest) => {
    setBusy(true);
    setStatus(null);
    setRequest(next);
    const data = await searchFlights(next);
    setResults(data?.results ?? []);
    setBusy(false);
  }, []);

  const onSave = useCallback(async () => {
    if (!request || !results.length) return;
    const saved = await saveFlightSearch({
      title: `${request.origin} → ${request.destination}`,
      request,
      results,
    });
    setStatus(saved ? "Results saved." : "Could not save results.");
  }, [request, results]);

  const onWatch = useCallback(async () => {
    if (!request) return;
    const budget = request.budget ?? results[0]?.price ?? 0;
    const watch = await createPriceWatch({
      title: `Watch ${request.origin} → ${request.destination}`,
      request,
      budget,
      baseline_price: results[0]?.price ?? null,
    });
    setStatus(watch ? "Price watch created — check it under Watches." : "Could not create watch.");
  }, [request, results]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-1 py-2">
      <header>
        <h1 className="al-hero">
          Search <em>tickets</em>
        </h1>
        <p className="mt-2 max-w-[60ch] text-[15px] text-(--ink-2)">
          Compare fares across the shopping sites you enable. Results appear immediately from every selected site.
        </p>
      </header>
      <section className="rounded-(--radius-lg) border border-(--line) bg-(--card) p-4 shadow-(--shadow-sm)">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-(--ink-soft)">Shopping sites</h2>
        <SitePicker sites={sites} onChange={setSites} />
      </section>
      <section className="rounded-(--radius-lg) border border-(--line) bg-(--card) p-4 shadow-(--shadow-sm)">
        <FlightSearchForm busy={busy} onSearch={(req) => void runSearch(req)} />
      </section>
      <section className="rounded-(--radius-lg) border border-(--line) bg-(--card) p-4 shadow-(--shadow-sm)">
        <FlightResults
          results={results}
          request={request}
          busy={busy}
          onSave={results.length ? () => void onSave() : undefined}
          onWatch={results.length ? () => void onWatch() : undefined}
          status={status}
        />
      </section>
      <EnabledSitesNote sites={sites} />
    </div>
  );
}

function EnabledSitesNote({ sites }: { sites: ShoppingSite[] | null }) {
  if (!sites) return null;
  const names = sites.filter((s) => s.enabled).map((s) => s.name);
  return (
    <p className="text-[12.5px] text-(--ink-soft)">
      Agent ticket searches use: {names.length ? names.join(", ") : "none selected"}.
    </p>
  );
}

export function WatchesView({ ready = true }: { ready?: boolean }) {
  const [saved, setSaved] = useState<SavedSearch[] | null>(null);
  const [watches, setWatches] = useState<PriceWatch[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!ready) return;
    const [nextSaved, nextWatches] = await Promise.all([fetchSavedSearches(), fetchWatches()]);
    if (nextSaved) setSaved(nextSaved);
    if (nextWatches) setWatches(nextWatches);
  }, [ready]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!watches?.length) return;
    const timer = window.setInterval(() => {
      void (async () => {
        for (const watch of watches.filter((w) => w.active)) {
          await checkWatch(watch.id);
        }
        await reload();
      })();
    }, 45000);
    return () => window.clearInterval(timer);
  }, [watches, reload]);

  const onCheck = async (watchId: string) => {
    setMessage(null);
    const updated = await checkWatch(watchId);
    if (!updated) {
      setMessage("Check failed.");
      return;
    }
    setMessage(updated.alerts[0]?.message ?? "Checked — no new under-budget fare yet.");
    await reload();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-1 py-2">
      <header>
        <h1 className="al-hero">
          Saved &amp; <em>watches</em>
        </h1>
        <p className="mt-2 max-w-[60ch] text-[15px] text-(--ink-2)">
          Keep fare shortlists and get in-app alerts when a simulated price drops to your budget.
        </p>
      </header>
      {message ? <p className="text-[13px] font-semibold text-(--ok)">{message}</p> : null}

      <section className="rounded-(--radius-lg) border border-(--line) bg-(--card) p-4 shadow-(--shadow-sm)">
        <h2 className="mb-3 text-[15px] font-semibold text-(--ink)">Price watches</h2>
        {!watches ? (
          <p className="text-[13px] text-(--ink-soft)">Loading…</p>
        ) : watches.length === 0 ? (
          <p className="text-[13px] text-(--ink-soft)">No watches yet. Create one from Search results.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {watches.map((watch) => (
              <li key={watch.id} className="rounded-(--radius) border border-(--line) bg-(--surface) p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-(--ink)">{watch.title}</h3>
                    <p className="text-[12.5px] text-(--ink-soft)">
                      Budget {formatPrice(watch.budget)}
                      {watch.baseline_price != null ? ` · last best ${formatPrice(watch.baseline_price)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onCheck(watch.id)}
                    className="rounded-full border border-(--ink) bg-(--ink) px-3 py-1.5 text-[12px] font-semibold text-(--surface)"
                  >
                    Check prices
                  </button>
                </div>
                {watch.alerts[0] ? (
                  <p className="mt-2 rounded-lg bg-(--ok-soft) px-2.5 py-2 text-[13px] text-(--ok)">
                    {watch.alerts[0].message}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-(--radius-lg) border border-(--line) bg-(--card) p-4 shadow-(--shadow-sm)">
        <h2 className="mb-3 text-[15px] font-semibold text-(--ink)">Saved searches</h2>
        {!saved ? (
          <p className="text-[13px] text-(--ink-soft)">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="text-[13px] text-(--ink-soft)">No saved result sets yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {saved.map((item) => (
              <li key={item.id} className="rounded-(--radius) border border-(--line) bg-(--surface) p-3">
                <h3 className="font-semibold text-(--ink)">{item.title}</h3>
                <p className="text-[12.5px] text-(--ink-soft)">
                  {item.results.length} fare{item.results.length === 1 ? "" : "s"} · saved {item.created_at.slice(0, 10)}
                </p>
                <p className="mt-1 text-[13px] text-(--ink-2)">
                  Best: {item.results[0] ? formatPrice(item.results[0].price) : "—"} via{" "}
                  {item.results[0]?.attributes?.source_site_name ?? "site"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
