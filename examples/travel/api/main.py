# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""ACME Travel example API: the mock travel platform behind the shared storefront routes,
with the ``present_itinerary`` and ``present_flight_results`` extensions, multi-site
ticket search, and the supplier router under /api/merchant.

    uvicorn travel.api.main:app --app-dir examples --reload --port 8001
"""

from __future__ import annotations

from commerce_common.memory import InMemoryMemoryStore
from demo_common import REPO_ROOT, MemorySeeder, build_storefront_host, load_demo_env
from shopping_agent_runtime import ShoppingAgent

from .agent_config import build_shopping_config
from .flight_results import build_flight_results_extension
from .flights_api import mount_flights_routes
from .itinerary import build_itinerary_extension
from .merchant import create_merchant_router
from .mock_travel import DATA_DIR, MockTravel
from .providers import WatchStore

load_demo_env(DATA_DIR.parent)

backend = MockTravel()
watches = WatchStore()
agent = ShoppingAgent(
    backend=backend,
    skills_dir=REPO_ROOT / "shopping-agent" / "skills",
    config=build_shopping_config(),
    memory_store=InMemoryMemoryStore(),
    extra_presentation_tools=[
        build_itinerary_extension(),
        build_flight_results_extension(),
    ],
)
host = build_storefront_host(
    title="ACME Travel demo API",
    example_root=DATA_DIR.parent,
    backend=backend,
    agent=agent,
    memory_seeder=MemorySeeder(DATA_DIR / "memory-seed.json"),
)
mount_flights_routes(host, backend, watches)
app = host.app
app.include_router(create_merchant_router(backend, InMemoryMemoryStore()), prefix="/api/merchant")
