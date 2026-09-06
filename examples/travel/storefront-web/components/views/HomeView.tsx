// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState } from "react";
import { ArrivingPanel, estimateOf, Greeting, HomeSection, type Order, plural, type Starter, Starters, upcoming, useStoreFrame } from "web-shared";
import { NOUNS, TripThumb } from "@/lib/orders";
import { PostcardWindow } from "../PostcardWindow";

const STARTERS: Starter[] = [
  { icon: "plane", prompt: "Search tickets from New York to Lisbon in mid-October for two adults under $2500 — compare Expedia, Google Flights, and Travelocity" },
  { icon: "calendar", prompt: "Plan a long weekend in Lisbon" },
  { icon: "return", prompt: "Something refundable in Reykjavik" },
  { icon: "pin", prompt: "What's my Marrakesh booking status?" },
];

/** The keys of DESTINATION_GRADIENTS in lib/format.ts. */
const POSTCARD_CITIES = ["Lisbon", "Kyoto", "Mexico City", "Reykjavik", "Marrakesh", "Queenstown"];

/** Sends just before the 300ms mail animation ends. */
const MAILING_MS = 260;

const OPENER = "Say where you're headed — or open Search to compare tickets across Expedia, Google Flights, and Travelocity.";

function Brief({ trips }: { trips: Order[] | null }) {
  const open = trips ? upcoming(trips) : [];
  if (!open.length) return <>{OPENER}</>;
  const next = estimateOf(open[0])?.date;
  return (
    <>
      {plural(open.length, "trip")} coming up{next ? `; the next starts ${next}` : ""}. {OPENER}
    </>
  );
}

function Postcards() {
  const { ask, chat } = useStoreFrame();
  const [mailingCity, setMailingCity] = useState<string | null>(null);
  const disabled = !chat || chat.busy || !chat.ready;
  const planTrip = (city: string) => {
    const request = () => ask(`Plan a trip to ${city}`);
    // Reduced motion, or a card already on its way, sends at once.
    if (mailingCity || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      request();
      return;
    }
    setMailingCity(city);
    window.setTimeout(() => {
      setMailingCity(null);
      request();
    }, MAILING_MS);
  };
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {POSTCARD_CITIES.map((city, index) => (
        <button
          key={city}
          type="button"
          onClick={() => planTrip(city)}
          disabled={disabled}
          aria-label={`Plan a trip to ${city}`}
          className="al-reveal-item"
          style={{ animationDelay: `${(index + 4) * 60}ms` }}
        >
          {/* Transforms live here; the button's reveal animation would pin them. */}
          <div
            className={`overflow-hidden rounded-(--radius) border border-(--line) ${
              index % 2 ? "al-postcard-rest al-postcard-rest--alt" : "al-postcard-rest"
            } ${mailingCity === city ? "al-postcard-mailing" : ""}`}
          >
            <PostcardWindow city={city} title={city} className="aspect-[4/3] w-full" />
          </div>
        </button>
      ))}
    </div>
  );
}

export default function HomeView({
  travelerName,
  trips,
  tripsFailed,
  onSeeTrips,
  onOpenSearch,
}: {
  travelerName: string;
  trips: Order[] | null;
  tripsFailed: boolean;
  onSeeTrips: () => void;
  onOpenSearch: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Greeting
        title={
          <h1 className="al-hero">
            Where to, <em>{travelerName}</em>?
          </h1>
        }
      >
        <Brief trips={trips} />
      </Greeting>
      <button
        type="button"
        onClick={onOpenSearch}
        className="rounded-(--radius-lg) border border-(--line) bg-(--card) px-4 py-3 text-left shadow-(--shadow-sm) transition hover:border-(--accent)"
      >
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-(--accent-ink)">Structured search</div>
        <div className="al-display mt-1 text-[20px] font-semibold text-(--ink)">Compare tickets across three sites</div>
        <p className="mt-1 text-[13px] text-(--ink-2)">Dates, travelers, destinations, and budget — results from Expedia, Google Flights, and Travelocity.</p>
      </button>
      <Starters items={STARTERS} />
      <ArrivingPanel orders={trips} failed={tripsFailed} nouns={NOUNS} thumb={(order) => <TripThumb order={order} />} onSeeAll={onSeeTrips} />
      <HomeSection title="Start from a postcard" subtitle="Pick one and ACME Assistant starts planning">
        <Postcards />
      </HomeSection>
    </div>
  );
}
