# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

from __future__ import annotations

from shopping_agent import ProductDetails

from .base import FlightSearchRequest, SiteInfo
from .synthesize import request_matches_flight, synthesize_offer

SITE = SiteInfo(
    site_id="google_flights",
    name="Google Flights",
    description="Metasearch fares ranked for schedule and price transparency",
)


class GoogleFlightsAdapter:
    site = SITE

    def search(
        self, request: FlightSearchRequest, catalog_flights: list[ProductDetails]
    ) -> list[ProductDetails]:
        matches = [f for f in catalog_flights if request_matches_flight(f, request)]
        return [
            synthesize_offer(
                base=flight,
                site=SITE,
                request=request,
                price_factor=1.02,
                label="Google Flights",
                brand_suffix=flight.brand or "Listed airline",
            )
            for flight in matches
        ]
