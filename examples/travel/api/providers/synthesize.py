# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Deterministic offer synthesis shared by simulated OTA adapters."""

from __future__ import annotations

import re
import zlib
from copy import deepcopy

from shopping_agent import ProductDetails

from .base import FlightSearchRequest, SiteInfo

_WORD = re.compile(r"[a-z0-9]+")

# Common aliases so form and chat queries resolve to catalog city names.
_CITY_ALIASES: dict[str, str] = {
    "nyc": "new york",
    "new york city": "new york",
    "ny": "new york",
    "la": "los angeles",
    "sf": "san francisco",
    "sfo": "san francisco",
    "bos": "boston",
    "chi": "chicago",
    "mexico": "mexico city",
}


def normalize_city(value: str) -> str:
    cleaned = " ".join(_WORD.findall(value.lower()))
    return _CITY_ALIASES.get(cleaned, cleaned)


def cities_match(a: str, b: str) -> bool:
    if not a or not b:
        return True
    na, nb = normalize_city(a), normalize_city(b)
    return na == nb or na in nb or nb in na


def request_matches_flight(product: ProductDetails, request: FlightSearchRequest) -> bool:
    if product.category != "flights":
        return False
    origin = product.attributes.get("origin_city", "")
    dest = product.attributes.get("destination_city", "")
    if request.origin and not cities_match(request.origin, origin):
        return False
    if request.destination and not cities_match(request.destination, dest):
        return False
    if request.query:
        tokens = _WORD.findall(request.query.lower())
        hay = " ".join(
            [
                product.title.lower(),
                origin.lower(),
                dest.lower(),
                product.brand or "",
                product.short_description or "",
            ]
        )
        flightish = {"flight", "flights", "ticket", "tickets", "airfare", "fare", "fly"}
        topical = [t for t in tokens if t not in flightish]
        if topical and not any(t in hay or cities_match(t, origin) or cities_match(t, dest) for t in topical):
            # Still allow if origin/destination attrs already constrained the match.
            if not (request.origin or request.destination):
                return False
    return True


def party_size(request: FlightSearchRequest) -> int:
    return max(1, request.adults + request.children)


def synthesize_offer(
    *,
    base: ProductDetails,
    site: SiteInfo,
    request: FlightSearchRequest,
    price_factor: float,
    label: str,
    brand_suffix: str,
) -> ProductDetails:
    """Clone a catalog flight into a site-branded quote with a deterministic price."""
    offer = deepcopy(base)
    seed = zlib.crc32(f"{site.site_id}:{base.product_id}:{request.depart_date}".encode())
    jitter = ((seed % 41) - 20) / 100  # -0.20 .. +0.20
    party = party_size(request)
    unit = round(base.price * price_factor * (1 + jitter), 2)
    total = round(unit * party, 2)
    offer.product_id = f"{site.site_id.upper()}-{base.product_id}"
    offer.brand = f"{site.name} · {brand_suffix}"
    offer.price = total
    offer.labels = list(dict.fromkeys([label, *base.labels, f"via {site.name}"]))
    offer.attributes = dict(base.attributes)
    offer.attributes["source_site"] = site.site_id
    offer.attributes["source_site_name"] = site.name
    offer.attributes["base_product_id"] = base.product_id
    offer.attributes["price_unit"] = "per_party" if party > 1 else "per_person"
    offer.attributes["adults"] = str(request.adults)
    offer.attributes["children"] = str(request.children)
    if request.depart_date:
        offer.attributes["travel_date"] = request.depart_date
        offer.attributes["depart_date"] = request.depart_date
    if request.return_date:
        offer.attributes["return_date"] = request.return_date
    if request.budget is not None:
        offer.attributes["budget"] = str(request.budget)
    offer.short_description = (
        f"{site.name} fare for {party} traveler{'s' if party != 1 else ''}: "
        f"{base.short_description or base.title}"
    )
    return offer
