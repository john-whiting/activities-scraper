import { createHash } from "node:crypto";
import { fromZonedTime } from "date-fns-tz";
import type { Event } from "../../core/event.js";
import type { DetailData } from "./detail.js";
import type { Production } from "./rss.js";

const TIMEZONE = "America/New_York";
const SOURCE_ID = "cincinnati-arts";

/**
 * Parse a raw date/time string like "September 30 2026 at 8:00 PM"
 * and return an ISO 8601 string in TIMEZONE. Returns null on failure.
 */
function parseDateTimeRaw(raw: string): string | null {
  const withoutAt = raw.replace(/\s+/g, " ").trim().replace(/ at /, " ");
  const d = new Date(withoutAt);
  if (!Number.isNaN(d.getTime())) {
    return fromZonedTime(d, TIMEZONE).toISOString();
  }
  return null;
}

function stableId(detailUrl: string, showingId: string): string {
  return createHash("sha256")
    .update(`${SOURCE_ID}:${detailUrl}:${showingId}`)
    .digest("hex")
    .slice(0, 24);
}

export function normalizeEvents(
  production: Production,
  detail: DetailData,
  scrapedAt: string,
): Event[] {
  const events: Event[] = [];

  const topVenueName = production.venue;
  const subVenueName = detail.subVenue;
  const description = detail.description ?? production.description;

  // Prefer detail-page showings; fall back to listing-page showings (if any).
  const rawShowings = detail.showings.length > 0 ? detail.showings : [];

  // Deduplicate by showingId (listing page duplicates each showing twice).
  const seen = new Set<string>();
  const showings = rawShowings.filter((s) => {
    if (seen.has(s.showingId)) return false;
    seen.add(s.showingId);
    return true;
  });

  if (showings.length > 0) {
    for (const showing of showings) {
      const start = parseDateTimeRaw(showing.dateTimeRaw);
      if (!start) {
        console.warn(
          `[cincinnati-arts] Could not parse date "${showing.dateTimeRaw}" for ${production.title}`,
        );
        continue;
      }

      const venueName = showing.venueName || topVenueName;
      events.push({
        id: stableId(production.detailUrl, showing.showingId),
        title: production.title,
        description,
        start,
        timezone: TIMEZONE,
        venue: {
          name: venueName,
          subVenue: subVenueName !== venueName ? subVenueName : undefined,
        },
        location: [subVenueName, venueName]
          .filter((p) => p && p !== venueName)
          .concat(venueName)
          .join(", "),
        url: production.detailUrl,
        categories: [production.eventType],
        scrapedAt,
      });
    }
  } else if (production.productionStart) {
    // No individual showings — use the production start date from RSS
    const start = new Date(production.productionStart).toISOString();
    const venueName = subVenueName || topVenueName;
    events.push({
      id: stableId(production.detailUrl, "production"),
      title: production.title,
      description,
      start,
      timezone: TIMEZONE,
      venue: {
        name: topVenueName || venueName,
        subVenue: subVenueName,
      },
      location: [subVenueName, topVenueName].filter(Boolean).join(", "),
      url: production.detailUrl,
      categories: [production.eventType],
      scrapedAt,
    });
  } else {
    console.warn(`[cincinnati-arts] No showings or production start date for: ${production.title}`);
  }

  return events;
}
