import { describe, expect, it } from "vitest";
import { HttpFetcher } from "../../src/adapters/fetcher/http-fetcher.js";
import { systemClock } from "../../src/core/ports/clock.js";
import { bengalsSource } from "../../src/sources/bengals/index.js";

describe("bengals integration", () => {
  it("scrapes live feed and returns only home games", async () => {
    const fetcher = new HttpFetcher();
    const events = await bengalsSource.scrape({ fetcher, clock: systemClock });

    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.title).toMatch(/Cincinnati Bengals/i);
      expect(event.title).toMatch(/at Cincinnati Bengals/i);
      expect(event.location?.toLowerCase()).toContain("paycor stadium");
      expect(event.venue.name).toBe("Paycor Stadium");
      expect(event.categories).toContain("Football");
      expect(event.url).toMatch(/bengals\.com/);
      expect(event.start.year).toBeGreaterThanOrEqual(2020);
    }
  });
});
