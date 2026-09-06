# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Simulated shopping sites for ticket search: Expedia, Google Flights, Travelocity."""

from .base import FlightSearchRequest, SiteInfo, offer_to_product
from .fanout import fanout_as_products, fanout_search
from .registry import SiteRegistry
from .watches import WatchStore, saved_payload, watch_payload

__all__ = [
    "FlightSearchRequest",
    "SiteInfo",
    "SiteRegistry",
    "WatchStore",
    "fanout_as_products",
    "fanout_search",
    "offer_to_product",
    "saved_payload",
    "watch_payload",
]
