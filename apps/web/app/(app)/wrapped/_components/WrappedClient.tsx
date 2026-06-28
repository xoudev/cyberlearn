"use client";

import React, { useState } from "react";
import type { WrappedPayload } from "@cyberlearn/lib";

// ── Style language (shared dark / neon idiom, one accent per card) ────────────

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-sans)" };

interface Accent {
  main: string;
  soft: string;
  grad: string;
}

const ACCENTS: readonly [Accent, Accent, Accent, Accent, Accent] = [
  {
    main: "#4D8BFF",
    soft: "rgba(77,139,255,0.14)",
    grad: "linear-gradient(135deg, #5FE6FF, #4D8BFF)",
  },
  {
    main: "#0AFFD4",
    soft: "rgba(10,255,212,0.14)",
    grad: "linear-gradient(135deg, #5FFFE6, #0AFFD4)",
  },
  {
    main: "#FFB547",
    soft: "rgba(255,181,71,0.14)",
    grad: "linear-gradient(135deg, #FFE08A, #FFB547)",
  },
  {
    main: "#FF5B6E",
    soft: "rgba(255,91,110,0.14)",
    grad: "linear-gradient(135deg, #FF8AA0, #FF5B6E)",
  },
  {
    main: "#B14DFF",
    soft: "rgba(177,77,255,0.14)",
    grad: "linear-gradient(135deg, #D08AFF, #B14DFF)",
  },
];

const DOMAIN_LABEL: Record<string, string> = {
  DEV: "Dev",
  CYBERSEC: "Cybersec",
  NETWORK: "Réseau",
};
const RARITY_LABEL: Record<string, string> = {
  COMMON: "Commun",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
};
const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  ARGENT: "Argent",
  OR: "Or",
  PLATINE: "Platine",
  DIAMANT: "Diamant",
  ELITE: "Élite",
};

function fmtXp(n: number): string {
  return n.toLocaleString("fr-FR");
}

function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`;
  return String(n);
}

/** "Mars 2026" (withYear) or "février" from a "YYYY-MM" key. */
function monthLabel(periodKey: string, withYear: boolean): string {
  const date = new Date(`${periodKey}-01T12:00:00Z`);
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
  return withYear ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

function prevMonthKey(periodKey: string): string {
  const [y, m] = periodKey.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 0, (m ?? 1) - 2, 1));
  return `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function topPercent(rank: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(1, Math.round((rank / total) * 100));
}

// ── Card shell ────────────────────────────────────────────────────────────────

function CardShell({
  index,
  count,
  accent,
  eyebrow,
  children,
  footer,
}: {
  index: number;
  count: number;
  accent: Accent;
  eyebrow: string;
  children: React.ReactNode;
  footer: string;
}): React.JSX.Element {
  return (
    <article
      style={{
        position: "relative",
        flex: "0 0 300px",
        scrollSnapAlign: "center",
        height: 460,
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(255,255,255,0.04), transparent 60%), rgba(5,4,26,0.85)",
        border: "1px solid #2A2560",
        overflow: "hidden",
      }}
    >
      {/* accent bar */}
      <div style={{ height: 4, background: accent.grad }} />

      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px 0",
          ...MONO,
          fontSize: 11,
          letterSpacing: "0.12em",
          color: "#6B6890",
        }}
      >
        <span>
          <b style={{ color: "#0AFFD4", fontWeight: 600 }}>cyber</b>{" "}
          <span style={{ color: "#B8B5D1" }}>learn</span>
        </span>
        <span>
          {String(index).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
      </div>

      {/* body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "26px 22px 0" }}>
        <span
          style={{
            ...MONO,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: accent.main,
            marginBottom: 18,
          }}
        >
          {eyebrow}
        </span>
        {children}
      </div>

      {/* footer */}
      <div
        style={{
          padding: "14px 22px 18px",
          borderTop: "1px solid rgba(42,37,96,0.6)",
          ...MONO,
          fontSize: 10.5,
          letterSpacing: "0.06em",
          color: "#6B6890",
        }}
      >
        <span style={{ color: "#44406B" }}>{"// "}</span>
        {footer}
      </div>
    </article>
  );
}

