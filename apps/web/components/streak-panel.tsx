import React from "react";
import { dayKey, nextMilestone, previousDayKey } from "@cyberlearn/lib";
import { streakRepository } from "@cyberlearn/db";

const TURQ = "#0AFFD4";
const AMBER = "#FFB547";
const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";
// Empty → low → mid → full activity, turquoise scale.
const HEAT = ["rgba(42,37,96,0.45)", "rgba(10,255,212,0.28)", "rgba(10,255,212,0.55)", "#0AFFD4"];

function intensity(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

function Stat({
  label,
  value,
  color = "#F5F5FA",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "#6F6B99",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 3 }}>{value}</div>
    </div>
  );
}

/**
 * Daily-streak panel: counter (active/broken), record, this-year + next-milestone
 * stats, a 126-day activity heatmap, and the streak-freeze reserve. Server
 * component - reads everything from streakRepository. Embedded on dashboard +
 * profile.
 */
export async function StreakPanel({
  userId,
}: { userId: string }): Promise<React.ReactElement | null> {
  const o = await streakRepository.getOverview(userId);
  if (!o) return null;

  const cells: { key: string; level: number }[] = [];
  let key = dayKey(new Date());
  for (let i = 0; i < 126; i++) {
    cells.push({ key, level: intensity(o.activity[key] ?? 0) });
    key = previousDayKey(key);
  }
  cells.reverse();

  const next = nextMilestone(o.currentStreak);
  const accent = o.active ? TURQ : "#6B6890";

  return (
    <div
      style={{
        border: "1px solid #2A2560",
        background: "rgba(10,8,38,0.5)",
        padding: "clamp(20px,3vw,30px)",
      }}
    >
      {/* Counter + record */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span
            style={{
              position: "relative",
              width: 60,
              height: 68,
              display: "grid",
              placeItems: "center",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                clipPath: HEX,
                background: o.active ? "rgba(10,255,212,0.25)" : "rgba(42,37,96,0.5)",
              }}
            />
            <span
              aria-hidden="true"
              style={{ position: "absolute", inset: 1.5, clipPath: HEX, background: "#05041A" }}
            />
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              style={{ position: "relative", color: accent }}
              aria-hidden="true"
            >
              <path
                d="M13 2 L4 14 H11 L10 22 L19 9 H12 Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 800,
                  fontSize: 44,
                  lineHeight: 1,
                  color: "#F5F5FA",
                  letterSpacing: "-0.03em",
                }}
              >
                {o.currentStreak}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#B8B5D1",
                }}
              >
                jours
              </span>
            </div>
            <div
              style={{
                marginTop: 7,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: accent,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: accent,
                  boxShadow: o.active ? `0 0 8px ${TURQ}` : "none",
                }}
              />
              {o.active ? "Série active" : "Série rompue · relance-la"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "#6F6B99",
              textTransform: "uppercase",
            }}
          >
            Record
          </div>
          <div
            style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 24, color: AMBER }}
          >
            {o.longestStreak}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
          marginTop: 20,
          paddingTop: 18,
          borderTop: "1px solid #2A2560",
          fontFamily: "var(--font-mono)",
        }}
      >
        <Stat label="Record perso" value={`${String(o.longestStreak)} j`} color={AMBER} />
        <Stat label="Cette année" value={`${String(o.daysThisYear)} j`} />
        <Stat
          label="Prochain palier"
          value={next === null ? "max" : `${String(next)} j`}
          color={TURQ}
        />
      </div>

      {/* Heatmap */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "#6F6B99",
            textTransform: "uppercase",
          }}
        >
          <span>126 derniers jours</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            moins
            {[0, 1, 2, 3].map((l) => (
              <span
                key={`legend-${String(l)}`}
                style={{ width: 10, height: 11, clipPath: HEX, background: HEAT[l] }}
              />
            ))}
            plus
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, 14px)",
            gap: 4,
            justifyContent: "space-between",
          }}
        >
          {cells.map((c) => (
            <span
              key={c.key}
              style={{ width: 13, height: 15, clipPath: HEX, background: HEAT[c.level] }}
            />
          ))}
        </div>
      </div>

      {/* Streak-freeze reserve */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 16px",
          border: "1px solid rgba(10,255,212,0.25)",
          background: "rgba(10,255,212,0.04)",
        }}
      >
        <span
          style={{
            width: 34,
            height: 38,
            flexShrink: 0,
            clipPath: HEX,
            background: "rgba(10,255,212,0.12)",
            display: "grid",
            placeItems: "center",
            color: TURQ,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 2 V22 M2 12 H22 M5 5 L19 19 M19 5 L5 19" />
          </svg>
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#F5F5FA",
            }}
          >
            Streak-freeze · <span style={{ color: TURQ }}>{o.freezes} dispo</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "#B8B5D1",
              marginTop: 4,
            }}
          >
            Protège ta série d&apos;un jour manqué. Se consomme automatiquement si tu sautes une
            journée.
          </div>
        </div>
      </div>
    </div>
  );
}
