export interface EventVenue {
  name: string;
  subVenue?: string;
}

export interface Event {
  /** Stable ID derived from source + URL — survives re-scrapes. */
  id: string;
  title: string;
  description?: string;
  /** Zoned wall-clock start — carries its own IANA tz. */
  start: Temporal.ZonedDateTime;
  /** Zoned wall-clock end. Optional (all-day-ish). */
  end?: Temporal.ZonedDateTime;
  venue: EventVenue;
  /** Human-readable "Sub-Venue, Top Venue" for LOCATION field. */
  location?: string;
  /** Canonical event detail page URL. */
  url: string;
  /** e.g. ["Theater", "Comedy"] — source-defined taxonomy values */
  categories: string[];
  organizer?: string;
  /** When this record was last scraped. */
  scrapedAt: Temporal.Instant;
}
