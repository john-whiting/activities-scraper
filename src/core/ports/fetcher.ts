export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
}

export interface FetchResponse {
  status: number;
  headers: Record<string, string>;
  /** Raw body as text. Adapters may decode binary bodies appropriately. */
  body: string;
}

export interface Fetcher {
  fetch(url: string, options?: FetchOptions): Promise<FetchResponse>;
}
