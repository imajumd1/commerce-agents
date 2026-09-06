# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Fan out a ticket search across enabled shopping sites."""

from __future__ import annotations

from shopping_agent import Product, ProductDetails

from .base import FlightSearchRequest, offer_to_product
from .registry import SiteRegistry


def catalog_flights(products: dict[str, ProductDetails]) -> list[ProductDetails]:
    """Base catalog flights only — skip offers already minted by a shopping site."""
    return [
        product
        for product in products.values()
        if product.category == "flights" and "source_site" not in product.attributes
    ]


def fanout_search(
    registry: SiteRegistry,
    products: dict[str, ProductDetails],
    request: FlightSearchRequest,
) -> list[ProductDetails]:
    """Search every enabled site, merge, sort by price, and cap to ``request.limit``."""
    flights = catalog_flights(products)
    merged: list[ProductDetails] = []
    for provider in registry.enabled_providers():
        merged.extend(provider.search(request, flights))
    if request.budget is not None:
        merged = [offer for offer in merged if offer.price <= request.budget]
    merged.sort(key=lambda offer: offer.price)
    return merged[: max(1, request.limit)]


def fanout_as_products(
    registry: SiteRegistry,
    products: dict[str, ProductDetails],
    request: FlightSearchRequest,
) -> list[Product]:
    return [offer_to_product(offer) for offer in fanout_search(registry, products, request)]
