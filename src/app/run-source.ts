import type { CalendarWriter } from "../core/ports/calendar-writer.js";
import type { Clock } from "../core/ports/clock.js";
import type { Fetcher } from "../core/ports/fetcher.js";
import type { Source } from "../core/source.js";
import { splitByVenueAndType } from "../core/split.js";

export interface RunSourceOptions {
  fetcher: Fetcher;
  clock: Clock;
  writer: CalendarWriter;
  /** Only include events at or after this instant. */
  from?: Temporal.Instant;
  /** Only include events strictly before this instant. */
  to?: Temporal.Instant;
}

export async function runSource(source: Source, opts: RunSourceOptions): Promise<void> {
  const { fetcher, clock, writer, from, to } = opts;

  console.log(`[run] Scraping source: ${source.name} (${source.id})`);

  const events = await source.scrape({ fetcher, clock, from, to });
  console.log(`[run] ${source.id}: ${events.length} events`);

  const calendars = splitByVenueAndType(events, source.name);
  const nonEmpty = calendars.filter((c) => c.events.length > 0);
  console.log(`[run] ${source.id}: ${nonEmpty.length} calendars to write`);

  await writer.write(source.id, nonEmpty);
  console.log(`[run] ${source.id}: done`);
}
