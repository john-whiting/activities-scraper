import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRss } from "../../src/sources/cincinnati-arts/rss.js";

const fixtureDir = join(import.meta.dirname, "../fixtures/cincinnati-arts");
const rssXml = readFileSync(join(fixtureDir, "listing.rss"), "utf-8");

/** Wrap items in a minimal valid RSS envelope with the ev: namespace. */
function buildRss(...items: string[]): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"
  xmlns:ev="http://purl.org/rss/1.0/modules/event/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Test Feed</title>
    ${items.join("\n    ")}
  </channel>
</rss>`;
}

function item(fields: Record<string, string>): string {
  const inner = Object.entries(fields)
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join("\n      ");
  return `<item>\n      ${inner}\n    </item>`;
}

const VALID_LINK = "https://www.cincinnatiarts.org/events/detail/a-show";

describe("parseRss — fixture (full season)", async () => {
  const productions = await parseRss(rssXml);

  it("parses all productions without error", () => {
    expect(productions.length).toBeGreaterThanOrEqual(90);
  });

  it("each production has title, detailUrl, venue, and eventType", () => {
    for (const p of productions) {
      expect(p.title).toBeTruthy();
      expect(p.detailUrl).toMatch(/cincinnatiarts\.org\/events\/detail\//);
      expect(p.venue).toBeTruthy();
      expect(p.eventType).toBeTruthy();
    }
  });

  it("all eventType values are from the known taxonomy", () => {
    const known = new Set(["Other", "Theater", "Classical Music", "Concerts", "Dance", "Comedy"]);
    for (const p of productions) {
      expect(known.has(p.eventType), `unexpected type: "${p.eventType}"`).toBe(true);
    }
  });

  it("each production has a productionStart in ISO format", () => {
    for (const p of productions) {
      expect(p.productionStart).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });

  it("no duplicate detail URLs", () => {
    const urls = productions.map((p) => p.detailUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("first production is Ghost Tours with correct fields", () => {
    const ghost = productions[0];
    expect(ghost.title).toBe("Ghost Tours of Music Hall");
    expect(ghost.venue).toBe("Music Hall");
    expect(ghost.eventType).toBe("Other");
    expect(ghost.description).toBeTruthy();
  });
});

describe("parseRss — field defaults", () => {
  it("defaults eventType to 'Other' when ev:type is absent", async () => {
    const xml = buildRss(item({ title: "A Show", link: VALID_LINK, "ev:startdate": "2026-09-01T00:00:00Z" }));
    const [p] = await parseRss(xml);
    expect(p.eventType).toBe("Other");
  });

  it("defaults venue to empty string when ev:location is absent", async () => {
    const xml = buildRss(item({ title: "A Show", link: VALID_LINK, "ev:type": "Dance", "ev:startdate": "2026-09-01T00:00:00Z" }));
    const [p] = await parseRss(xml);
    expect(p.venue).toBe("");
  });

  it("sets productionStart to undefined when ev:startdate is absent", async () => {
    const xml = buildRss(item({ title: "A Show", link: VALID_LINK, "ev:type": "Dance" }));
    const [p] = await parseRss(xml);
    expect(p.productionStart).toBeUndefined();
  });
});

describe("parseRss — description handling", () => {
  it("sets description to undefined when content is blank", async () => {
    const xml = buildRss(item({ title: "A Show", link: VALID_LINK, "ev:type": "Other", description: "   " }));
    const [p] = await parseRss(xml);
    expect(p.description).toBeUndefined();
  });

  it("truncates description to 2000 characters", async () => {
    const longText = "a".repeat(3000);
    const xml = buildRss(item({ title: "A Show", link: VALID_LINK, "ev:type": "Other", description: longText }));
    const [p] = await parseRss(xml);
    expect(p.description).toBeDefined();
    expect(p.description!.length).toBeLessThanOrEqual(2000);
  });
});

describe("parseRss — malformed items", () => {
  it("skips items with no title", async () => {
    const xml = buildRss(item({ link: VALID_LINK, "ev:type": "Dance" }));
    expect(await parseRss(xml)).toHaveLength(0);
  });

  it("skips items with an invalid URL in link", async () => {
    const xml = buildRss(item({ title: "A Show", link: "not-a-url", "ev:type": "Dance" }));
    expect(await parseRss(xml)).toHaveLength(0);
  });

  it("includes valid items even when a sibling item is malformed", async () => {
    const xml = buildRss(
      item({ link: VALID_LINK, "ev:type": "Dance" }), // no title — invalid
      item({ title: "Valid Show", link: "https://www.cincinnatiarts.org/events/detail/valid", "ev:type": "Theater" }),
    );
    const productions = await parseRss(xml);
    expect(productions).toHaveLength(1);
    expect(productions[0].title).toBe("Valid Show");
  });
});
