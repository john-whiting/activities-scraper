import type { Calendar } from "./calendar.js";
import type { Event } from "./event.js";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Split events into venue and type calendars.
 * Every event appears in exactly one venue calendar and one type calendar.
 */
export function splitByVenueAndType(events: Event[], sourceName: string): Calendar[] {
  const byVenue = new Map<string, Event[]>();
  const byType = new Map<string, Event[]>();

  for (const event of events) {
    const venueName = event.venue.name || "Various";
    if (!byVenue.has(venueName)) byVenue.set(venueName, []);
    byVenue.get(venueName)!.push(event);

    const eventType = event.categories[0] ?? "Other";
    if (!byType.has(eventType)) byType.set(eventType, []);
    byType.get(eventType)!.push(event);
  }

  const calendars: Calendar[] = [];

  for (const [venue, venueEvents] of byVenue) {
    calendars.push({
      id: `venue/${toSlug(venue)}`,
      name: `${sourceName} – ${venue}`,
      description: `Events at ${venue}`,
      events: venueEvents,
    });
  }

  for (const [type, typeEvents] of byType) {
    calendars.push({
      id: `type/${toSlug(type)}`,
      name: `${sourceName} – ${type}`,
      description: `${sourceName} ${type} events`,
      events: typeEvents,
    });
  }

  return calendars;
}
