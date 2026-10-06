"use client";

// "use client" justification: the time left ticks every second, and the page
// is read again when the week turns, to name the next challenge.

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { remainingLabel } from "@cyberlearn/lib/challenges/weekly";

/** Monday 00:00 UTC, as a French reader reads it: "lundi 12 octobre à 02:00". */
const END_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/**
 * The time left on the week's challenge: "XP ×2 encore 5 j 11 h". It starts
 * from the server's clock (`nowMs`), so the first paint matches the page the
 * server sent, then follows the reader's. When the week ends, the page is
 * read again: another challenge takes over, and the bonus with it.
 */
export function WeeklyCountdown({
  endsAt,
  nowMs,
  prefix,
}: {
  /** ISO 8601, the end of the week. */
  endsAt: string;
  /** The server's clock when it built the page. */
  nowMs: number;
  /** What runs out: "XP ×2 encore", "Prochain défi dans". */
  prefix: string;
}): React.JSX.Element {
  const router = useRouter();
  const endMs = Date.parse(endsAt);
  const [now, setNow] = useState(nowMs);
  const refreshed = useRef(false);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const left = endMs - now;
  useEffect(() => {
    if (left <= 0 && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [left, router]);

  return (
    <span className="dfx-timer" title={`Jusqu'au ${END_FORMAT.format(new Date(endMs))}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4.5V8l2.5 1.5" />
      </svg>
      {prefix} <time dateTime={endsAt}>{remainingLabel(left)}</time>
    </span>
  );
}
