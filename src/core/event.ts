export interface EventVenue {
  name: string;
  subVenue?: string;
}

export interface Event {
  /** Stable ID derived from source + URL — survives re-scrapes. */
  id: string;
  title: string;
  description?: string;
  /** ISO 8601 string in the event's local timezone. */
  start: string;
  /** ISO 8601 string in the event's local timezone. Optional (all-day-ish). */
  end?: string;
  /** IANA tz identifier, e.g. "America/New_York" */
  timezone: string;
  venue: EventVenue;
  /** Human-readable "Sub-Venue, Top Venue" for LOCATION field. */
  location?: string;
  /** Canonical event detail page URL. */
  url: string;
  /** e.g. ["Theater", "Comedy"] — source-defined taxonomy values */
  categories: string[];
  organizer?: string;
  /** ISO 8601 — when this record was last scraped. */
  scrapedAt: string;
}
