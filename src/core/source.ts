import type { Event } from "./event.js";
import type { Clock } from "./ports/clock.js";
import type { Fetcher } from "./ports/fetcher.js";

export interface ScrapeDeps {
  fetcher: Fetcher;
  clock: Clock;
  /** Exclude events that start before this date. */
  from?: Date;
  /** Exclude events that start on or after this date. */
  to?: Date;
}

export interface Source {
  /** Unique kebab-case identifier — used in paths and CLI flags. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Fetch and parse all events from this source. */
  scrape(deps: ScrapeDeps): Promise<Event[]>;
}
