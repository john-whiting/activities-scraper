import type { Calendar } from "../calendar.js";

export interface CalendarWriter {
  /**
   * Persist a set of calendars for a given source.
   * @param sourceId - used to namespace output (e.g. as a subdirectory)
   * @param calendars - calendars to write (empty calendars may be skipped)
   */
  write(sourceId: string, calendars: Calendar[]): Promise<void>;
}
