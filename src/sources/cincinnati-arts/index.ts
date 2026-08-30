import type { Event } from "../../core/event.js";
import type { ScrapeDeps, Source } from "../../core/source.js";
import { parseDetail } from "./detail.js";
import { normalizeEvents } from "./normalize.js";
import { parseRss } from "./rss.js";

const BASE_URL = "https://www.cincinnatiarts.org";

export const cincinnatiArtsSource: Source = {
  id: "cincinnati-arts",
  name: "Cincinnati Arts",

  async scrape({ fetcher, clock, from, to }: ScrapeDeps): Promise<Event[]> {
    const scrapedAt = clock.now();

    const rssRes = await fetcher.fetch(`${BASE_URL}/events/rss`);
    if (rssRes.status !== 200) {
      throw new Error(`Failed to fetch Cincinnati Arts RSS: HTTP ${rssRes.status}`);
    }

    const allProductions = await parseRss(rssRes.body);
    console.log(`[cincinnati-arts] ${allProductions.length} productions in RSS feed`);

    // Pre-filter by window using the production date range so we only fetch
    // detail pages for productions that overlap the requested window.
    const productions = allProductions.filter((p) => {
      const start = p.productionStart ? Temporal.Instant.from(p.productionStart) : null;
      const end = p.productionEnd ? Temporal.Instant.from(p.productionEnd) : start;
      if (!start) return true; // no date info — include and let normalize handle it
      if (to && Temporal.Instant.compare(start, to) >= 0) return false;
      if (from && end && Temporal.Instant.compare(end, from) < 0) return false;
      return true;
    });

    console.log(
      `[cincinnati-arts] ${productions.length} productions overlap the window` +
        (from || to
          ? ` (${from?.toString().slice(0, 10) ?? "∞"} → ${to?.toString().slice(0, 10) ?? "∞"})`
          : ""),
    );

    const allEvents: Event[] = [];

    for (const production of productions) {
      let detail = { showings: [] as import("./detail.js").DetailShowing[] };

      try {
        const detailRes = await fetcher.fetch(production.detailUrl);
        if (detailRes.status === 200) {
          detail = parseDetail(detailRes.body);
        }
      } catch (err) {
        console.warn(`[cincinnati-arts] Failed to fetch detail for ${production.title}: ${err}`);
      }

      const events = normalizeEvents(production, detail, scrapedAt);

      // Filter individual showings to the window
      const windowed = events.filter((e) => {
        const startInstant = e.start.toInstant();
        if (from && Temporal.Instant.compare(startInstant, from) < 0) return false;
        if (to && Temporal.Instant.compare(startInstant, to) >= 0) return false;
        return true;
      });

      allEvents.push(...windowed);
    }

    console.log(`[cincinnati-arts] ${allEvents.length} showings within window`);
    return allEvents;
  },
};
