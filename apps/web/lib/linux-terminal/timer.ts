/**
 * The clock of a timed exercise, such as the practical exam of a path: a time
 * limit counted from the moment the machine is ready, frozen when everything
 * asked is done.
 *
 * Pure functions of timestamps, so the reading stays right when a background
 * tab slows the interval that refreshes it.
 */

export interface TimerReading {
  /** Milliseconds since the start, frozen at the finish. */
  elapsed: number;
  /** Milliseconds left, never below zero. */
  remaining: number;
  /** The limit has passed: at the finish if there is one, or now. */
  expired: boolean;
  /** Everything asked was done. */
  finished: boolean;
}

export function readTimer(
  limitMs: number,
  startedAt: number,
  now: number,
  finishedAt: number | null,
): TimerReading {
  const elapsed = Math.max(0, (finishedAt ?? now) - startedAt);
  return {
    elapsed,
    remaining: Math.max(0, limitMs - elapsed),
    expired: elapsed >= limitMs,
    finished: finishedAt !== null,
  };
}

/** Whole seconds as 29:05, or 1:02:05 past an hour. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${String(minutes).padStart(2, "0")}:${rest}`;
}

/**
 * What the clock shows: the time left, rounded up so the count starts on the
 * full limit and reaches 00:00 only when the limit is reached; once finished,
 * the time it took.
 */
export function clockText(reading: TimerReading): string {
  return reading.finished
    ? formatClock(reading.elapsed / 1000)
    : formatClock(Math.ceil(reading.remaining / 1000));
}

/** "1 minute", "30 minutes". */
export function minutesLabel(minutes: number): string {
  return `${String(minutes)} minute${minutes > 1 ? "s" : ""}`;
}
