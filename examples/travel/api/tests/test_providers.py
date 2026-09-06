# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Multi-site ticket fan-out, site toggles, and in-app price watches."""

from shopping_agent import SearchFilters
from travel.api.providers import FlightSearchRequest, WatchStore


async def test_flight_search_fans_out_across_three_sites(backend, session):
    results = await backend.search_products(
        session,
        "tickets",
        SearchFilters(
            category="flights",
            attributes={
                "origin_city": "New York",
                "destination_city": "Lisbon",
                "travel_date": "2026-10-15",
                "adults": "2",
            },
        ),
        limit=12,
    )
    assert results
    sites = {p.attributes.get("source_site") for p in results}
    assert sites == {"expedia", "google_flights", "travelocity"}
    assert results == sorted(results, key=lambda p: p.price)


async def test_site_toggle_limits_fanout(backend, session):
    backend.sites.set_enabled(
        {"expedia": True, "google_flights": False, "travelocity": False}
    )
    results = await backend.search_products(
        session,
        "flight tickets",
        SearchFilters(
            category="flights",
            attributes={"origin_city": "New York", "destination_city": "Lisbon"},
        ),
        limit=12,
    )
    assert results
    assert {p.attributes.get("source_site") for p in results} == {"expedia"}


async def test_structured_search_flights_and_budget(backend):
    offers = await backend.search_flights(
        FlightSearchRequest(
            origin="New York",
            destination="Lisbon",
            depart_date="2026-10-15",
            adults=2,
            budget=2500,
            limit=12,
        )
    )
    assert offers
    assert all(offer.price <= 2500 for offer in offers)
    assert all(offer.product_id in backend.products for offer in offers)


def test_price_watch_alerts_when_fare_at_or_under_budget(backend):
    watches = WatchStore()
    watch = watches.create_watch(
        "sess-1",
        title="NYC-LIS",
        request={
            "origin": "New York",
            "destination": "Lisbon",
            "depart_date": "2026-10-15",
            "adults": 1,
            "children": 0,
            "limit": 8,
        },
        budget=10_000,
        baseline_price=900,
    )
    checked = watches.check_watch(
        "sess-1",
        watch.id,
        registry=backend.sites,
        products=backend.products,
    )
    assert checked is not None
    assert checked.check_count == 1
    # First check or a seeded drop should produce an under-budget alert at this ceiling.
    checked = watches.check_watch(
        "sess-1",
        watch.id,
        registry=backend.sites,
        products=backend.products,
    )
    assert checked is not None
    assert checked.alerts, "expected an in-app alert when fares are under budget"
    assert checked.alerts[0]["best_price"] <= watch.budget
