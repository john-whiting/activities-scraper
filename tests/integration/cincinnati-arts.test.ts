import { describe, expect, it } from "vitest";
import { HttpFetcher } from "../../src/adapters/fetcher/http-fetcher.js";
import { systemClock } from "../../src/core/ports/clock.js";
import { cincinnatiArtsSource } from "../../src/sources/cincinnati-arts/index.js";

describe("cincinnati-arts integration", () => {
  it("scrapes live site and returns events", async () => {
    const fetcher = new HttpFetcher({ minDelayMs: 500 });
    const events = await cincinnatiArtsSource.scrape({ fetcher, clock: systemClock });

    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.title).toBeTruthy();
      expect(event.start).toMatch(/^\d{4}/);
      expect(event.venue.name).toBeTruthy();
      expect(event.categories.length).toBeGreaterThan(0);
      expect(event.url).toMatch(/cincinnatiarts\.org/);
    }

    const venues = new Set(events.map((e) => e.venue.name));
    expect(venues.size).toBeGreaterThanOrEqual(3);

    const types = new Set(events.flatMap((e) => e.categories));
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it("split produces non-empty venue and type calendars", async () => {
    const fetcher = new HttpFetcher({ minDelayMs: 500 });
    const events = await cincinnatiArtsSource.scrape({ fetcher, clock: systemClock });
    const calendars = cincinnatiArtsSource.split(events);

    const venueCals = calendars.filter((c) => c.id.startsWith("venue-"));
    const typeCals = calendars.filter((c) => c.id.startsWith("type-"));

    expect(venueCals.length).toBeGreaterThanOrEqual(1);
    expect(typeCals.length).toBeGreaterThanOrEqual(1);

    for (const cal of calendars) {
      expect(cal.events.length).toBeGreaterThan(0);
    }
  });
});
