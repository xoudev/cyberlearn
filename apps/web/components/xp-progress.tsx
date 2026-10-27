import React from "react";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";

/**
 * The way to the next level: the XP so far over the XP needed, a segmented
 * bar with a marker where the reader stands. The profile drew it this way
 * and the public profile its own, plainer, way; one drawing now.
 */
export function XpProgress({
  current,
  needed,
  level,
}: {
  current: number;
  needed: number;
  level: number;
}): React.ReactElement {
  const pct = needed > 0 ? Math.min((current / needed) * 100, 100) : 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        className="mono-label"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: "#aaa79f",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 18,
            fontWeight: 700,
            color: "#f4f2ed",
          }}
        >
          <b style={{ color: "var(--cosmetic-accent)" }}>{current.toLocaleString("fr-FR")}</b> /{" "}
          {needed.toLocaleString("fr-FR")} XP
        </span>
        <span>→ {levelLabel(level + 1)}</span>
        <span style={{ color: "#f4f2ed", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
          {Math.round(pct)}%
        </span>
      </div>

      {/* Segmented bar (marginBottom reserves a row for the reader's marker,
            which now sits below the bar so it never overlaps the centered
            "Niv. N+1" label in the row above) */}
      <div
        style={{
          position: "relative",
          height: 10,
          marginBottom: 24,
          overflow: "visible",
          background: "#303137",
        }}
      >
        {/* Hash marks */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), #0b0c0e calc(10% - 1px), #0b0c0e 10%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
          aria-hidden="true"
        />
        {/* Fill */}
        <div
          style={{
            position: "relative",
            height: "100%",
            width: `${pct.toFixed(1)}%`,
            background: "var(--cosmetic-accent)",
            zIndex: 0,
          }}
        >
          {/* Marker line */}
          <div
            style={{
              position: "absolute",
              right: -1,
              top: -4,
              bottom: -4,
              width: 2,
              background: "#f4f2ed",
            }}
            aria-hidden="true"
          />
        </div>
        {/* The reader's label - placed below the bar so it never collides with the
              centered "Niv. N+1" label sitting above the track */}
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 5px)",
            left: `${pct.toFixed(1)}%`,
            transform: "translateX(-50%)",
            fontFamily: "var(--font-interface)",
            fontSize: 12,
            fontWeight: 600,
            color: "#f4f2ed",
            whiteSpace: "nowrap",
            zIndex: 3,
          }}
        >
          Toi · {current.toLocaleString("fr-FR")}
        </span>
      </div>
    </div>
  );
}
