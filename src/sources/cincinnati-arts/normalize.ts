import { createHash } from "node:crypto";
import type { Event } from "../../core/event.js";
import type { DetailData } from "./detail.js";
import type { Production } from "./rss.js";

const TIMEZONE = "America/New_York";
const SOURCE_ID = "cincinnati-arts";

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const SHOWING_RE = /^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

/**
 * Parse a raw showing string like "September 30 2026 at 8:00 PM"
 * into a ZonedDateTime in TIMEZONE. Returns null on failure.
 */
function parseShowingRaw(raw: string): Temporal.ZonedDateTime | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const match = SHOWING_RE.exec(cleaned);
  if (!match) return null;

  const [, monthName, dayStr, yearStr, hourStr, minuteStr, meridiem] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) return null;

  const hour12 = Number(hourStr);
  const hour24 =
    meridiem.toUpperCase() === "PM"
      ? hour12 === 12
        ? 12
        : hour12 + 12
      : hour12 === 12
        ? 0
        : hour12;

  try {
    return Temporal.PlainDateTime.from({
      year: Number(yearStr),
      month,
      day: Number(dayStr),
      hour: hour24,
      minute: Number(minuteStr),
    }).toZonedDateTime(TIMEZONE);
  } catch {
    return null;
  }
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
  scrapedAt: Temporal.Instant,
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
      const start = parseShowingRaw(showing.dateTimeRaw);
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
    // No individual showings — use the production start date from RSS.
    // productionStart is an absolute ISO timestamp; render it in the source's tz.
    const start = Temporal.Instant.from(production.productionStart).toZonedDateTimeISO(TIMEZONE);
    const venueName = subVenueName || topVenueName;
    events.push({
      id: stableId(production.detailUrl, "production"),
      title: production.title,
      description,
      start,
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
