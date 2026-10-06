"use client";

import { Pills } from "@/components/pills";
import React, { useState, useMemo } from "react";
import type { BadgeGroup } from "@/lib/badges/collection";
import { Crumb } from "@/components/crumb";
import { BadgeCard, rarityChrome } from "@/components/badge-card";
import { ProgressBar } from "@/components/progress-bar";

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

const RARITY_PILL_COLOR: Record<string, string> = {
  all: "var(--color-rarity-common)",
  legendary: "var(--color-rarity-legendary)",
  epic: "var(--color-rarity-epic)",
  rare: "var(--color-rarity-rare)",
  common: "var(--color-rarity-common)",
};

// ── Check / Lock icons ────────────────────────────────────────────────────────

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
      className="mono-label mono-label--md"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 22,
        fontWeight: 700,
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
          color: "var(--color-text-muted)",
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
      <Crumb segments={["badges"]} />

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
              color: "var(--color-text-primary)",
              margin: "0 0 14px",
            }}
          >
            Ton{" "}
            <em
              style={{
                fontStyle: "normal",
                background:
                  "linear-gradient(135deg, var(--color-brand-blue) 0%, var(--cosmetic-accent) 100%)",
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
                color: "var(--color-text-muted)",
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
              color: "var(--color-text-secondary)",
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
            className="mono-label"
            style={{
              display: "flex",
              gap: 18,
              color: "var(--color-text-muted)",
              flexWrap: "wrap",
            }}
          >
            <span>
              <b style={{ color: "var(--color-rarity-legendary)" }}>
                {rarityEarned.LEGENDARY ?? 0}
              </b>{" "}
              légendaire
            </span>
            <span style={{ color: "var(--color-text-faint)" }}>/</span>
            <span>
              <b style={{ color: "var(--color-rarity-epic)" }}>{rarityEarned.EPIC ?? 0}</b> épiques
            </span>
            <span style={{ color: "var(--color-text-faint)" }}>/</span>
            <span>
              <b style={{ color: "var(--color-rarity-rare)" }}>{rarityEarned.RARE ?? 0}</b> rares
            </span>
            <span style={{ color: "var(--color-text-faint)" }}>/</span>
            <span>
              <b style={{ color: "var(--color-rarity-common)" }}>{rarityEarned.COMMON ?? 0}</b>{" "}
              communs
            </span>
          </div>

          {/* Global progress bar */}
          <ProgressBar value={pct} size="md" tip label="Badges obtenus" style={{ maxWidth: 320 }} />

          <div
            className="mono-label"
            style={{
              display: "flex",
              gap: 14,
              color: "var(--color-text-muted)",
            }}
          >
            <span>
              PROGRESSION · <b style={{ color: "var(--color-text-primary)" }}>{Math.round(pct)}%</b>
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
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
            marginRight: 6,
          }}
        >
          › RARETÉ
        </span>

        <Pills
          label="Rareté"
          items={pills.map((pill) => ({
            key: pill.id,
            label: pill.label,
            count: pill.count,
            color: RARITY_PILL_COLOR[pill.id] ?? "var(--color-rarity-common)",
          }))}
          value={activeFilter}
          onChange={setActiveFilter}
        />

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
              color: "var(--color-text-muted)",
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
              background: "var(--color-bg-sunken)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              outline: "none",
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
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--color-text-muted)" }}>
          <p className="mono-label mono-label--md">{"// Aucun badge trouvé"}</p>
        </div>
      )}
    </div>
  );
}
