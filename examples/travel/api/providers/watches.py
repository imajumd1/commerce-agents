# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""In-memory saved flight result sets and price watches for the demo storefront."""

from __future__ import annotations

import uuid
import zlib
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any

from shopping_agent import ProductDetails

from .base import FlightSearchRequest
from .fanout import fanout_search
from .registry import SiteRegistry


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class SavedSearch:
    id: str
    session_id: str
    title: str
    request: dict[str, Any]
    results: list[dict[str, Any]]
    created_at: str


@dataclass
class PriceWatch:
    id: str
    session_id: str
    title: str
    request: dict[str, Any]
    budget: float
    baseline_price: float | None
    active: bool = True
    created_at: str = ""
    last_checked_at: str | None = None
    check_count: int = 0
    alerts: list[dict[str, Any]] = field(default_factory=list)


class WatchStore:
    def __init__(self) -> None:
        self._saved: dict[str, SavedSearch] = {}
        self._watches: dict[str, PriceWatch] = {}

    def save_search(
        self,
        session_id: str,
        *,
        title: str,
        request: dict[str, Any],
        results: list[dict[str, Any]],
    ) -> SavedSearch:
        record = SavedSearch(
            id=str(uuid.uuid4()),
            session_id=session_id,
            title=title,
            request=request,
            results=results,
            created_at=_now(),
        )
        self._saved[record.id] = record
        return record

    def list_saved(self, session_id: str) -> list[SavedSearch]:
        return sorted(
            (s for s in self._saved.values() if s.session_id == session_id),
            key=lambda s: s.created_at,
            reverse=True,
        )

    def create_watch(
        self,
        session_id: str,
        *,
        title: str,
        request: dict[str, Any],
        budget: float,
        baseline_price: float | None,
    ) -> PriceWatch:
        watch = PriceWatch(
            id=str(uuid.uuid4()),
            session_id=session_id,
            title=title,
            request=request,
            budget=budget,
            baseline_price=baseline_price,
            created_at=_now(),
        )
        self._watches[watch.id] = watch
        return watch

    def list_watches(self, session_id: str) -> list[PriceWatch]:
        return sorted(
            (w for w in self._watches.values() if w.session_id == session_id),
            key=lambda w: w.created_at,
            reverse=True,
        )

    def get_watch(self, session_id: str, watch_id: str) -> PriceWatch | None:
        watch = self._watches.get(watch_id)
        if watch is None or watch.session_id != session_id:
            return None
        return watch

    def check_watch(
        self,
        session_id: str,
        watch_id: str,
        *,
        registry: SiteRegistry,
        products: dict[str, ProductDetails],
    ) -> PriceWatch | None:
        watch = self.get_watch(session_id, watch_id)
        if watch is None or not watch.active:
            return watch
        req_data = {
            k: v for k, v in watch.request.items() if k in _REQUEST_FIELDS and v is not None
        }
        if req_data.get("budget") is None:
            req_data["budget"] = watch.budget
        req_data.setdefault("adults", 1)
        req_data.setdefault("children", 0)
        req_data.setdefault("limit", 8)
        req = FlightSearchRequest(**req_data)
        offers = fanout_search(registry, products, req)
        # Deterministic demo drop: every other check nudges the best fare under budget.
        watch.check_count += 1
        watch.last_checked_at = _now()
        if not offers:
            return watch
        best = offers[0]
        # Keep the refreshed quote addressable for provenance / UI.
        products[best.product_id] = best
        quoted = best.price
        seed = zlib.crc32(f"{watch.id}:{watch.check_count}".encode())
        if watch.check_count % 2 == 0 or (seed % 3 == 0):
            quoted = round(min(quoted, watch.budget * 0.92), 2)
            best.price = quoted
        if quoted <= watch.budget:
            alert = {
                "id": str(uuid.uuid4()),
                "created_at": _now(),
                "message": (
                    f"Fare at or under ${watch.budget:.0f}: {best.title} "
                    f"from {best.attributes.get('source_site_name', 'a site')} at ${quoted:.0f}"
                ),
                "best_price": quoted,
                "product_id": best.product_id,
                "source_site": best.attributes.get("source_site"),
            }
            watch.alerts.insert(0, alert)
            watch.baseline_price = quoted
        return watch


_REQUEST_FIELDS = {
    "origin",
    "destination",
    "depart_date",
    "return_date",
    "adults",
    "children",
    "budget",
    "query",
    "limit",
}


def watch_payload(watch: PriceWatch) -> dict[str, Any]:
    return asdict(watch)


def saved_payload(saved: SavedSearch) -> dict[str, Any]:
    return asdict(saved)
