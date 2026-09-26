import React from "react";

/**
 * Where somebody is, in one panel.
 *
 * It said the same thing several times: the rank as an eyebrow, the level as a
 * number, the next level beside it, the next rank again under the bar, the
 * remaining XP a third time. Seven fragments for four facts, and the only
 * hierarchy was that one of them was very large.
 *
 * Four now: the rank reached, the level, how far into it, and what the next one
 * costs. The decoration went with them - a diagonal wash behind the whole
 * panel, corner brackets on top of it, a gradient across the numeral and a
 * white gloss inside the bar. Each was a way of making a flat panel look
 * finished; together they made it look like a skin over the content rather
 * than the content itself.
 *
 * What stays is what the rest of the site uses: a flat panel, a hairline, one
 * accent rule on top, and the XP bar's blue-to-accent fill, which is the same
 * one the public profile draws.
 */
export function XpHeroCard({
  level,
  rankName,
  nextRank,
  xpCurrent,
  xpNeeded,
  xpPercent,
  xpNeededToNext,
  userRank,
}: {
  level: number;
  rankName: string;
  nextRank: string;
  xpCurrent: number;
  xpNeeded: number;
  xpPercent: number;
  xpNeededToNext: number;
  userRank: number;
}): React.JSX.Element {
  const fr = (value: number): string => value.toLocaleString("fr-FR");

  return (
    <div
      style={{
        position: "relative",
        padding: "26px 28px 24px",
        background: "#0A0826",
        border: "1px solid #2A2560",
        borderTop: "2px solid var(--cosmetic-accent)",
      }}
    >
      {/* Eyebrow: the rank reached, and the standing that goes with it. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7F7BA9",
          }}
        >
          Progression
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#7F7BA9",
          }}
        >
          {/* 0 is findUserRank's "not ranked": the leaderboard counts students
              only, so a teacher or an admin read "Rang #0". */}
          {userRank > 0 ? (
            <>
              Rang{" "}
              <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>
                #{String(userRank)}
              </b>
            </>
          ) : (
            <span title="Le classement compte les apprenants à partir de leur premier XP.">
              Hors classement
            </span>
          )}
        </span>
      </div>

      {/* The level, and the name it earns. One number, one word. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 24 }}>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: "clamp(56px, 11vw, 88px)",
            lineHeight: 0.8,
            letterSpacing: "-0.055em",
            color: "#F5F5FA",
          }}
        >
          {level}
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#44406B",
            }}
          >
            Niveau
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "-0.01em",
              color: "var(--cosmetic-accent)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {rankName}
          </span>
        </span>
      </div>

      {/* How far into this level. The same bar the public profile draws. */}
      <div
        style={{
          height: 8,
          background: "rgba(5,4,26,0.9)",
          border: "1px solid #2A2560",
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuenow={Math.round(xpPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Niveau ${String(level)}, ${String(Math.round(xpPercent))} %`}
      >
        <div
          style={{
            height: "100%",
            width: `${xpPercent.toFixed(1)}%`,
            background: "linear-gradient(90deg, #0024FF 0%, var(--cosmetic-accent) 100%)",
            transition: "width 700ms ease-out",
          }}
        />
      </div>

      {/* The two facts the bar cannot state: where it is, and what is left. */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "#7F7BA9",
          letterSpacing: "0.04em",
        }}
      >
        <span>
          <b style={{ color: "#F5F5FA", fontWeight: 700 }}>{fr(xpCurrent)}</b> / {fr(xpNeeded)} XP
        </span>
        <span>
          Encore{" "}
          <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>
            {fr(xpNeededToNext)} XP
          </b>{" "}
          pour {nextRank}
        </span>
      </div>
    </div>
  );
}
