# activities-scraper

A daily scraper that converts public event calendars into subscribable `.ics` feeds, committed back to this repo so anyone can subscribe via a stable URL.

---

> **Vibe-coded project disclaimer**
>
> This project was largely built with AI assistance (Claude). The code works, but it may contain non-idiomatic patterns, over-engineered abstractions, or gaps in error handling that a human-authored project might not. Scraper logic is inherently brittle — if a source website changes its structure, feeds will break until the scraper is updated. Use these feeds at your own risk. No guarantees are made about availability, accuracy, or completeness of the event data.

---

## What it does

Events on many local venue websites can't be subscribed to directly — they're rendered server-side with no iCal export. This project scrapes those sites daily and re-publishes the events as standard `.ics` files that any calendar app can subscribe to.

The scraper runs automatically via GitHub Actions at 08:00 UTC every day, commits the regenerated `.ics` files, and pushes them back to this repo. Subscribe to a raw file URL and your calendar will stay up to date.

## Subscribing to a calendar

Subscribe to any `.ics` file under `calendars/` using its raw GitHub URL:

```
https://raw.githubusercontent.com/<owner>/<repo>/main/calendars/<source>/<folder>/<name>.ics
```

**Cincinnati Arts examples:**

| Calendar | URL suffix |
|---|---|
| Music Hall events | `calendars/cincinnati-arts/venue/music-hall.ics` |
| Aronoff Center events | `calendars/cincinnati-arts/venue/aronoff-center.ics` |
| Classical Music events | `calendars/cincinnati-arts/type/classical-music.ics` |
| Theater events | `calendars/cincinnati-arts/type/theater.ics` |
| Dance events | `calendars/cincinnati-arts/type/dance.ics` |

In **Apple Calendar**: File → New Calendar Subscription → paste the URL.  
In **Google Calendar**: Other calendars → From URL → paste the URL.

Each event links back to the original event page for tickets and full details.

## Sources

### Cincinnati Arts (`cincinnati-arts`)

Scrapes [cincinnatiarts.org](https://www.cincinnatiarts.org/events) via their RSS feed. Covers events at:

- Music Hall
- Aronoff Center
- Weston Art Gallery
- Mutual Arts Center Hartwell
- 21c Museum and Hotel
- Virtual events

Events are split into two sets of calendars: one per **venue** and one per **event type** (Classical Music, Theater, Dance, Comedy, Concerts, Other). Every event appears in exactly one venue calendar and one type calendar.

## Setup

**Requirements:** Node.js 22+, pnpm 11+

```sh
# Install dependencies
pnpm install
```

That's it. There's no build step — `tsx` runs TypeScript directly.

## Usage

```sh
# Scrape all sources (default: events for the next 365 days)
pnpm scrape

# Scrape a specific source
pnpm scrape --source cincinnati-arts

# Change the lookahead window
pnpm scrape --days 180

# Use a local disk cache (avoids re-fetching pages on repeated runs — useful during development)
pnpm scrape --cache
```

Output is written to `calendars/<source-id>/venue/<slug>.ics` and `calendars/<source-id>/type/<slug>.ics`.

## Development

```sh
# Type check
pnpm typecheck

# Lint and format check (Biome)
pnpm check

# Auto-format
pnpm format

# Unit tests (no network — runs against saved fixtures)
pnpm test:unit

# Integration tests (hits live sites — use sparingly)
pnpm test:integration
```

Unit tests live in `tests/unit/` and run against HTML/RSS fixtures saved in `tests/fixtures/`. They cover all parsing, normalisation, splitting, and ICS generation logic without touching the network.

Integration tests live in `tests/integration/` and run the full scrape pipeline against each live source. They verify that a non-zero number of events are returned across the expected venues and event types.

## Architecture

The project follows a hexagonal (ports & adapters) structure so scrapers, fetch mechanisms, and output formats are all swappable:

```
src/
├── core/               # Domain types and port interfaces — no I/O
│   ├── event.ts
│   ├── calendar.ts
│   ├── split.ts        # Generic venue+type splitter
│   └── ports/          # Fetcher, Clock, CalendarWriter interfaces
├── adapters/           # Concrete port implementations
│   ├── fetcher/        # HttpFetcher, CachedFetcher
│   └── calendar-writer/# IcsFileWriter
├── sources/            # One directory per source
│   └── cincinnati-arts/
│       ├── rss.ts      # RSS feed parsing (rss-parser + Zod)
│       ├── detail.ts   # Detail page HTML parsing (Cheerio)
│       ├── normalize.ts# Maps raw data to core Event type
│       └── index.ts    # Source entry point
├── app/
│   └── run-source.ts   # Orchestrator: scrape → split → write
└── cli.ts              # CLI entry point
```

## Adding a new source

1. Create `src/sources/<your-source>/index.ts` implementing the `Source` interface (`id`, `name`, `scrape()`).
2. Register it in `src/sources/index.ts`.
3. Add fixtures and unit tests under `tests/`.
4. Add an integration test under `tests/integration/`.

The source's `scrape()` receives a `Fetcher`, `Clock`, and optional `from`/`to` date window. It returns a flat array of `Event` objects; the generic splitter handles bucketing into calendars.

## CI / Automation

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push / PR | Lint, typecheck, unit tests |
| `scrape.yml` | Daily 08:00 UTC + manual | Scrapes all sources, commits updated `.ics` files |
| `integration.yml` | Daily 12:00 UTC + manual | Runs integration tests; opens a GitHub issue on failure |

## License

MIT
