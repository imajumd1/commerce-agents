// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSites, updateSites } from "@/lib/api";
import type { ShoppingSite } from "@/lib/types";

export default function SitePicker({
  sites,
  onChange,
}: {
  sites: ShoppingSite[] | null;
  onChange: (sites: ShoppingSite[]) => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(
    async (siteId: string, enabled: boolean) => {
      if (!sites) return;
      setBusy(true);
      const next = Object.fromEntries(sites.map((s) => [s.site_id, s.site_id === siteId ? enabled : s.enabled]));
      // Keep at least one site on so searches never return empty by configuration alone.
      if (!Object.values(next).some(Boolean)) {
        setBusy(false);
        return;
      }
      const updated = await updateSites(next);
      if (updated) onChange(updated);
      setBusy(false);
    },
    [onChange, sites],
  );

  if (!sites?.length) {
    return (
      <p className="text-[13px] text-(--ink-soft)">Loading shopping sites…</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sites.map((site) => (
        <button
          key={site.site_id}
          type="button"
          disabled={busy}
          onClick={() => void toggle(site.site_id, !site.enabled)}
          aria-pressed={site.enabled}
          title={site.description}
          className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
            site.enabled
              ? "border-(--ink) bg-(--ink) text-(--surface)"
              : "border-(--line) bg-(--surface) text-(--ink-soft)"
          }`}
        >
          {site.name}
        </button>
      ))}
    </div>
  );
}

export function useShoppingSites(ready = true) {
  const [sites, setSites] = useState<ShoppingSite[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void fetchSites().then((next) => {
      if (!cancelled && next) setSites(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return { sites, setSites };
}
