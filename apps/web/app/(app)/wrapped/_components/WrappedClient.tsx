"use client";

import React, { useState } from "react";
import type { WrappedPayload } from "@cyberlearn/lib";

// ── Style language (shared dark / neon idiom, one accent per card) ────────────

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-sans)" };

const DOMAIN_LABEL: Record<string, string> = {
  DEV: "Dev",
  CYBERSEC: "Cybersec",
  NETWORK: "Réseau",
};
const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  ARGENT: "Argent",
  OR: "Or",
  PLATINE: "Platine",
  DIAMANT: "Diamant",
  ELITE: "Élite",
};

function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`;
  return String(n);
}

function topPercent(rank: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(1, Math.round((rank / total) * 100));
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
          "radial-gradient(ellipse 100% 40% at 50% 0%, color-mix(in srgb, var(--cosmetic-accent) 6%, transparent), transparent 55%), rgba(5,4,26,0.9)",
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
          <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>cyber</b> learn
        </span>
        <span>{payload.periodKey}</span>
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
            background: "linear-gradient(135deg, #0024FF, var(--cosmetic-accent))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Wrapped
        </span>
      </h2>
      <span style={{ ...MONO, fontSize: 10, letterSpacing: "0.14em", color: "#6B6890" }}>
        {"// "}RÉCAP DE L’ANNÉE
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "20px 0 0" }}>
        <MiniStat value={String(payload.lessons.total)} label="leçons" />
        <MiniStat value={fmtCompact(payload.xp.thisYear)} label="XP gagnés" />
        <MiniStat value={`${String(payload.streak.longest)}j`} label="plus longue série" />
        <MiniStat value={String(payload.badges.thisYear)} label="badges" />
      </div>

      {top || season?.globalRank != null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {top ? (
            <div
              style={{
                border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 30%, transparent)",
                background: "color-mix(in srgb, var(--cosmetic-accent) 6%, transparent)",
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
        <span style={{ color: "var(--cosmetic-accent)" }}>@</span>
        {handle}
        <div style={{ fontSize: 9, color: "#44406B", letterSpacing: "0.1em", marginTop: 3 }}>
          CYBERLEARN.FR/WRAPPED
        </div>
      </div>
    </div>
  );
}

// ── Export panel ──────────────────────────────────────────────────────────────

/**
 * Drawing the shareable card, at story size.
 *
 * Canvas rather than a screenshot library: the card is a dozen strings and a
 * few rules, drawing them costs nothing and adds no dependency, and the output
 * is 1080x1920 regardless of the screen it was exported from - which is the
 * whole point of a story image. A DOM screenshot would have inherited whatever
 * width the reader happened to have.
 *
 * Fonts are named rather than loaded: the page's own faces are already in the
 * document by the time anyone reaches this button, and a canvas draws with what
 * the document has. The fallbacks keep it legible if they are not.
 */
function drawStoryCard(payload: WrappedPayload, handle: string): HTMLCanvasElement {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue("--cosmetic-accent")
    .trim();
  const ACCENT = accent === "" ? "#0AFFD4" : accent;
  const MONO_F = "'JetBrains Mono', ui-monospace, monospace";
  const SANS_F = "'Plus Jakarta Sans', system-ui, sans-serif";

  ctx.fillStyle = "#030219";
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 420, 0, W / 2, 420, 900);
  glow.addColorStop(0, "rgba(10,255,212,0.10)");
  glow.addColorStop(1, "rgba(3,2,25,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  ctx.fillStyle = ACCENT;
  ctx.font = `700 34px ${MONO_F}`;
  ctx.fillText("CYBERLEARN WRAPPED", W / 2, 190);

  ctx.fillStyle = "#F5F5FA";
  ctx.font = `800 210px ${SANS_F}`;
  ctx.fillText(payload.periodKey, W / 2, 400);

  ctx.fillStyle = "#6B6890";
  ctx.font = `28px ${MONO_F}`;
  ctx.fillText(`@${handle}`, W / 2, 470);

  // Four figures, two per row. Numbers first and labels under them, because the
  // number is what somebody screenshots this for.
  const stats: [string, string][] = [
    [fmtCompact(payload.xp.thisYear), "XP gagnés"],
    [String(payload.lessons.total), "leçons"],
    [String(payload.badges.thisYear), "badges"],
    [String(payload.streak.longest), "jours de série"],
  ];
  stats.forEach(([value, label], i) => {
    const x = i % 2 === 0 ? W / 4 : (W / 4) * 3;
    const y = 760 + Math.floor(i / 2) * 320;
    ctx.fillStyle = ACCENT;
    ctx.font = `800 120px ${SANS_F}`;
    ctx.fillText(value, x, y);
    ctx.fillStyle = "#6B6890";
    ctx.font = `30px ${MONO_F}`;
    ctx.fillText(label, x, y + 60);
  });

  const topDomain = payload.lessons.topDomain;
  if (topDomain !== null) {
    // DOMAIN_LABEL is keyed by string, so the lookup is optional as far as the
    // compiler knows; the code itself is the honest fallback.
    const domainLabel = DOMAIN_LABEL[topDomain] ?? topDomain;
    ctx.fillStyle = "#B8B5D1";
    ctx.font = `36px ${SANS_F}`;
    ctx.fillText(`Domaine de l'année : ${domainLabel}`, W / 2, 1300);
  }

  // Everything stays above ~1550: the bottom of a story is where the app's own
  // controls sit, and a wordmark under them is a wordmark nobody sees.
  ctx.strokeStyle = "#1F1B47";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, 1440);
  ctx.lineTo(W - 140, 1440);
  ctx.stroke();

  ctx.fillStyle = "#44406B";
  ctx.font = `28px ${MONO_F}`;
  ctx.fillText("cyberlearn.fr", W / 2, 1520);

  return canvas;
}

