import { describe, expect, it } from "vitest";
import type { Event } from "../../src/core/event.js";
import { splitByVenueAndType } from "../../src/core/split.js";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "test-id",
    title: "Test Show",
    start: "2026-09-30T20:00:00.000Z",
    timezone: "America/New_York",
    venue: { name: "Music Hall" },
    location: "Music Hall",
    url: "https://www.cincinnatiarts.org/events/detail/test",
    categories: ["Classical Music"],
    scrapedAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

describe("splitByVenueAndType —basic bucketing", () => {
  const events = [
    makeEvent({ id: "1", venue: { name: "Music Hall" }, categories: ["Classical Music"] }),
    makeEvent({ id: "2", venue: { name: "Music Hall" }, categories: ["Classical Music"] }),
    makeEvent({ id: "3", venue: { name: "Aronoff Center" }, categories: ["Theater"] }),
    makeEvent({ id: "4", venue: { name: "Aronoff Center" }, categories: ["Dance"] }),
  ];
  const calendars = splitByVenueAndType(events, "Cincinnati Arts");

  it("produces venue calendars", () => {
    const ids = calendars.map((c) => c.id);
    expect(ids).toContain("venue/music-hall");
    expect(ids).toContain("venue/aronoff-center");
  });

  it("produces type calendars", () => {
    const ids = calendars.map((c) => c.id);
    expect(ids).toContain("type/classical-music");
    expect(ids).toContain("type/theater");
    expect(ids).toContain("type/dance");
  });

  it("venue calendars contain correct events", () => {
    const musicHall = calendars.find((c) => c.id === "venue/music-hall");
    expect(musicHall?.events).toHaveLength(2);
    const aronoff = calendars.find((c) => c.id === "venue/aronoff-center");
    expect(aronoff?.events).toHaveLength(2);
  });

  it("type calendars contain correct events", () => {
    const classical = calendars.find((c) => c.id === "type/classical-music");
    expect(classical?.events).toHaveLength(2);
  });

  it("each event appears in exactly one venue and one type calendar", () => {
    const venueCals = calendars.filter((c) => c.id.startsWith("venue/"));
    const typeCals = calendars.filter((c) => c.id.startsWith("type/"));
    for (const event of events) {
      expect(venueCals.filter((c) => c.events.some((e) => e.id === event.id))).toHaveLength(1);
      expect(typeCals.filter((c) => c.events.some((e) => e.id === event.id))).toHaveLength(1);
    }
  });
});

describe("splitByVenueAndType —edge cases", () => {
  it("returns empty array for empty input", () => {
    expect(splitByVenueAndType([], "Cincinnati Arts")).toEqual([]);
  });

  it("groups events with no venue name under 'Various'", () => {
    const events = [makeEvent({ id: "1", venue: { name: "" }, categories: ["Theater"] })];
    const ids = splitByVenueAndType(events, "Cincinnati Arts").map((c) => c.id);
    expect(ids).toContain("venue/various");
  });

  it("groups events with empty categories under type 'Other'", () => {
    const events = [makeEvent({ id: "1", categories: [] })];
    const ids = splitByVenueAndType(events, "Cincinnati Arts").map((c) => c.id);
    expect(ids).toContain("type/other");
  });
});

describe("splitByVenueAndType —slug generation", () => {
  it("lowercases and hyphenates venue names", () => {
    const events = [makeEvent({ id: "1", venue: { name: "Aronoff Center" }, categories: ["Other"] })];
    const ids = splitByVenueAndType(events, "Cincinnati Arts").map((c) => c.id);
    expect(ids).toContain("venue/aronoff-center");
  });

  it("strips special characters from venue names", () => {
    const events = [makeEvent({ id: "1", venue: { name: "Procter & Gamble Hall" }, categories: ["Other"] })];
    const ids = splitByVenueAndType(events, "Cincinnati Arts").map((c) => c.id);
    expect(ids).toContain("venue/procter-gamble-hall");
  });

  it("collapses multiple non-alphanumeric characters to a single hyphen", () => {
    const events = [makeEvent({ id: "1", venue: { name: "21c Museum & Hotel" }, categories: ["Other"] })];
    const ids = splitByVenueAndType(events, "Cincinnati Arts").map((c) => c.id);
    expect(ids).toContain("venue/21c-museum-hotel");
  });
});

describe("splitByVenueAndType —calendar metadata", () => {
  it("sets human-readable name for venue calendar", () => {
    const events = [makeEvent({ venue: { name: "Music Hall" }, categories: ["Dance"] })];
    const cal = splitByVenueAndType(events, "Cincinnati Arts").find((c) => c.id === "venue/music-hall");
    expect(cal?.name).toBe("Cincinnati Arts – Music Hall");
    expect(cal?.description).toBe("Events at Music Hall");
  });

  it("sets human-readable name for type calendar", () => {
    const events = [makeEvent({ venue: { name: "Music Hall" }, categories: ["Dance"] })];
    const cal = splitByVenueAndType(events, "Cincinnati Arts").find((c) => c.id === "type/dance");
    expect(cal?.name).toBe("Cincinnati Arts – Dance");
    expect(cal?.description).toBe("Cincinnati Arts Dance events");
  });
});
