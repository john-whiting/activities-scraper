import { IcsFileWriter } from "./adapters/calendar-writer/ics-file-writer.js";
import { CachedFetcher } from "./adapters/fetcher/cached-fetcher.js";
import { HttpFetcher } from "./adapters/fetcher/http-fetcher.js";
import { runSource } from "./app/run-source.js";
import { systemClock } from "./core/ports/clock.js";
import { getSource, sources } from "./sources/index.js";

const args = process.argv.slice(2);

const sourceFlag = args.indexOf("--source");
const sourceId = sourceFlag !== -1 ? args[sourceFlag + 1] : undefined;

const daysFlag = args.indexOf("--days");
const days = daysFlag !== -1 ? Number(args[daysFlag + 1]) : 365;

const useCache = args.includes("--cache");

const httpFetcher = new HttpFetcher();
const fetcher = useCache ? new CachedFetcher(httpFetcher) : httpFetcher;
const writer = new IcsFileWriter();

const found = sourceId ? getSource(sourceId) : undefined;
const targets = sourceId ? (found ? [found] : []) : sources;

if (sourceId && !found) {
  console.error(`Unknown source: "${sourceId}". Available: ${sources.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

if (Number.isNaN(days) || days <= 0) {
  console.error(`--days must be a positive number (got: ${args[daysFlag + 1]})`);
  process.exit(1);
}

const from = systemClock.now();
const to = from.add({ hours: 24 * days });

console.log(
  `[cli] Window: ${from.toString().slice(0, 10)} → ${to.toString().slice(0, 10)} (${days} days)`,
);

for (const source of targets) {
  await runSource(source, { fetcher, clock: systemClock, writer, from, to });
}
