import { sync as parseIcs } from "node-ical";
import type { Event } from "../../core/event.js";
import type { ScrapeDeps, Source } from "../../core/source.js";
import { normalizeEvents } from "./normalize.js";

const FEED_URL = "https://www.bengals.com/api/addToCalendar/ag/s";

export const bengalsSource: Source = {
  id: "bengals",
  name: "Cincinnati Bengals (Home)",

  async scrape({ fetcher, clock, from, to }: ScrapeDeps): Promise<Event[]> {
    const scrapedAt = clock.now();

    const res = await fetcher.fetch(FEED_URL);
    if (res.status !== 200) {
      throw new Error(`Failed to fetch Bengals ICS: HTTP ${res.status}`);
    }

    const components = parseIcs.parseICS(res.body);
    const allEvents = normalizeEvents(components, scrapedAt);
    console.log(`[bengals] ${allEvents.length} home games in feed`);

    const windowed = allEvents.filter((e) => {
      const startInstant = e.start.toInstant();
      if (from && Temporal.Instant.compare(startInstant, from) < 0) return false;
      if (to && Temporal.Instant.compare(startInstant, to) >= 0) return false;
      return true;
    });

    console.log(`[bengals] ${windowed.length} home games within window`);
    return windowed;
  },
};
