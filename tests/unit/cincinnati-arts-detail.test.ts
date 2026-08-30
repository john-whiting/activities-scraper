import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDetail } from "../../src/sources/cincinnati-arts/detail.js";

const fixtureDir = join(import.meta.dirname, "../fixtures/cincinnati-arts");
const ghostHtml = readFileSync(join(fixtureDir, "detail-ghost-tours-1.html"), "utf-8");
const englishLitHtml = readFileSync(join(fixtureDir, "detail-cmt-english-lit.html"), "utf-8");

describe("parseDetail — description", () => {
  it("extracts description text from ghost tours page", () => {
    const { description } = parseDetail(ghostHtml);
    expect(description).toBeTruthy();
    expect(description).toContain("Music Hall");
    expect(description?.toLowerCase()).toContain("ghost");
  });

  it("extracts description from English Lit page", () => {
    const { description } = parseDetail(englishLitHtml);
    expect(description).toBeTruthy();
  });

  it("returns undefined description for a page with no event_description element", () => {
    const { description } = parseDetail("<html><body></body></html>");
    expect(description).toBeUndefined();
  });
});

describe("parseDetail — subVenue", () => {
  it("extracts sub-venue from English Lit page (Fifth Third Bank Theater)", () => {
    const { subVenue } = parseDetail(englishLitHtml);
    expect(subVenue).toBe("Fifth Third Bank Theater");
  });

  it("returns undefined subVenue when sidebar_location is absent", () => {
    const { subVenue } = parseDetail("<html><body></body></html>");
    expect(subVenue).toBeUndefined();
  });
});

describe("parseDetail — showings", () => {
  it("extracts all showings from English Lit page", () => {
    const { showings } = parseDetail(englishLitHtml);
    expect(showings.length).toBeGreaterThanOrEqual(6);
  });

  it("each showing has a non-empty showingId, dateTimeRaw, and venueName", () => {
    const { showings } = parseDetail(englishLitHtml);
    for (const s of showings) {
      expect(s.showingId).toBeTruthy();
      expect(s.dateTimeRaw).toMatch(/\d{4}/);
      expect(s.venueName).toBeTruthy();
    }
  });

  it("returns empty showings array when no showings_list elements exist", () => {
    const { showings } = parseDetail("<html><body></body></html>");
    expect(showings).toEqual([]);
  });

  it("skips showings_list elements that lack a dateTimeRaw", () => {
    const html = `<html><body>
      <div class="showings_list" data-showing-id="123">
        <a class="ical" title=""></a>
      </div>
    </body></html>`;
    const { showings } = parseDetail(html);
    expect(showings).toHaveLength(0);
  });
});
