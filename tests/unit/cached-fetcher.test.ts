import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedFetcher } from "../../src/adapters/fetcher/cached-fetcher.js";
import type { Fetcher, FetchResponse } from "../../src/core/ports/fetcher.js";

function makeFetcher(response: FetchResponse): Fetcher {
  return { fetch: vi.fn().mockResolvedValue(response) };
}

const okResponse: FetchResponse = { status: 200, headers: {}, body: "hello" };

describe("CachedFetcher", () => {
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = join(tmpdir(), `caf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(cacheDir, { recursive: true });
  });

  it("calls inner fetcher on cache miss", async () => {
    const inner = makeFetcher(okResponse);
    const cached = new CachedFetcher(inner, { cacheDir });

    const result = await cached.fetch("https://example.com/page");

    expect(result).toEqual(okResponse);
    expect(inner.fetch).toHaveBeenCalledOnce();
  });

  it("returns cached response without calling inner on cache hit", async () => {
    const inner = makeFetcher(okResponse);
    const cached = new CachedFetcher(inner, { cacheDir });

    await cached.fetch("https://example.com/page");
    const result = await cached.fetch("https://example.com/page");

    expect(result).toEqual(okResponse);
    expect(inner.fetch).toHaveBeenCalledOnce();
  });

  it("re-fetches after cache entry expires", async () => {
    const inner = makeFetcher(okResponse);
    const cached = new CachedFetcher(inner, { cacheDir, maxAgeMs: 1 });

    await cached.fetch("https://example.com/page");
    await new Promise((r) => setTimeout(r, 10));
    await cached.fetch("https://example.com/page");

    expect(inner.fetch).toHaveBeenCalledTimes(2);
  });

  it("uses separate cache entries for different URLs", async () => {
    const inner = makeFetcher(okResponse);
    const cached = new CachedFetcher(inner, { cacheDir });

    await cached.fetch("https://example.com/a");
    await cached.fetch("https://example.com/b");

    expect(inner.fetch).toHaveBeenCalledTimes(2);
  });

  it("uses separate cache entries for different request options", async () => {
    const inner = makeFetcher(okResponse);
    const cached = new CachedFetcher(inner, { cacheDir });

    await cached.fetch("https://example.com/page", { method: "GET" });
    await cached.fetch("https://example.com/page", { method: "POST" });

    expect(inner.fetch).toHaveBeenCalledTimes(2);
  });

  it("same URL and options always hit the same cache entry", async () => {
    const inner = makeFetcher(okResponse);
    const cached = new CachedFetcher(inner, { cacheDir });

    await cached.fetch("https://example.com/page", { headers: { Accept: "text/html" } });
    await cached.fetch("https://example.com/page", { headers: { Accept: "text/html" } });

    expect(inner.fetch).toHaveBeenCalledOnce();
  });
});
