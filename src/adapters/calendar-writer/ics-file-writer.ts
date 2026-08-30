import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EventAttributes } from "ics";
import { createEvents } from "ics";
import type { Calendar } from "../../core/calendar.js";
import type { CalendarWriter } from "../../core/ports/calendar-writer.js";

export interface IcsFileWriterOptions {
  outputDir?: string;
}

type DateArray = [number, number, number, number, number];

function toUtcArray(zdt: Temporal.ZonedDateTime): DateArray {
  const utc = zdt.withTimeZone("UTC");
  return [utc.year, utc.month, utc.day, utc.hour, utc.minute];
}

export class IcsFileWriter implements CalendarWriter {
  private readonly outputDir: string;

  constructor(options: IcsFileWriterOptions = {}) {
    this.outputDir = options.outputDir ?? "calendars";
  }

  async write(sourceId: string, calendars: Calendar[]): Promise<void> {
    for (const calendar of calendars) {
      if (calendar.events.length === 0) continue;

      const attrs: EventAttributes[] = calendar.events.map((event) => {
        const baseAttr = {
          uid: event.id,
          title: event.title,
          start: toUtcArray(event.start),
          startInputType: "utc" as const,
          startOutputType: "utc" as const,
          description: event.description ? `${event.description}\n\n${event.url}` : event.url,
          location: event.location,
          url: event.url,
          categories: event.categories,
          status: "CONFIRMED" as const,
        };

        const attr: EventAttributes = event.end
          ? {
              ...baseAttr,
              end: toUtcArray(event.end),
              endInputType: "utc",
              endOutputType: "utc",
            }
          : { ...baseAttr, duration: { hours: 2 } };

        if (event.organizer) {
          attr.organizer = { name: event.organizer };
        }

        return attr;
      });

      const { error, value } = createEvents(attrs, {
        calName: calendar.name,
      });

      if (error || !value) {
        throw new Error(
          `Failed to generate ICS for ${calendar.id}: ${error?.message ?? "unknown error"}`,
        );
      }

      const outPath = join(this.outputDir, sourceId, `${calendar.id}.ics`);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, value, "utf-8");
      console.log(`  Wrote ${outPath} (${calendar.events.length} events)`);
    }
  }
}
