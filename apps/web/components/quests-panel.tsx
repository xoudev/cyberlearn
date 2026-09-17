import React from "react";
import { isoWeekKey, msUntilWeekReset } from "@cyberlearn/lib";
import { questRepository } from "@cyberlearn/db";
import type { QuestType, QuestWithProgress } from "@cyberlearn/db";
import { ClaimQuestButton } from "./claim-quest-button";

const TURQ = "var(--cosmetic-accent)";
const AMBER = "#FFB547";
const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

function fmtReset(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  return `${String(d)}j ${String(h)}h ${String(m)}m`;
}

function QuestGlyph({ type }: { type: QuestType }): React.ReactElement {
  const c = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "LESSON_COMPLETED":
      return (
        <svg {...c} aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "PERFECT_QUIZ":
      return (
        <svg {...c} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M8.5 12l2.5 2.5 4.5-5" />
        </svg>
      );
    case "STREAK_DAYS":
      return (
        <svg {...c} aria-hidden="true">
          <path d="M13 2 L5 13 H11 L10 22 L18 10 H12 Z" />
        </svg>
      );
    case "FORUM_POST":
      return (
        <svg {...c} aria-hidden="true">
          <path d="M4 5h16v10H9l-4 4V5z" />
        </svg>
      );
    case "WEEKLY_BONUS":
      return (
        <svg {...c} aria-hidden="true">
          <path d="M4 17l2-9 4 5 2-7 2 7 4-5 2 9z" />
        </svg>
      );
    default:
      return (
        <svg {...c} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function QuestRow({ q }: { q: QuestWithProgress }): React.ReactElement {
  const accent = q.completed ? TURQ : "#6B6890";
  const pct = q.target > 0 ? Math.min(100, Math.round((q.progress / q.target) * 100)) : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 0",
        borderTop: "1px solid #1F1B47",
      }}
    >
      <span
        style={{
          position: "relative",
          width: 44,
          height: 50,
          flexShrink: 0,
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
            background: q.completed
              ? "color-mix(in srgb, var(--cosmetic-accent) 16%, transparent)"
              : "rgba(42,37,96,0.45)",
          }}
        />
        <span
          aria-hidden="true"
          style={{ position: "absolute", inset: 1.5, clipPath: HEX, background: "#05041A" }}
        />
        <span style={{ position: "relative", color: accent }}>
          <QuestGlyph type={q.type} />
        </span>
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 15,
            color: "#F5F5FA",
          }}
        >
          {q.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <span
            style={{
              position: "relative",
              flex: 1,
              height: 5,
              background: "#05041A",
              border: "1px solid #1F1B47",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                width: `${String(pct)}%`,
                background: "linear-gradient(90deg, #0024FF, var(--cosmetic-accent))",
              }}
            />
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6F6B99",
              whiteSpace: "nowrap",
            }}
          >
            <b style={{ color: "#B8B5D1" }}>{q.progress}</b>/{q.target}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {q.claimed ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6F6B99",
            }}
          >
            ✓ Réclamé
          </span>
        ) : q.completed ? (
          <ClaimQuestButton questId={q.id} xpReward={q.xpReward} />
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: q.type === "WEEKLY_BONUS" ? AMBER : "#6F6B99",
            }}
          >
            ● +{q.xpReward} XP
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Weekly-quests dashboard panel: weekly completion bar, the four quests with
 * progress + claim buttons, and the completion bonus row. Reproduces the
 * provided design. Server component - reads questRepository.findWeek().
 */
export async function QuestsPanel({
  userId,
}: { userId: string }): Promise<React.ReactElement | null> {
  const now = new Date();
  const quests = await questRepository.findWeek(userId, isoWeekKey(now));
  if (quests.length === 0) return null;

  const main = quests.filter((q) => q.type !== "WEEKLY_BONUS");
  const bonus = quests.find((q) => q.type === "WEEKLY_BONUS");
  if (main.length === 0) return null;

  const claimedCount = main.filter((q) => q.claimed).length;
  const pct = Math.round((claimedCount / main.length) * 100);
  const totalXp = main.reduce((s, q) => s + q.xpReward, 0);
  const claimedXp = main.filter((q) => q.claimed).reduce((s, q) => s + q.xpReward, 0);

  return (
    <div
      style={{
        border: "1px solid #2A2560",
        background: "rgba(10,8,38,0.5)",
        padding: "clamp(20px,3vw,30px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 20,
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          Quêtes de la semaine
        </h3>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "#6F6B99",
            border: "1px solid #2A2560",
            padding: "5px 11px",
          }}
        >
          Reset dans <b style={{ color: "#B8B5D1" }}>{fmtReset(msUntilWeekReset(now))}</b>
        </span>
      </div>

      {/* Weekly completion */}
      <div style={{ marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#6F6B99",
            marginBottom: 8,
          }}
        >
          <span>Complétion hebdo</span>
          <span>
            <b style={{ color: "#B8B5D1" }}>
              {claimedCount}/{main.length}
            </b>{" "}
            · {pct}%
          </span>
        </div>
        <span
          style={{
            position: "relative",
            display: "block",
            height: 6,
            background: "#05041A",
            border: "1px solid #1F1B47",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              width: `${String(pct)}%`,
              background: "linear-gradient(90deg, #0024FF, var(--cosmetic-accent))",
              boxShadow: "0 0 12px color-mix(in srgb, var(--cosmetic-accent) 40%, transparent)",
            }}
          />
        </span>
      </div>

      {/* Quest rows */}
      <div style={{ marginTop: 12 }}>
        {main.map((q) => (
          <QuestRow key={q.id} q={q} />
        ))}
      </div>

      {/* Completion bonus */}
      {bonus && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 16px",
            border: "1px solid rgba(255,181,71,0.4)",
            background: "rgba(255,181,71,0.05)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              position: "relative",
              width: 40,
              height: 46,
              flexShrink: 0,
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
                background: "rgba(255,181,71,0.18)",
              }}
            />
            <span
              aria-hidden="true"
              style={{ position: "absolute", inset: 1.5, clipPath: HEX, background: "#05041A" }}
            />
            <span style={{ position: "relative", color: AMBER }}>
              <QuestGlyph type="WEEKLY_BONUS" />
            </span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6F6B99",
              }}
            >
              Bonus complétion · les {main.length} quêtes
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "#F5F5FA",
              }}
            >
              <b style={{ color: AMBER }}>+{bonus.xpReward} XP</b>
              {bonus.freezeReward > 0 ? ` + ${String(bonus.freezeReward)} streak-freeze` : ""} ·{" "}
              <span style={{ color: "#B8B5D1" }}>
                {claimedXp}/{totalXp} XP réclamés
              </span>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {bonus.claimed ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#6F6B99",
                }}
              >
                ✓ Réclamé
              </span>
            ) : bonus.completed ? (
              <ClaimQuestButton questId={bonus.id} xpReward={bonus.xpReward} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
