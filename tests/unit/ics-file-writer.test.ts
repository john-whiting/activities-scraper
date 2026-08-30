import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { IcsFileWriter } from "../../src/adapters/calendar-writer/ics-file-writer.js";
import type { Calendar } from "../../src/core/calendar.js";
import type { Event } from "../../src/core/event.js";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "abc123",
    title: "Test Show",
    start: Temporal.ZonedDateTime.from("2026-09-30T20:00:00-04:00[America/New_York]"),
    venue: { name: "Music Hall" },
    location: "Music Hall",
    url: "https://www.cincinnatiarts.org/events/detail/test",
    categories: ["Classical Music"],
    scrapedAt: Temporal.Instant.from("2026-08-29T00:00:00Z"),
    ...overrides,
  };
}

function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: "venue/music-hall",
    name: "Cincinnati Arts – Music Hall",
    events: [makeEvent()],
    ...overrides,
  };
}

describe("IcsFileWriter", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = join(tmpdir(), `ics-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(outputDir, { recursive: true });
  });

  it("writes a valid ICS file to calendars/<sourceId>/<calId>.ics", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [makeCalendar()]);

    const content = await readFile(
      join(outputDir, "test-source", "venue", "music-hall.ics"),
      "utf-8",
    );
    expect(content).toMatch(/^BEGIN:VCALENDAR/);
    expect(content).toContain("END:VCALENDAR");
  });

  it("emits DTSTART in UTC matching the zoned start", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [makeCalendar()]);

    const content = await readFile(
      join(outputDir, "test-source", "venue", "music-hall.ics"),
      "utf-8",
    );
    // Sept 30, 8:00 PM EDT (UTC-4) → midnight UTC on Oct 1
    expect(content).toContain("DTSTART:20261001T000000Z");
  });

  it("skips calendars with no events", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [makeCalendar({ id: "empty", events: [] })]);

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(join(outputDir, "test-source")).catch(() => []);
    expect(files).not.toContain("empty.ics");
  });

  it("appends the event URL to the description when description is present", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [
      makeCalendar({ events: [makeEvent({ description: "A great show" })] }),
    ]);

    const content = await readFile(
      join(outputDir, "test-source", "venue", "music-hall.ics"),
      "utf-8",
    );
    expect(content).toContain("A great show");
    expect(content).toContain("https://www.cincinnatiarts.org/events/detail/test");
  });

  it("uses the event URL as the description when no description is provided", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [
      makeCalendar({ events: [makeEvent({ description: undefined })] }),
    ]);

    const content = await readFile(
      join(outputDir, "test-source", "venue", "music-hall.ics"),
      "utf-8",
    );
    expect(content).toContain("https://www.cincinnatiarts.org/events/detail/test");
  });

  it("uses a 2-hour duration when no end time is provided", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [makeCalendar({ events: [makeEvent({ end: undefined })] })]);

    const content = await readFile(
      join(outputDir, "test-source", "venue", "music-hall.ics"),
      "utf-8",
    );
    expect(content).toContain("DURATION:PT2H");
  });

  it("uses DTEND when an end time is provided", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [
      makeCalendar({
        events: [
          makeEvent({
            end: Temporal.ZonedDateTime.from("2026-09-30T22:00:00-04:00[America/New_York]"),
          }),
        ],
      }),
    ]);

    const content = await readFile(
      join(outputDir, "test-source", "venue", "music-hall.ics"),
      "utf-8",
    );
    expect(content).toContain("DTEND");
    expect(content).not.toContain("DURATION");
  });

  it("includes ORGANIZER when event.organizer is set", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [
      makeCalendar({ events: [makeEvent({ organizer: "Cincinnati Symphony" })] }),
    ]);

    const content = await readFile(
      join(outputDir, "test-source", "venue", "music-hall.ics"),
      "utf-8",
    );
    expect(content).toContain("Cincinnati Symphony");
  });

  it("omits ORGANIZER when event.organizer is not set", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [
      makeCalendar({ events: [makeEvent({ organizer: undefined })] }),
    ]);

    const content = await readFile(
      join(outputDir, "test-source", "venue", "music-hall.ics"),
      "utf-8",
    );
    expect(content).not.toContain("ORGANIZER");
  });

  it("writes multiple calendars as separate files", async () => {
    const writer = new IcsFileWriter({ outputDir });
    await writer.write("test-source", [
      makeCalendar({ id: "cal-a" }),
      makeCalendar({ id: "cal-b" }),
    ]);

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(join(outputDir, "test-source"));
    expect(files).toContain("cal-a.ics");
    expect(files).toContain("cal-b.ics");
  });
});
