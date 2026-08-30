export interface Clock {
  /** Returns the current instant. */
  now(): Temporal.Instant;
}

export const systemClock: Clock = {
  now: () => Temporal.Now.instant(),
};