function ExportPanel({
  payload,
  handle,
}: {
  payload: WrappedPayload;
  handle: string;
}): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const copyLink = (): void => {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1800);
    });
  };

  const toBlob = async (): Promise<Blob | null> =>
    new Promise((resolve) => {
      drawStoryCard(payload, handle).toBlob((b) => {
        resolve(b);
      }, "image/png");
    });

  const download = (): void => {
    setFailed(null);
    setBusy(true);
    void toBlob()
      .then((blob) => {
        if (!blob) {
          setFailed("L'image n'a pas pu être générée.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cyberlearn-wrapped-${payload.periodKey}.png`;
        a.click();
        // Revoked on the next tick: revoking synchronously can beat the click
        // in some browsers and download an empty file.
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 0);
      })
      .finally(() => {
        setBusy(false);
      });
  };

  /**
   * The share sheet, where the browser has one.
   *
   * navigator.share with files is missing on most desktops, so the button only
   * appears when it is actually available rather than being shown and failing -
   * a share button that errors is worse than no share button.
   */
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([], "x.png", { type: "image/png" })] });

  const share = (): void => {
    setFailed(null);
    setBusy(true);
    void toBlob()
      .then(async (blob) => {
        if (!blob) {
          setFailed("L'image n'a pas pu être générée.");
          return;
        }
        const file = new File([blob], `cyberlearn-wrapped-${payload.periodKey}.png`, {
          type: "image/png",
        });
        try {
          await navigator.share({ files: [file], title: "Mon CyberLearn Wrapped" });
        } catch {
          // A cancelled share sheet throws too; nothing to report either way.
        }
      })
      .finally(() => {
        setBusy(false);
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
        background: primary ? "var(--cosmetic-accent)" : "rgba(5,4,26,0.5)",
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
      {btn(busy ? "⤓ Génération…" : "⤓ Télécharger l'image", busy ? null : download, true)}
      {canShare && btn("⇆ Partager l'image", busy ? null : share, false)}
      {btn(copied ? "✓ Lien copié" : "⧉ Copier le lien", copyLink, false)}
      {failed !== null ? (
        <p style={{ ...MONO, fontSize: 10.5, color: "#FF4D6D", marginTop: 4 }}>{failed}</p>
      ) : (
        <p
          style={{ ...MONO, fontSize: 10, color: "#44406B", letterSpacing: "0.06em", marginTop: 4 }}
        >
          Story 1080×1920, prête à poster.
        </p>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  payload: WrappedPayload | null;
  handle: string;
}

/**
 * Everything below the title: the filmstrip, the shareable card and the export.
 *
 * Split out when the recap stopped being a page you navigate to and became a
 * pop-up you open from the navbar. Both surfaces show the same recap; what
 * differs is the chrome around it, so the chrome is what each one supplies.
 */
/**
 * The card somebody actually posts, and the two buttons that get it out.
 *
 * This is all that is left of the page the recap used to be: the filmstrip and
 * its heading became the story, which shows one figure at a time. The card did
 * not - it was already the payoff, and a payoff is the one thing a story ends
 * on rather than scrolls past. So it is the last slide.
 */
export function WrappedShare({ payload, handle }: Props): React.JSX.Element {
  if (!payload) {
    return <p style={{ ...DISPLAY, color: "#B8B5D1" }}>Ton récap n’est pas encore disponible.</p>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "flex-start" }}>
      <FinalCard payload={payload} handle={handle} />
      <div style={{ flex: "1 1 220px", minWidth: 200 }}>
        <ExportPanel payload={payload} handle={handle} />
      </div>
    </div>
  );
}
