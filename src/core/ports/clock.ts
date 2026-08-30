export interface Clock {
  /** Returns the current time as an ISO 8601 string. */
  now(): string;
}

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};
