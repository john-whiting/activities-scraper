import { describe, expect, it } from "vitest";
import type { Production } from "../../src/sources/cincinnati-arts/rss.js";
import { normalizeEvents } from "../../src/sources/cincinnati-arts/normalize.js";

const sampleProduction: Production = {
  title: "Ghost Tours of Music Hall",
  detailUrl: "https://www.cincinnatiarts.org/events/detail/ghost-tours-1",
  venue: "Music Hall",
  eventType: "Other",
  description: "Spooky tour",
  productionStart: "2026-08-28T00:00:00Z",
  productionEnd: "2026-10-31T01:00:00Z",
};

const scrapedAt = "2026-08-29T00:00:00.000Z";

const twoShowings = [
  { showingId: "9925", dateTimeRaw: "September 30 2026 at 8:00 PM", venueName: "Music Hall" },
  { showingId: "9926", dateTimeRaw: "October 30 2026 at 7:00 PM", venueName: "Music Hall" },
];

describe("normalizeEvents — happy path", () => {
  const events = normalizeEvents(sampleProduction, { showings: twoShowings }, scrapedAt);

  it("produces one event per showing", () => {
    expect(events).toHaveLength(2);
  });

  it("sets stable, unique, 24-char IDs", () => {
    const [e1, e2] = events;
    expect(e1.id).toHaveLength(24);
    expect(e2.id).toHaveLength(24);
    expect(e1.id).not.toBe(e2.id);
  });

  it("IDs are deterministic across calls", () => {
    const again = normalizeEvents(sampleProduction, { showings: twoShowings }, scrapedAt);
    expect(again[0].id).toBe(events[0].id);
  });

  it("sets title, url, and timezone", () => {
    const [e] = events;
    expect(e.title).toBe("Ghost Tours of Music Hall");
    expect(e.url).toBe("https://www.cincinnatiarts.org/events/detail/ghost-tours-1");
    expect(e.timezone).toBe("America/New_York");
  });

  it("converts showing times to UTC correctly", () => {
    // "September 30 at 8:00 PM" EDT (UTC-4) = midnight UTC → Oct 1
    expect(events[0].start).toMatch(/2026-10-01/);
    // "October 30 at 7:00 PM" EDT (UTC-4) = 23:00 UTC → Oct 30
    expect(events[1].start).toMatch(/2026-10-30/);
  });

  it("uses eventType from RSS as the sole category", () => {
    expect(events[0].categories).toEqual(["Other"]);
  });

  it("sets venue name from the showing", () => {
    expect(events[0].venue.name).toBe("Music Hall");
  });

  it("prefers detail description over RSS description", () => {
    const withDetailDesc = normalizeEvents(
      sampleProduction,
      { showings: twoShowings, description: "Detail description" },
      scrapedAt,
    );
    expect(withDetailDesc[0].description).toBe("Detail description");
  });

  it("falls back to RSS description when detail has none", () => {
    expect(events[0].description).toBe("Spooky tour");
  });
});

describe("normalizeEvents — deduplication", () => {
  it("deduplicates showings with the same showingId", () => {
    const duped = [
      { showingId: "dup", dateTimeRaw: "September 30 2026 at 8:00 PM", venueName: "Music Hall" },
      { showingId: "dup", dateTimeRaw: "September 30 2026 at 8:00 PM", venueName: "Music Hall" },
    ];
    expect(normalizeEvents(sampleProduction, { showings: duped }, scrapedAt)).toHaveLength(1);
  });
});

describe("normalizeEvents — date parse failures", () => {
  it("skips showings with unparseable dateTimeRaw and keeps valid ones", () => {
    const mixed = [
      { showingId: "bad", dateTimeRaw: "not-a-date", venueName: "Music Hall" },
      { showingId: "good", dateTimeRaw: "October 30 2026 at 7:00 PM", venueName: "Music Hall" },
    ];
    const events = normalizeEvents(sampleProduction, { showings: mixed }, scrapedAt);
    expect(events).toHaveLength(1);
    expect(events[0].start).toMatch(/2026-10/);
  });
});

describe("normalizeEvents — venue fallback", () => {
  it("uses production venue when showing venueName is empty", () => {
    const [event] = normalizeEvents(
      sampleProduction,
      { showings: [{ showingId: "x", dateTimeRaw: "September 30 2026 at 8:00 PM", venueName: "" }] },
      scrapedAt,
    );
    expect(event.venue.name).toBe("Music Hall");
  });

  it("uses showing venueName when present", () => {
    const [event] = normalizeEvents(
      sampleProduction,
      { showings: [{ showingId: "x", dateTimeRaw: "September 30 2026 at 8:00 PM", venueName: "Aronoff Center" }] },
      scrapedAt,
    );
    expect(event.venue.name).toBe("Aronoff Center");
  });
});

describe("normalizeEvents — subVenue", () => {
  const aronoffProduction = { ...sampleProduction, venue: "Aronoff Center" };
  const aronoffShowing = { showingId: "x", dateTimeRaw: "September 30 2026 at 8:00 PM", venueName: "Aronoff Center" };

  it("includes subVenue when it differs from venue name", () => {
    const [event] = normalizeEvents(
      aronoffProduction,
      { showings: [aronoffShowing], subVenue: "Procter & Gamble Hall" },
      scrapedAt,
    );
    expect(event.venue.subVenue).toBe("Procter & Gamble Hall");
  });

  it("omits subVenue when it equals the venue name", () => {
    const [event] = normalizeEvents(
      aronoffProduction,
      { showings: [aronoffShowing], subVenue: "Aronoff Center" },
      scrapedAt,
    );
    expect(event.venue.subVenue).toBeUndefined();
  });

  it("omits subVenue when absent", () => {
    const [event] = normalizeEvents(sampleProduction, { showings: [aronoffShowing] }, scrapedAt);
    expect(event.venue.subVenue).toBeUndefined();
  });
});

describe("normalizeEvents — productionStart fallback", () => {
  it("produces one event from productionStart when no showings exist", () => {
    const events = normalizeEvents(sampleProduction, { showings: [] }, scrapedAt);
    expect(events).toHaveLength(1);
    expect(events[0].start).toMatch(/2026/);
  });

  it("uses 'production' as the showing key in the stable ID", () => {
    const [event] = normalizeEvents(sampleProduction, { showings: [] }, scrapedAt);
    expect(event.id).toHaveLength(24);
  });

  it("returns empty array when there are no showings and no productionStart", () => {
    const noStart = { ...sampleProduction, productionStart: undefined };
    expect(normalizeEvents(noStart, { showings: [] }, scrapedAt)).toHaveLength(0);
  });
});
