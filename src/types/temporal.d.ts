import type * as TemporalNS from "temporal-polyfill";

declare global {
  const Temporal: typeof TemporalNS.Temporal;
  namespace Temporal {
    export type Instant = TemporalNS.Temporal.Instant;
    export type ZonedDateTime = TemporalNS.Temporal.ZonedDateTime;
    export type PlainDateTime = TemporalNS.Temporal.PlainDateTime;
    export type PlainDate = TemporalNS.Temporal.PlainDate;
    export type PlainTime = TemporalNS.Temporal.PlainTime;
    export type Duration = TemporalNS.Temporal.Duration;
  }
}
