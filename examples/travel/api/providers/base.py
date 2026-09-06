# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Shared types for simulated shopping-site flight providers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from shopping_agent import Product, ProductDetails


@dataclass(frozen=True)
class FlightSearchRequest:
    """Structured ticket search shared by the form API and agent fan-out."""

    origin: str = ""
    destination: str = ""
    depart_date: str = ""
    return_date: str = ""
    adults: int = 1
    children: int = 0
    budget: float | None = None
    query: str = ""
    limit: int = 8


@dataclass(frozen=True)
class SiteInfo:
    site_id: str
    name: str
    description: str


class FlightProvider(Protocol):
    """One shopping site the agent may search for tickets."""

    site: SiteInfo

    def search(
        self, request: FlightSearchRequest, catalog_flights: list[ProductDetails]
    ) -> list[ProductDetails]:
        """Return site-branded offers derived from catalog flights (deterministic)."""


def offer_to_product(details: ProductDetails) -> Product:
    return Product(
        product_id=details.product_id,
        title=details.title,
        brand=details.brand,
        price=details.price,
        currency=details.currency,
        rating=details.rating,
        review_count=details.review_count,
        image_url=details.image_url,
        category=details.category,
        labels=list(details.labels),
        attributes=dict(details.attributes),
        in_stock=details.in_stock,
        short_description=details.short_description,
    )
