# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""HTTP coverage for sites, flight-search, saved searches, and watches."""

from demo_common import SESSION_HEADER
from demo_common.tests.fixtures import start_shopper


def test_sites_list_and_toggle(main, client):
    headers = start_shopper(client)
    listed = client.get("/api/sites", headers=headers)
    assert listed.status_code == 200
    sites = listed.json()["sites"]
    assert {s["site_id"] for s in sites} == {"expedia", "google_flights", "travelocity"}
    assert all(s["enabled"] for s in sites)

    updated = client.put(
        "/api/sites",
        headers=headers,
        json={"enabled": {"expedia": True, "google_flights": False, "travelocity": True}},
    )
    assert updated.status_code == 200
    by_id = {s["site_id"]: s["enabled"] for s in updated.json()["sites"]}
    assert by_id == {"expedia": True, "google_flights": False, "travelocity": True}


def test_flight_search_save_and_watch(main, client):
    headers = start_shopper(client)
    client.put(
        "/api/sites",
        headers=headers,
        json={"enabled": {"expedia": True, "google_flights": True, "travelocity": True}},
    )
    search = client.post(
        "/api/flight-search",
        headers=headers,
        json={
            "origin": "New York",
            "destination": "Lisbon",
            "depart_date": "2026-10-15",
            "return_date": "2026-10-22",
            "adults": 2,
            "children": 0,
            "budget": 2500,
        },
    )
    assert search.status_code == 200
    body = search.json()
    assert body["count"] >= 1
    assert body["results"]
    assert all(r["attributes"]["source_site"] for r in body["results"])

    saved = client.post(
        "/api/saved-searches",
        headers=headers,
        json={
            "title": "NYC to Lisbon",
            "request": body["request"],
            "results": body["results"],
        },
    )
    assert saved.status_code == 200
    assert saved.json()["saved"]["title"] == "NYC to Lisbon"

    listed_saved = client.get("/api/saved-searches", headers=headers)
    assert listed_saved.status_code == 200
    assert len(listed_saved.json()["saved"]) == 1

    watch = client.post(
        "/api/watches",
        headers=headers,
        json={
            "title": "NYC-LIS watch",
            "request": body["request"],
            "budget": 2500,
            "baseline_price": body["results"][0]["price"],
        },
    )
    assert watch.status_code == 200
    watch_id = watch.json()["watch"]["id"]

    checked = client.post(f"/api/watches/{watch_id}/check", headers=headers)
    assert checked.status_code == 200
    # Second check forces a deterministic under-budget demo alert.
    checked = client.post(f"/api/watches/{watch_id}/check", headers=headers)
    assert checked.status_code == 200
    assert checked.json()["watch"]["alerts"]

    # Structured search stamps provenance so the session can present those fares.
    record = main.host.sessions.require(headers[SESSION_HEADER])
    assert body["results"][0]["product_id"] in record.state.seen_products