function BigStat({
  value,
  unit,
  accent,
}: { value: string; unit?: string; accent: Accent }): React.JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <span
        style={{
          ...DISPLAY,
          fontWeight: 800,
          fontSize: 66,
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          color: "#F5F5FA",
        }}
      >
        {value}
      </span>
      {unit ? (
        <span
          style={{
            ...DISPLAY,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: "-0.02em",
            color: accent.main,
          }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
}

function Lead({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p
      style={{
        ...DISPLAY,
        fontSize: 14,
        lineHeight: 1.5,
        color: "#B8B5D1",
        margin: "18px 0 0",
        maxWidth: 240,
      }}
    >
      {children}
    </p>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

interface CardDef {
  accent: Accent;
  eyebrow: string;
  body: React.ReactNode;
  footer: string;
}

function buildCards(payload: WrappedPayload): CardDef[] {
  const cards: CardDef[] = [];
  const a = ACCENTS;

  // 1 - Lessons + XP for the month.
  const deltaText =
    payload.xp.deltaPct !== null
      ? `, ${payload.xp.deltaPct >= 0 ? "+" : ""}${String(payload.xp.deltaPct)}% vs ${monthLabel(prevMonthKey(payload.periodKey), false)}`
      : "";
  cards.push({
    accent: a[0],
    eyebrow: "Ton mois en chiffres",
    body: (
      <>
        <BigStat value={String(payload.lessons.total)} unit="leçons" accent={a[0]} />
        <Lead>
          Tu as engrangé <b style={{ color: "#F5F5FA" }}>{fmtXp(payload.xp.thisMonth)} XP</b> ce
          mois{payload.xp.isBestMonth ? ", ton meilleur mois" : ""}
          {deltaText}.
        </Lead>
      </>
    ),
    footer: `${monthLabel(payload.periodKey, true)} · récap`,
  });

  // 2 - Top domain.
  const top = payload.lessons.topDomain;
  cards.push({
    accent: a[1],
    eyebrow: "Ton domaine de prédilection",
    body: (
      <>
        <BigStat value={top ? `${String(payload.lessons.topDomainPct)}%` : "-"} accent={a[1]} />
        <p
          style={{
            ...DISPLAY,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "-0.02em",
            color: a[1].main,
            margin: "10px 0 0",
          }}
        >
          {top ? DOMAIN_LABEL[top] : "À découvrir"}
        </p>
        <Lead>
          {top
            ? "C'est là que tu passes le plus de temps ce mois-ci."
            : "Termine des leçons pour révéler ton domaine de prédilection."}
        </Lead>
      </>
    ),
    footer: `${String(payload.lessons.byDomain.CYBERSEC)} cybersec · ${String(payload.lessons.byDomain.DEV)} dev · ${String(payload.lessons.byDomain.NETWORK)} réseau`,
  });

  // 3 - Badges.
  const others = Math.max(0, payload.badges.thisMonth - payload.badges.recent.length);
  cards.push({
    accent: a[2],
    eyebrow: "Tes badges du mois",
    body: (
      <>
        <BigStat value={String(payload.badges.thisMonth)} unit="badges" accent={a[2]} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          {payload.badges.recent.map((b) => (
            <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: a[2].main,
                  clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                  flexShrink: 0,
                }}
              />
              <span style={{ ...DISPLAY, fontSize: 13, color: "#F5F5FA", fontWeight: 600 }}>
                {b.name}
              </span>
              <span style={{ ...MONO, fontSize: 10, color: "#6B6890", letterSpacing: "0.08em" }}>
                {RARITY_LABEL[b.rarity] ?? b.rarity}
              </span>
            </div>
          ))}
          {payload.badges.recent.length === 0 ? (
            <span style={{ ...DISPLAY, fontSize: 13, color: "#6B6890" }}>
              Aucun badge ce mois-ci. La prochaine série t’attend.
            </span>
          ) : null}
        </div>
      </>
    ),
    footer:
      others > 0
        ? `+ ${String(others)} autres · collection ${String(payload.badges.total)}`
        : `collection ${String(payload.badges.total)}`,
  });

  // 4 - Longest streak.
  cards.push({
    accent: a[3],
    eyebrow: "Ta plus longue série",
    body: (
      <>
        <BigStat value={String(payload.streak.longest)} unit="jours" accent={a[3]} />
        <Lead>
          Ton <b style={{ color: "#F5F5FA" }}>record absolu</b> de jours d’affilée. La régularité
          paie.
        </Lead>
      </>
    ),
    footer: `${String(payload.streak.daysThisYear)} jours actifs au total cette année`,
  });

  // 5 - End-of-season rank (only when a season has closed).
  if (payload.season) {
    const s = payload.season;
    const pct = s.globalRank !== null ? topPercent(s.globalRank, s.totalMembers) : null;
    const move = s.promoted ? "Promu cette saison." : s.relegated ? "Relégué cette saison." : "";
    cards.push({
      accent: a[4],
      eyebrow: "Ton rang de fin de saison",
      body: (
        <>
          <BigStat value={s.globalRank !== null ? `#${String(s.globalRank)}` : "-"} accent={a[4]} />
          <Lead>
            {pct !== null ? (
              <>
                Top <b style={{ color: "#F5F5FA" }}>{pct}%</b> ·{" "}
              </>
            ) : null}
            division {TIER_LABEL[s.division] ?? s.division}. {move}
          </Lead>
        </>
      ),
      footer: `saison ${String(s.seasonIndex).padStart(2, "0")} · palier ${TIER_LABEL[payload.tier] ?? payload.tier}`,
    });
  }

  return cards;
}

// ── Final shareable card ──────────────────────────────────────────────────────

function MiniStat({ value, label }: { value: string; label: string }): React.JSX.Element {
  return (
    <div
      style={{ border: "1px solid #2A2560", background: "rgba(0,0,0,0.25)", padding: "14px 16px" }}
    >
      <div style={{ ...DISPLAY, fontWeight: 800, fontSize: 28, color: "#F5F5FA", lineHeight: 1 }}>
        {value}
      </div>
      <div
        style={{
          ...MONO,
          fontSize: 9.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#6B6890",
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FinalCard({
  payload,
  handle,
}: { payload: WrappedPayload; handle: string }): React.JSX.Element {
  const top = payload.lessons.topDomain;
  const season = payload.season;
  const pct =
    season?.globalRank != null ? topPercent(season.globalRank, season.totalMembers) : null;

  return (
    <div
      style={{
        position: "relative",
        width: 300,
        background:
          "radial-gradient(ellipse 100% 40% at 50% 0%, rgba(10,255,212,0.06), transparent 55%), rgba(5,4,26,0.9)",
        border: "1px solid #2A2560",
        padding: 22,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          ...MONO,
          fontSize: 10.5,
          color: "#6B6890",
          letterSpacing: "0.1em",
        }}
      >
        <span>
          <b style={{ color: "#0AFFD4", fontWeight: 600 }}>cyber</b> learn
        </span>
        <span>{monthLabel(payload.periodKey, true).toUpperCase()}</span>
      </div>

      <h2
        style={{
          ...DISPLAY,
          fontWeight: 800,
          fontSize: 30,
          letterSpacing: "-0.02em",
          color: "#F5F5FA",
          margin: "16px 0 4px",
        }}
      >
        Mon{" "}
        <span
          style={{
            background: "linear-gradient(135deg, #0024FF, #0AFFD4)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Wrapped
        </span>
      </h2>
      <span style={{ ...MONO, fontSize: 10, letterSpacing: "0.14em", color: "#6B6890" }}>
        {"// "}RÉCAP DU MOIS
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "20px 0 0" }}>
        <MiniStat value={String(payload.lessons.total)} label="leçons" />
        <MiniStat value={fmtCompact(payload.xp.thisMonth)} label="XP gagnés" />
        <MiniStat value={`${String(payload.streak.longest)}j`} label="plus longue série" />
        <MiniStat value={String(payload.badges.thisMonth)} label="badges" />
      </div>

      {top || season?.globalRank != null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {top ? (
            <div
              style={{
                border: "1px solid rgba(10,255,212,0.3)",
                background: "rgba(10,255,212,0.06)",
                padding: "12px 16px",
              }}
            >
              <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 15, color: "#F5F5FA" }}>
                {DOMAIN_LABEL[top]}
              </span>
              <div
                style={{
                  ...MONO,
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  marginTop: 4,
                }}
              >
                domaine de prédilection
              </div>
            </div>
          ) : null}
          {season?.globalRank != null ? (
            <div
              style={{
                border: "1px solid rgba(177,77,255,0.3)",
                background: "rgba(177,77,255,0.06)",
                padding: "12px 16px",
              }}
            >
              <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 15, color: "#F5F5FA" }}>
                Rang #{season.globalRank}
                {pct !== null ? <span style={{ color: "#B14DFF" }}> · Top {pct}%</span> : null}
              </span>
              <div
                style={{
                  ...MONO,
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  marginTop: 4,
                }}
              >
                division {TIER_LABEL[season.division] ?? season.division} · saison{" "}
                {String(season.seasonIndex).padStart(2, "0")}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid #2A2560",
          ...MONO,
          fontSize: 11,
          color: "#B8B5D1",
        }}
      >
        <span style={{ color: "#0AFFD4" }}>@</span>
        {handle}
        <div style={{ fontSize: 9, color: "#44406B", letterSpacing: "0.1em", marginTop: 3 }}>
          CYBERLEARN.FR/WRAPPED
        </div>
      </div>
    </div>
  );
}

// ── Export panel ──────────────────────────────────────────────────────────────

function ExportPanel(): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const copyLink = (): void => {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1800);
    });
  };

  const btn = (
    label: string,
    onClick: (() => void) | null,
    primary: boolean,
  ): React.JSX.Element => (
    <button
      type="button"
      onClick={onClick ?? undefined}
      disabled={onClick === null}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 18px",
        ...MONO,
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        cursor: onClick ? "pointer" : "not-allowed",
        border: primary ? "0" : "1px solid #2A2560",
        background: primary ? "#0AFFD4" : "rgba(5,4,26,0.5)",
        color: primary ? "#030219" : onClick ? "#B8B5D1" : "#44406B",
        fontWeight: primary ? 700 : 500,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <span
        style={{
          ...MONO,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#6B6890",
          marginBottom: 4,
        }}
      >
        Exporter
      </span>
      {btn("⤓ Télécharger l'image · bientôt", null, false)}
      {btn("⇆ Partager le lien · bientôt", null, false)}
      {btn(copied ? "✓ Lien copié" : "⧉ Copier le lien", copyLink, true)}
      <p style={{ ...MONO, fontSize: 10, color: "#44406B", letterSpacing: "0.06em", marginTop: 4 }}>
        L’export image (story 9:16) et le partage public arrivent très vite.
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  payload: WrappedPayload | null;
  handle: string;
}

