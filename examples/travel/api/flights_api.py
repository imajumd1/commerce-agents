# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Sites, structured flight search, saved searches, and in-app price watches.

Route params use ``host.CurrentSession`` as a live dependency, so annotations are
evaluated eagerly (no ``from __future__ import annotations``), matching demo_common.
"""

from typing import Any, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field

from .mock_travel import MockTravel
from .providers import FlightSearchRequest, WatchStore, saved_payload, watch_payload


class SitesUpdate(BaseModel):
    enabled: dict[str, bool] = Field(default_factory=dict)


class FlightSearchBody(BaseModel):
    origin: str = Field(default="", max_length=80)
    destination: str = Field(default="", max_length=80)
    depart_date: str = Field(default="", max_length=32)
    return_date: str = Field(default="", max_length=32)
    adults: int = Field(default=1, ge=1, le=9)
    children: int = Field(default=0, ge=0, le=9)
    budget: Optional[float] = Field(default=None, ge=0)
    query: str = Field(default="", max_length=200)
    limit: int = Field(default=12, ge=1, le=24)


class SaveSearchBody(BaseModel):
    title: str = Field(default="Saved flight search", max_length=120)
    request: dict[str, Any] = Field(default_factory=dict)
    results: list[dict[str, Any]] = Field(default_factory=list)


class CreateWatchBody(BaseModel):
    title: str = Field(default="Price watch", max_length=120)
    request: dict[str, Any] = Field(default_factory=dict)
    budget: float = Field(ge=0)
    baseline_price: Optional[float] = None


def mount_flights_routes(host: Any, backend: MockTravel, watches: WatchStore) -> None:
    """Attach flight personalization routes onto an existing StorefrontHost."""
    CurrentSession = host.CurrentSession

    @host.app.get("/api/sites")
    def list_sites(record: CurrentSession) -> dict[str, Any]:
        del record
        return {"sites": backend.sites.list_sites()}

    @host.app.put("/api/sites")
    def update_sites(body: SitesUpdate, record: CurrentSession) -> dict[str, Any]:
        del record
        return {"sites": backend.sites.set_enabled(body.enabled)}

    @host.app.post("/api/flight-search")
    async def flight_search(body: FlightSearchBody, record: CurrentSession) -> dict[str, Any]:
        request = FlightSearchRequest(
            origin=body.origin.strip(),
            destination=body.destination.strip(),
            depart_date=body.depart_date.strip(),
            return_date=body.return_date.strip(),
            adults=body.adults,
            children=body.children,
            budget=body.budget,
            query=body.query.strip() or "flights tickets",
            limit=body.limit,
        )
        offers = await backend.search_flights(request)
        record.state.remember_products(list(offers))
        results = [offer.model_dump(exclude_none=True) for offer in offers]
        return {
            "request": request.__dict__,
            "sites": [s for s in backend.sites.list_sites() if s["enabled"]],
            "results": results,
            "count": len(results),
        }

    @host.app.post("/api/saved-searches")
    def save_search(body: SaveSearchBody, record: CurrentSession) -> dict[str, Any]:
        saved = watches.save_search(
            record.session_id,
            title=body.title,
            request=body.request,
            results=body.results,
        )
        return {"saved": saved_payload(saved)}

    @host.app.get("/api/saved-searches")
    def list_saved(record: CurrentSession) -> dict[str, Any]:
        return {"saved": [saved_payload(s) for s in watches.list_saved(record.session_id)]}

    @host.app.post("/api/watches")
    def create_watch(body: CreateWatchBody, record: CurrentSession) -> dict[str, Any]:
        watch = watches.create_watch(
            record.session_id,
            title=body.title,
            request=body.request,
            budget=body.budget,
            baseline_price=body.baseline_price,
        )
        return {"watch": watch_payload(watch)}

    @host.app.get("/api/watches")
    def list_watches(record: CurrentSession) -> dict[str, Any]:
        return {"watches": [watch_payload(w) for w in watches.list_watches(record.session_id)]}

    @host.app.post("/api/watches/{watch_id}/check")
    def check_watch(watch_id: str, record: CurrentSession) -> dict[str, Any]:
        watch = watches.check_watch(
            record.session_id,
            watch_id,
            registry=backend.sites,
            products=backend.products,
        )
        if watch is None:
            raise HTTPException(status_code=404, detail="Watch not found")
        for alert in watch.alerts[:1]:
            pid = alert.get("product_id")
            if pid and pid in backend.products:
                record.state.seen_products[pid] = backend.products[pid]
        return {"watch": watch_payload(watch)}
