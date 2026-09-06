# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""``present_flight_results``: cross-site ticket shortlist for chat."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from commerce_common.presentation import EnrichmentContext, PresentationExtension
from shopping_agent import ShoppingSessionState


class FlightResultsPayload(BaseModel):
    title: str = Field(max_length=80)
    product_ids: list[str] = Field(min_length=1, max_length=12)
    note: str | None = Field(default=None, max_length=280)


_INPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "maxLength": 80},
        "product_ids": {
            "type": "array",
            "minItems": 1,
            "maxItems": 12,
            "items": {"type": "string"},
        },
        "note": {"type": "string", "maxLength": 280},
    },
    "required": ["title", "product_ids"],
    "additionalProperties": False,
}


async def _enrich(payload: FlightResultsPayload, context: EnrichmentContext) -> dict[str, Any]:
    items = []
    for product_id in payload.product_ids:
        product = context.state.seen_products.get(product_id)
        if product is None:
            continue
        items.append(
            {
                "product": product.model_dump(exclude_none=True),
                "source_site": (product.attributes or {}).get("source_site"),
                "source_site_name": (product.attributes or {}).get("source_site_name"),
            }
        )
    result: dict[str, Any] = {"title": payload.title, "items": items}
    if payload.note:
        result["note"] = payload.note
    if items:
        cheapest = min(items, key=lambda row: row["product"]["price"])
        result["best_product_id"] = cheapest["product"]["product_id"]
        result["sites"] = sorted(
            {
                row["source_site_name"]
                for row in items
                if row.get("source_site_name")
            }
        )
    return result


def _enrich_partial(data: dict[str, Any], state: ShoppingSessionState) -> dict[str, Any] | None:
    product_ids = data.get("product_ids") or []
    items = [
        {
            "product": state.seen_products[pid].model_dump(exclude_none=True),
            "source_site": (state.seen_products[pid].attributes or {}).get("source_site"),
            "source_site_name": (state.seen_products[pid].attributes or {}).get(
                "source_site_name"
            ),
        }
        for pid in product_ids
        if isinstance(pid, str) and pid in state.seen_products
    ]
    if not items and not data.get("title"):
        return None
    payload: dict[str, Any] = {"title": data.get("title") or "", "items": items}
    if data.get("note"):
        payload["note"] = data["note"]
    return payload


def build_flight_results_extension() -> PresentationExtension:
    return PresentationExtension(
        name="present_flight_results",
        component="flight_results",
        description=(
            "Show a cross-site ticket shortlist after searching Expedia, Google Flights, "
            "and/or Travelocity. Pass product_ids from this session's flight search "
            "results; the UI fills prices and source_site badges from the catalog."
        ),
        input_schema=_INPUT_SCHEMA,
        payload_model=FlightResultsPayload,
        enrich=_enrich,
        enrich_partial=_enrich_partial,
    )
