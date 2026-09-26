"use client";

import React, { useState, useMemo } from "react";
import {
  BadgeMedallion,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_VAR,
  toBadgeRarity,
} from "@cyberlearn/ui";
import type { BadgeGroup, SerializedBadge } from "@/lib/badges/collection";

// ── Types ─────────────────────────────────────────────────────────────────────
// BadgeGroup and SerializedBadge come from the service that builds the
// collection for the site and the app (@/lib/badges/collection).

interface Props {
  groups: BadgeGroup[];
  earnedCount: number;
  totalCount: number;
  rarityTotals: Record<string, number>;
  rarityEarned: Record<string, number>;
}

// ── Rarity chrome (card strip / border / progress): all derived from the one
//    centralised token (var --color-rarity-*), so there is a single scale. ─────

function rarityChrome(rarity: string): {
  color: string;
  borderColor: string;
  grad: string;
  glow: string;
  secColor: string;
  stripShadow: string;
} {
  const v = BADGE_RARITY_VAR[toBadgeRarity(rarity)];
  return {
    color: v,
    borderColor: `color-mix(in oklab, ${v} 30%, #1f1b47)`,
    grad: `linear-gradient(135deg, ${v}, color-mix(in oklab, ${v} 50%, #05041a))`,
    glow: `color-mix(in oklab, ${v} 16%, transparent)`,
    secColor: v,
    stripShadow: `0 0 12px color-mix(in oklab, ${v} 55%, transparent)`,
  };
}

const RARITY_PILL_COLOR: Record<string, string> = {
  all: "var(--color-rarity-common)",
  legendary: "var(--color-rarity-legendary)",
  epic: "var(--color-rarity-epic)",
  rare: "var(--color-rarity-rare)",
  common: "var(--color-rarity-common)",
};

// ── Check / Lock icons ────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8 L7 12 L13 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7 V5 C5 3.3 6.3 2 8 2 C9.7 2 11 3.3 11 5 V7" />
    </svg>
  );
}

// ── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({ badge }: { badge: SerializedBadge }) {
  const [hovered, setHovered] = useState(false);
  const r = rarityChrome(badge.rarity);
  const isLeg = badge.rarity === "LEGENDARY";
  const pct = badge.progress ? Math.round((badge.progress.done / badge.progress.total) * 100) : 0;

  return (
    <article
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      style={{
        position: "relative",
        padding: isLeg ? "32px 24px 26px" : "26px 20px 22px",
        background: badge.earned ? "rgba(10,8,38,0.5)" : "rgba(7,5,32,0.4)",
        border: `1px solid ${
          badge.earned ? (hovered ? "#2A2560" : r.borderColor) : hovered ? "#2A2560" : "#1F1B47"
        }`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 280ms cubic-bezier(0.16,1,0.3,1), border-color 180ms ease",
      }}
    >
      {/* Bottom atmospheric glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: badge.earned
            ? `radial-gradient(ellipse 80% 60% at 50% 100%, ${r.glow}, transparent 70%)`
            : "none",
          opacity: 0.55,
        }}
        aria-hidden="true"
      />

      {/* Rarity strip */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: badge.earned
            ? `linear-gradient(90deg, transparent, ${r.color}, transparent)`
            : "linear-gradient(90deg, transparent, #44406B, transparent)",
          boxShadow: badge.earned ? r.stripShadow : "none",
        }}
        aria-hidden="true"
      />

      {/* Legendary corner brackets */}
      {isLeg && (
        <>
          <span
            style={{
              position: "absolute",
              top: -1,
              left: -1,
              width: 12,
              height: 12,
              borderTop: `2px solid ${r.color}`,
              borderLeft: `2px solid ${r.color}`,
              opacity: 0.7,
            }}
          />
          <span
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 12,
              height: 12,
              borderTop: `2px solid ${r.color}`,
              borderRight: `2px solid ${r.color}`,
              opacity: 0.7,
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              left: -1,
              width: 12,
              height: 12,
              borderBottom: `2px solid ${r.color}`,
              borderLeft: `2px solid ${r.color}`,
              opacity: 0.7,
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 12,
              height: 12,
              borderBottom: `2px solid ${r.color}`,
              borderRight: `2px solid ${r.color}`,
              opacity: 0.7,
            }}
          />
        </>
      )}

      {/* RefCode label */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#7F7BA9",
        }}
      >
        {"// "}
        <b style={{ color: badge.earned ? r.color : "#44406B" }}>{badge.refCode}</b>
      </div>

      {/* Lock icon (unearned) */}
      {!badge.earned && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 24,
            height: 24,
            display: "grid",
            placeItems: "center",
            background: "#05041A",
            border: "1px solid #2A2560",
            color: "#7F7BA9",
            zIndex: 2,
          }}
        >
          <LockIcon />
        </div>
      )}

      {/* Hexagonal medallion: shared component */}
      <BadgeMedallion
        rarity={toBadgeRarity(badge.rarity)}
        size={isLeg ? "lg" : "md"}
        state={badge.earned ? "unlocked" : "locked"}
        iconUrl={badge.iconUrl}
        name={badge.name}
        style={{ margin: isLeg ? "10px 0 22px" : "8px 0 18px" }}
      />

      {/* Rarity label */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 9.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: badge.earned ? r.color : "#44406B",
          marginBottom: 8,
        }}
      >
        · {BADGE_RARITY_LABELS[toBadgeRarity(badge.rarity)]} ·
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: isLeg ? 22 : 17,
          lineHeight: 1.15,
          color: badge.earned ? "#F5F5FA" : "#B8B5D1",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
        }}
      >
        {badge.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: isLeg ? 13 : 12.5,
          lineHeight: 1.5,
          color: badge.earned ? "#B8B5D1" : "#7F7BA9",
          margin: "0 0 16px",
          maxWidth: isLeg ? 320 : 260,
        }}
      >
        {badge.description}
      </p>

      {/* Footer: earned date or progress */}
      {badge.earned ? (
        <div
          style={{
            marginTop: "auto",
            width: "100%",
            paddingTop: 14,
            borderTop: "1px solid #1A1640",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#7F7BA9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 14,
              height: 14,
              color: r.color,
            }}
          >
            <CheckIcon />
          </span>
          Obtenu le <b style={{ color: r.color, fontWeight: 700 }}>{badge.earnedDateStr}</b>
        </div>
      ) : badge.progress ? (
        <div
          style={{
            width: "100%",
            marginTop: "auto",
            paddingTop: 14,
            borderTop: "1px solid #1A1640",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#7F7BA9",
              marginBottom: 6,
            }}
          >
            <span>
              <b style={{ color: "#F5F5FA", fontWeight: 700 }}>
                {badge.progress.done}/{badge.progress.total}
              </b>{" "}
              {badge.progress.label}
            </span>
            <span style={{ color: r.color, fontWeight: 700 }}>{pct}%</span>
          </div>
          <div
            style={{
              position: "relative",
              height: 3,
              background: "#05041A",
              borderTop: "1px solid #2A2560",
              borderBottom: "1px solid #2A2560",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${String(pct)}%`,
                background: r.grad,
                boxShadow: `0 0 8px ${r.color}`,
              }}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: "auto",
            width: "100%",
            paddingTop: 14,
            borderTop: "1px solid #1A1640",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#44406B",
            textAlign: "center",
          }}
        >
          {"// verrouillé"}
        </div>
      )}
    </article>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  rarity,
  label,
  earned,
  total,
}: {
  rarity: string;
  label: string;
  earned: number;
  total: number;
}) {
  const meta = rarityChrome(rarity);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 22,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: meta.secColor,
      }}
    >
      {/* Left fade rule */}
      <span
        style={{
          maxWidth: 60,
          flex: "0 0 60px",
          height: 1,
          background: `linear-gradient(90deg, transparent, ${meta.secColor})`,
        }}
      />
      <span>── {label} ──</span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: 11,
          color: "#7F7BA9",
          letterSpacing: "0.14em",
        }}
      >
        <b style={{ color: meta.secColor }}>{earned}</b> / {total} obtenus
      </span>
      {/* Right fade rule */}
      <span
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(90deg, ${meta.secColor}, transparent)`,
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BadgesCollection({
  groups,
  earnedCount,
  totalCount,
  rarityTotals,
  rarityEarned,
}: Props): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const pct = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  const visibleGroups = useMemo(() => {
    return groups
      .filter((g) => activeFilter === "all" || g.rarity.toLowerCase() === activeFilter)
      .map((g) => ({
        ...g,
        badges: search.trim()
          ? g.badges.filter(
              (b) =>
                b.name.toLowerCase().includes(search.toLowerCase()) ||
                b.description.toLowerCase().includes(search.toLowerCase()),
            )
          : g.badges,
      }))
      .filter((g) => g.badges.length > 0);
  }, [groups, activeFilter, search]);

  const pills = [
    { id: "all", label: "Tous", count: totalCount },
    { id: "legendary", label: "Légendaire", count: rarityTotals.LEGENDARY ?? 0 },
    { id: "epic", label: "Épique", count: rarityTotals.EPIC ?? 0 },
    { id: "rare", label: "Rare", count: rarityTotals.RARE ?? 0 },
    { id: "common", label: "Commun", count: rarityTotals.COMMON ?? 0 },
  ];

  return (
    <div className="page-container">
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "#7F7BA9",
          marginBottom: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "var(--cosmetic-accent)" }}>$</span>
        <span>~/</span>
        <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
        <span style={{ color: "#44406B" }}>/</span>
        <span style={{ color: "#F5F5FA", fontWeight: 500 }}>badges</span>
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: "var(--cosmetic-accent)",
            boxShadow: "0 0 8px var(--cosmetic-accent)",
            marginLeft: 4,
            verticalAlign: "-2px",
            animation: "blink 1s step-end infinite",
          }}
          aria-hidden="true"
        />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="catalog-header-grid">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(44px, 5.4vw, 76px)",
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#F5F5FA",
              margin: "0 0 14px",
            }}
          >
            Ton{" "}
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(135deg, #0024FF 0%, var(--cosmetic-accent) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              arsenal
            </em>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: "0.42em",
                letterSpacing: "0.04em",
                color: "#7F7BA9",
                verticalAlign: "0.25em",
                marginLeft: 14,
              }}
            >
              <b style={{ color: "var(--cosmetic-accent)", fontWeight: 700 }}>{earnedCount}</b> /{" "}
              {totalCount}
            </span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "#B8B5D1",
              margin: 0,
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            Badges groupés par rareté. Continue à grinder pour débloquer le reste, chaque palier
            raconte une compétence.
          </p>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}
        >
          {/* Rarity breakdown */}
          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#7F7BA9",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              flexWrap: "wrap",
            }}
          >
            <span>
              <b style={{ color: "var(--color-rarity-legendary)" }}>
                {rarityEarned.LEGENDARY ?? 0}
              </b>{" "}
              légendaire
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "var(--color-rarity-epic)" }}>{rarityEarned.EPIC ?? 0}</b> épiques
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "var(--color-rarity-rare)" }}>{rarityEarned.RARE ?? 0}</b> rares
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "var(--color-rarity-common)" }}>{rarityEarned.COMMON ?? 0}</b>{" "}
              communs
            </span>
          </div>

          {/* Global progress bar */}
          <div
            style={{
              position: "relative",
              height: 6,
              background: "#05041A",
              border: "1px solid #2A2560",
              width: "100%",
              maxWidth: 320,
              overflow: "visible",
            }}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              style={{
                height: "100%",
                width: `${pct.toFixed(1)}%`,
                background: "linear-gradient(90deg, #0024FF, var(--cosmetic-accent))",
                boxShadow: "0 0 10px color-mix(in srgb, var(--cosmetic-accent) 50%, transparent)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -1,
                  top: -3,
                  bottom: -3,
                  width: 2,
                  background: "var(--cosmetic-accent)",
                  boxShadow: "0 0 10px var(--cosmetic-accent)",
                }}
                aria-hidden="true"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#7F7BA9",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>
              PROGRESSION · <b style={{ color: "#F5F5FA" }}>{Math.round(pct)}%</b>
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div
        suppressHydrationWarning
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7F7BA9",
            marginRight: 6,
          }}
        >
          › RARETÉ
        </span>

        {pills.map((pill) => {
          const isActive = activeFilter === pill.id;
          const dotColor = RARITY_PILL_COLOR[pill.id] ?? "var(--color-rarity-common)";
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setActiveFilter(pill.id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 34,
                padding: "0 16px",
                background: isActive
                  ? `color-mix(in oklab, ${dotColor} 6%, transparent)`
                  : "transparent",
                border: `1px solid ${isActive ? dotColor : "#2A2560"}`,
                color: isActive ? dotColor : "#B8B5D1",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: "pointer",
                borderRadius: 0,
                boxShadow: isActive
                  ? `0 0 0 1px color-mix(in oklab, ${dotColor} 25%, transparent), 0 0 18px color-mix(in oklab, ${dotColor} 19%, transparent)`
                  : "none",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  background: dotColor,
                  transform: "rotate(45deg)",
                  boxShadow: isActive ? `0 0 6px ${dotColor}` : "none",
                }}
              />
              <span>{pill.label}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  padding: "1px 6px",
                  border: `1px solid ${isActive ? `color-mix(in oklab, ${dotColor} 38%, transparent)` : "#2A2560"}`,
                  letterSpacing: "0.04em",
                  color: isActive ? dotColor : "#7F7BA9",
                }}
              >
                {pill.count}
              </span>
            </button>
          );
        })}

        {/* Search input */}
        <label
          style={{
            marginLeft: "auto",
            position: "relative",
            height: 34,
            minWidth: 220,
            display: "block",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#7F7BA9",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="/ chercher un badge..."
            style={{
              width: "100%",
              height: "100%",
              padding: "0 12px 0 36px",
              background: "#05041A",
              border: "1px solid #2A2560",
              color: "#F5F5FA",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              outline: "none",
              borderRadius: 0,
            }}
          />
        </label>
      </div>

      {/* ── Badge sections ─────────────────────────────────────────────────── */}
      {visibleGroups.map((group) => {
        const earnedInGroup = group.badges.filter((b) => b.earned).length;
        return (
          <section key={group.rarity} style={{ marginTop: 56 }}>
            <SectionHeader
              rarity={group.rarity}
              label={group.label}
              earned={earnedInGroup}
              total={group.badges.length}
            />
            <div className="grid-3-col">
              {group.badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Empty state when search returns nothing */}
      {visibleGroups.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#7F7BA9" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {"// Aucun badge trouvé"}
          </p>
        </div>
      )}
    </div>
  );
}
