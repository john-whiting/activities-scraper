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
      const start = p.productionStart ? new Date(p.productionStart) : null;
      const end = p.productionEnd ? new Date(p.productionEnd) : start;
      if (!start) return true; // no date info — include and let normalize handle it
      if (to && start >= to) return false;      // production starts after window
      if (from && end && end < from) return false; // production ended before window
      return true;
    });

    console.log(
      `[cincinnati-arts] ${productions.length} productions overlap the window` +
      (from || to
        ? ` (${from?.toISOString().slice(0, 10) ?? "∞"} → ${to?.toISOString().slice(0, 10) ?? "∞"})`
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
        console.warn(
          `[cincinnati-arts] Failed to fetch detail for ${production.title}: ${err}`,
        );
      }

      const events = normalizeEvents(production, detail, scrapedAt);

      // Filter individual showings to the window
      const windowed = events.filter((e) => {
        const start = new Date(e.start);
        if (from && start < from) return false;
        if (to && start >= to) return false;
        return true;
      });

      allEvents.push(...windowed);
    }

    console.log(`[cincinnati-arts] ${allEvents.length} showings within window`);
    return allEvents;
  },

};
