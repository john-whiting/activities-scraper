import type { Event } from "./event.js";

export interface Calendar {
  /** Slug used in output path: calendars/<sourceId>/<id>.ics */
  id: string;
  /** Human-readable name for the VCALENDAR X-WR-CALNAME field. */
  name: string;
  /** Description for X-WR-CALDESC. */
  description?: string;
  events: Event[];
}
