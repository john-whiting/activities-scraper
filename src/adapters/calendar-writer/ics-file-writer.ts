import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fromZonedTime } from "date-fns-tz";
import type { EventAttributes } from "ics";
import { createEvents } from "ics";
import type { Calendar } from "../../core/calendar.js";
import type { CalendarWriter } from "../../core/ports/calendar-writer.js";

export interface IcsFileWriterOptions {
  outputDir?: string;
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
        const utcStart = fromZonedTime(event.start, event.timezone);
        const startArray: [number, number, number, number, number] = [
          utcStart.getUTCFullYear(),
          utcStart.getUTCMonth() + 1,
          utcStart.getUTCDate(),
          utcStart.getUTCHours(),
          utcStart.getUTCMinutes(),
        ];

        let endArray: [number, number, number, number, number] | undefined;
        if (event.end) {
          const utcEnd = fromZonedTime(event.end, event.timezone);
          endArray = [
            utcEnd.getUTCFullYear(),
            utcEnd.getUTCMonth() + 1,
            utcEnd.getUTCDate(),
            utcEnd.getUTCHours(),
            utcEnd.getUTCMinutes(),
          ];
        }

        const baseAttr = {
          uid: event.id,
          title: event.title,
          start: startArray,
          startInputType: "utc" as const,
          startOutputType: "utc" as const,
          description: event.description ? `${event.description}\n\n${event.url}` : event.url,
          location: event.location,
          url: event.url,
          categories: event.categories,
          status: "CONFIRMED" as const,
        };

        const attr: EventAttributes = endArray
          ? { ...baseAttr, end: endArray, endInputType: "utc", endOutputType: "utc" }
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
