// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { formatPrice } from "@/lib/format";
import type { FlightResultsPayload } from "@/lib/types";
import { BODY, CARD, DISPLAY, META } from "./shared";

export default function FlightResultsCard({
  payload,
  partial,
}: {
  payload: FlightResultsPayload;
  partial?: boolean;
}) {
  const items = payload.items ?? [];
  return (
    <div style={{ ...CARD, padding: 16, opacity: partial ? 0.85 : 1 }}>
      <div style={{ ...META, marginBottom: 6 }}>Cross-site tickets</div>
      <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 650, margin: 0, color: "var(--ink)" }}>
        {payload.title || "Ticket options"}
      </h3>
      {payload.note ? (
        <p style={{ fontFamily: BODY, fontSize: 14, color: "var(--ink-2)", marginTop: 8 }}>{payload.note}</p>
      ) : null}
      {payload.sites?.length ? (
        <p style={{ fontFamily: BODY, fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
          Sites: {payload.sites.join(" · ")}
        </p>
      ) : null}
      <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 10 }}>
        {items.map((item) => {
          const best = item.product.product_id === payload.best_product_id;
          return (
            <li
              key={item.product.product_id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                background: best ? "var(--ok-soft)" : "var(--surface)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ ...META, color: "var(--accent-ink)" }}>
                    {item.source_site_name ?? item.source_site ?? "Site"}
                    {best ? " · best" : ""}
                  </div>
                  <div style={{ fontFamily: BODY, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
                    {item.product.title}
                  </div>
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 650, color: "var(--ink)" }}>
                  {formatPrice(item.product.price)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
