import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Fetcher, FetchOptions, FetchResponse } from "../../core/ports/fetcher.js";

export interface CachedFetcherOptions {
  cacheDir?: string;
  /** Max age in milliseconds before cache entry is considered stale. Default: 1 hour. */
  maxAgeMs?: number;
}

interface CacheEntry {
  url: string;
  fetchedAt: number;
  response: FetchResponse;
}

export class CachedFetcher implements Fetcher {
  private readonly inner: Fetcher;
  private readonly cacheDir: string;
  private readonly maxAgeMs: number;

  constructor(inner: Fetcher, options: CachedFetcherOptions = {}) {
    this.inner = inner;
    this.cacheDir = options.cacheDir ?? ".cache/fetcher";
    this.maxAgeMs = options.maxAgeMs ?? 60 * 60 * 1000;
  }

  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResponse> {
    const key = createHash("sha256").update(url).update(JSON.stringify(options)).digest("hex");
    const cachePath = join(this.cacheDir, `${key}.json`);

    try {
      const raw = await readFile(cachePath, "utf-8");
      const entry: CacheEntry = JSON.parse(raw) as CacheEntry;
      if (Date.now() - entry.fetchedAt < this.maxAgeMs) {
        return entry.response;
      }
    } catch {
      // cache miss — fall through
    }

    const response = await this.inner.fetch(url, options);
    await mkdir(this.cacheDir, { recursive: true });
    const entry: CacheEntry = { url, fetchedAt: Date.now(), response };
    await writeFile(cachePath, JSON.stringify(entry), "utf-8");
    return response;
  }
}
