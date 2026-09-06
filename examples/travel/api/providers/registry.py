# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Site catalog and enable/disable state for this travel instantiation."""

from __future__ import annotations

from dataclasses import asdict

from .base import FlightProvider, SiteInfo
from .expedia import ExpediaAdapter
from .google_flights import GoogleFlightsAdapter
from .travelocity import TravelocityAdapter

# Fixed set for this personalization: three shopping sites.
_DEFAULT_PROVIDERS: list[FlightProvider] = [
    ExpediaAdapter(),
    GoogleFlightsAdapter(),
    TravelocityAdapter(),
]


class SiteRegistry:
    def __init__(self, providers: list[FlightProvider] | None = None) -> None:
        self._providers = {p.site.site_id: p for p in (providers or _DEFAULT_PROVIDERS)}
        self._enabled: dict[str, bool] = {site_id: True for site_id in self._providers}

    def list_sites(self) -> list[dict]:
        return [
            {**asdict(provider.site), "enabled": self._enabled[site_id]}
            for site_id, provider in self._providers.items()
        ]

    def set_enabled(self, enabled: dict[str, bool]) -> list[dict]:
        for site_id, value in enabled.items():
            if site_id in self._enabled:
                self._enabled[site_id] = bool(value)
        return self.list_sites()

    def enabled_providers(self) -> list[FlightProvider]:
        return [
            provider
            for site_id, provider in self._providers.items()
            if self._enabled.get(site_id, False)
        ]

    def site_info(self, site_id: str) -> SiteInfo | None:
        provider = self._providers.get(site_id)
        return provider.site if provider else None
