import { setTimeout as sleep } from "node:timers/promises";
import type { Fetcher, FetchOptions, FetchResponse } from "../../core/ports/fetcher.js";

const DEFAULT_UA = "activities-scraper/0.1 (+https://github.com/john-whiting/activities-scraper)";
const DEFAULT_MIN_DELAY_MS = 1000;
const DEFAULT_MAX_RETRIES = 3;

export interface HttpFetcherOptions {
  userAgent?: string;
  /** Minimum milliseconds to wait between requests (polite delay). */
  minDelayMs?: number;
  maxRetries?: number;
}

export class HttpFetcher implements Fetcher {
  private readonly userAgent: string;
  private readonly minDelayMs: number;
  private readonly maxRetries: number;
  private lastRequestAt = 0;

  constructor(options: HttpFetcherOptions = {}) {
    this.userAgent = options.userAgent ?? DEFAULT_UA;
    this.minDelayMs = options.minDelayMs ?? DEFAULT_MIN_DELAY_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResponse> {
    await this.politeDelay();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await globalThis.fetch(url, {
          method: options.method ?? "GET",
          headers: {
            "User-Agent": this.userAgent,
            Accept: "text/html,application/xhtml+xml,*/*",
            ...options.headers,
          },
          body: options.body as BodyInit | undefined,
          signal: controller.signal,
        });

        const body = await response.text();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        return { status: response.status, headers, body };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          await sleep(2 ** attempt * 500);
          await this.politeDelay();
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error(`Failed to fetch ${url}`);
  }

  private async politeDelay(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.minDelayMs) {
      await sleep(this.minDelayMs - elapsed);
    }
    this.lastRequestAt = Date.now();
  }
}
