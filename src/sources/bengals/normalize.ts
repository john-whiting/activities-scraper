import { createHash } from "node:crypto";
import type { CalendarComponent, CalendarResponse, VEvent } from "node-ical";
import type { Event } from "../../core/event.js";

const TIMEZONE = "America/New_York";
const SOURCE_ID = "bengals";
const HOME_VENUE = "Paycor Stadium";
const CALENDAR_URL = "https://www.bengals.com/schedule/";

function stableId(uid: string): string {
  return createHash("sha256").update(`${SOURCE_ID}:${uid}`).digest("hex").slice(0, 24);
}

function isVEvent(c: CalendarComponent | undefined): c is VEvent {
  return c?.type === "VEVENT";
}

function isHomeGame(v: VEvent): boolean {
  const loc = typeof v.location === "string" ? v.location : "";
  return loc.toLowerCase().includes("paycor stadium");
}

function seasonType(v: VEvent): string {
  const desc = typeof v.description === "string" ? v.description : "";
  if (desc.includes("/preseason/")) return "Preseason";
  if (desc.includes("/regular-season/")) return "Regular Season";
  if (desc.includes("/postseason/") || desc.includes("/playoffs/")) return "Playoffs";
  return "Game";
}

export function normalizeEvents(components: CalendarResponse, scrapedAt: Temporal.Instant): Event[] {
  const events: Event[] = [];

  for (const component of Object.values(components)) {
    if (!isVEvent(component)) continue;
    if (!isHomeGame(component)) continue;

    const startDate = component.start;
    const endDate = component.end;
    if (!(startDate instanceof Date)) continue;

    const start = Temporal.Instant.fromEpochMilliseconds(startDate.getTime()).toZonedDateTimeISO(
      TIMEZONE,
    );
    const end =
      endDate instanceof Date
        ? Temporal.Instant.fromEpochMilliseconds(endDate.getTime()).toZonedDateTimeISO(TIMEZONE)
        : undefined;

    const summary = typeof component.summary === "string" ? component.summary : "";
    const description =
      typeof component.description === "string" ? component.description : undefined;
    const location = typeof component.location === "string" ? component.location : undefined;
    const uid = typeof component.uid === "string" ? component.uid : `${summary}:${component.start}`;

    events.push({
      id: stableId(uid),
      title: summary,
      description,
      start,
      end,
      venue: { name: HOME_VENUE },
      location,
      url: CALENDAR_URL,
      categories: ["Football", seasonType(component)],
      scrapedAt,
    });
  }

  return events;
}