export function WrappedClient({ payload, handle }: Props): React.JSX.Element {
  if (!payload) {
    return (
      <div className="page-container">
        <p style={{ ...DISPLAY, color: "#B8B5D1" }}>Ton récap n’est pas encore disponible.</p>
      </div>
    );
  }

  const cards = buildCards(payload);

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          ...MONO,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#6B6890",
          marginBottom: 14,
        }}
      >
        <span style={{ color: "#0AFFD4" }}>{"//"}</span> Cyber Learn · Récap
      </div>
      <h1
        style={{
          ...DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(36px, 5vw, 56px)",
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "#F5F5FA",
          margin: "0 0 12px",
        }}
      >
        Ton{" "}
        <span
          style={{
            background: "linear-gradient(135deg, #0024FF, #0AFFD4)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Wrapped
        </span>
      </h1>
      <p style={{ ...DISPLAY, fontSize: 15, color: "#B8B5D1", margin: "0 0 24px", maxWidth: 460 }}>
        Un bilan mensuel partageable. Parcours la séquence de cartes, puis exporte la carte finale.
      </p>

      <div
        style={{
          ...MONO,
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#6B6890",
          marginBottom: 14,
        }}
      >
        Séquence{" "}
        <span style={{ color: "#0AFFD4", border: "1px solid #2A2560", padding: "3px 8px" }}>
          ← swipe →
        </span>{" "}
        · {String(cards.length)} cartes · une couleur par stat
      </div>

      {/* Card filmstrip */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: 18,
          marginBottom: 40,
        }}
      >
        {cards.map((card, i) => (
          <CardShell
            key={card.eyebrow}
            index={i + 1}
            count={cards.length}
            accent={card.accent}
            eyebrow={card.eyebrow}
            footer={card.footer}
          >
            {card.body}
          </CardShell>
        ))}
      </div>

      {/* Final card + export */}
      <div
        style={{
          ...MONO,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#B8B5D1",
          marginBottom: 16,
        }}
      >
        <span style={{ color: "#6B6890" }}>{"// "}</span>Carte finale · à partager
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "flex-start" }}>
        <FinalCard payload={payload} handle={handle} />
        <div style={{ flex: "1 1 280px", maxWidth: 360 }}>
          <ExportPanel />
        </div>
      </div>
    </div>
  );
}
