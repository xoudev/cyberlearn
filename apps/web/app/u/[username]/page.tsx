import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { friendshipRepository, userRepository } from "@cyberlearn/db";
import { computeLevel, friendshipView } from "@cyberlearn/lib";
import { BadgeMedallion, toBadgeRarity } from "@cyberlearn/ui";
import type { Category } from "@cyberlearn/db";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { getRequestUser } from "@/lib/auth";
import { AddFriendButton } from "@/components/add-friend-button";

// ── Design tokens ─────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };
const SANS: React.CSSProperties = { fontFamily: "var(--font-sans, sans-serif)" };

const CAT_META: Partial<Record<Category, { color: string; label: string }>> = {
  CYBERSEC: { color: "#FF4757", label: "Cybersec" },
  DEV: { color: "#6E8BFF", label: "Développement" },
  NETWORK: { color: "#0AFFD4", label: "Réseaux" },
};
const CAT_DEFAULT = { color: "#7F7BA9", label: "-" };

/** Regular pointy-top hexagon; same canonical geometry as the badge medallion. */
const HEX_CLIP = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

// Scoped responsive rules (inline styles can't express media queries).
const RESPONSIVE_CSS = `
.pub-stats { display: grid; grid-template-columns: repeat(3, 1fr); }
.pub-hero { display: flex; align-items: center; gap: 32px; flex-wrap: wrap; }
.pub-row:hover { background: rgba(255,255,255,0.02) !important; }
@media (max-width: 760px) {
  .pub-stats { grid-template-columns: 1fr; }
  .pub-stats > div { border-right: none !important; border-bottom: 1px solid #2a2560; }
  .pub-stats > div:last-child { border-bottom: none; }
  .pub-level { width: 100%; }
}
`;

// ── Metadata ──────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function CornerBrackets({ color }: { color: string }): React.ReactElement {
  return (
    <>
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            [pos.startsWith("t") ? "top" : "bottom"]: -1,
            [pos.endsWith("l") ? "left" : "right"]: -1,
            borderColor: color,
            borderStyle: "solid",
            borderWidth: 0,
            opacity: 0.8,
            pointerEvents: "none",
            ...(pos === "tl"
              ? { borderTopWidth: 2, borderLeftWidth: 2 }
              : pos === "tr"
                ? { borderTopWidth: 2, borderRightWidth: 2 }
                : pos === "bl"
                  ? { borderBottomWidth: 2, borderLeftWidth: 2 }
                  : { borderBottomWidth: 2, borderRightWidth: 2 }),
          }}
        />
      ))}
    </>
  );
}

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }): React.ReactElement {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          ...MONO,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#7F7BA9",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span style={{ width: 24, height: 1, background: "#3D3785", display: "inline-block" }} />
        {eyebrow}
      </div>
      <h2
        style={{
          ...SANS,
          fontWeight: 700,
          fontSize: "clamp(22px, 3vw, 30px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "#F5F5FA",
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublicProfilePage({ params }: Props): Promise<React.ReactElement> {
  const { username } = await params;

  // Signed out is an ordinary way to read a public profile, so the viewer is
  // optional here - getRequestUser rather than requireRequestUser - and the
  // friend button simply does not appear. It is read before the profile
  // because it also decides whether a private one opens at all: a friend gets
  // in, everybody else gets the same 404 as a name that does not exist.
  const viewer = await getRequestUser();
  const viewerId = viewer?.id ?? null;

  const user = await userRepository.findPublicProfile(username, viewerId);
  if (!user) notFound();

  // Reaching a private page means being let in, so the page says so. Telling
  // the reader "profil public" about a page its owner closed would be the one
  // wrong thing to write here.
  const isPrivate = user.preferences?.publicProfile === false;
  const friendState =
    viewerId === null || viewerId === user.id
      ? "none"
      : friendshipView(await friendshipRepository.between(viewerId, user.id), viewerId);

  // Resolve "__upload:" markers to short-lived signed URLs before rendering;
  // built-in paths, "__glyph:" markers and null pass through unchanged.
  const avatarSrc = await resolveAvatarSrc(user.avatarUrl);

  const { level, current, needed } = computeLevel(user.xpTotal);
  const xpPercent = needed > 0 ? Math.min((current / needed) * 100, 100) : 0;
  const joinedStr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    user.createdAt,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(rgba(42,37,96,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(42,37,96,0.14) 1px, transparent 1px), #030219",
        backgroundSize: "44px 44px, 44px 44px, auto",
        padding: "48px 24px 100px",
      }}
    >
      <style>{RESPONSIVE_CSS}</style>
      <div style={{ width: "100%", maxWidth: 1140, margin: "0 auto" }}>
        {/* ── Top bar: back link + eyebrow ─────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 36,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              ...MONO,
              fontSize: 11,
              color: "#7F7BA9",
              letterSpacing: "0.08em",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            ← cyberlearn
          </Link>
          <span
            style={{
              ...MONO,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#44406B",
            }}
          >
            {"// "}
            {isPrivate ? "profil privé · visible par ses amis" : "profil public"} ·{" "}
            <b style={{ color: "#0AFFD4", fontWeight: 500 }}>@{user.username}</b>
          </span>
        </div>

        {/* ── Hero: player card ────────────────────────────────────────── */}
        <article
          style={{
            position: "relative",
            padding: "36px 36px 34px",
            background:
              "radial-gradient(ellipse 60% 90% at 18% 0%, rgba(0,36,255,0.12), transparent 60%), rgba(10,8,38,0.6)",
            border: "1px solid #2A2560",
            marginBottom: 22,
            overflow: "hidden",
          }}
        >
          <CornerBrackets color="#0AFFD4" />
          {/* Top strip */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, #0AFFD4, transparent)",
              boxShadow: "0 0 12px rgba(10,255,212,0.5)",
            }}
          />

          <div className="pub-hero">
            {/* Hexagonal avatar */}
            <div
              style={{
                position: "relative",
                width: 96,
                height: 110,
                flexShrink: 0,
                filter: "drop-shadow(0 0 14px rgba(10,255,212,0.25))",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(145deg, #0024FF, #0AFFD4)",
                  clipPath: HEX_CLIP,
                }}
                aria-hidden="true"
              />
              <div
                style={{
                  position: "absolute",
                  inset: 3,
                  background: "#0A0826",
                  clipPath: HEX_CLIP,
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {avatarSrc && !avatarSrc.startsWith("__glyph:") ? (
                  <Image
                    src={avatarSrc}
                    alt={user.displayName}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="96px"
                  />
                ) : (
                  <span
                    style={{
                      ...SANS,
                      fontWeight: 800,
                      fontSize: 38,
                      letterSpacing: "-0.03em",
                      background: "linear-gradient(135deg, #0024FF, #0AFFD4)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <div
                style={{
                  ...MONO,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#7F7BA9",
                  marginBottom: 12,
                }}
              >
                <span style={{ color: "#44406B" }}>{"// "}</span>
                OPÉRATEUR · MEMBRE DEPUIS{" "}
                <b style={{ color: "#B8B5D1", fontWeight: 500 }}>{joinedStr}</b>
              </div>
              <h1
                style={{
                  ...SANS,
                  fontWeight: 800,
                  fontSize: "clamp(34px, 4.6vw, 58px)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.035em",
                  margin: "0 0 10px",
                  color: "#F5F5FA",
                }}
              >
                <em
                  style={{
                    fontStyle: "normal",
                    background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {user.displayName}
                </em>
                .
              </h1>
              <p
                style={{
                  ...MONO,
                  fontSize: 12,
                  color: "#7F7BA9",
                  letterSpacing: "0.04em",
                  margin: user.bio ? "0 0 12px" : 0,
                }}
              >
                @{user.username}
              </p>
              {user.bio && (
                <p
                  style={{
                    fontFamily: "var(--font-body, sans-serif)",
                    fontSize: 14,
                    color: "#B8B5D1",
                    margin: 0,
                    lineHeight: 1.55,
                    maxWidth: 480,
                  }}
                >
                  {user.bio}
                </p>
              )}

              {/* The one thing a visitor can do on somebody else's page.
                  Absent when signed out, and absent on your own profile - a
                  button that cannot work is worse than no button. */}
              {viewerId !== null && viewerId !== user.id && (
                <div
                  className="pub-friend-action"
                  style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}
                >
                  <AddFriendButton targetId={user.id} initialState={friendState} />
                </div>
              )}
            </div>

            {/* Level block */}
            <div
              className="pub-level"
              style={{
                position: "relative",
                padding: "20px 26px 18px",
                background:
                  "linear-gradient(135deg, rgba(0,36,255,0.12) 0%, rgba(10,255,212,0.06) 100%), rgba(5,4,26,0.7)",
                border: "1px solid rgba(10,255,212,0.25)",
                minWidth: 250,
              }}
            >
              <div
                style={{
                  ...MONO,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#0AFFD4",
                  marginBottom: 8,
                }}
              >
                <b style={{ fontWeight: 700 }}>&gt;</b> Niveau actuel
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <span
                  style={{
                    ...SANS,
                    fontWeight: 800,
                    fontSize: 56,
                    lineHeight: 0.9,
                    letterSpacing: "-0.05em",
                    background: "linear-gradient(180deg, #F5F5FA 0%, #6E8BFF 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {level}
                </span>
                <span
                  style={{
                    ...MONO,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#7F7BA9",
                  }}
                >
                  → LVL {level + 1}
                </span>
              </div>
              {/* XP bar (derived from public xpTotal) */}
              <div
                style={{
                  height: 8,
                  background: "rgba(5,4,26,0.9)",
                  border: "1px solid #2A2560",
                  overflow: "hidden",
                  marginBottom: 8,
                }}
                role="progressbar"
                aria-valuenow={Math.round(xpPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${xpPercent.toFixed(1)}%`,
                    background: "linear-gradient(90deg, #0024FF 0%, #0AFFD4 100%)",
                    boxShadow: "0 0 14px rgba(10,255,212,0.6)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  ...MONO,
                  fontSize: 10,
                  color: "#7F7BA9",
                  letterSpacing: "0.06em",
                }}
              >
                <span>
                  <b style={{ color: "#F5F5FA", fontWeight: 600 }}>
                    {current.toLocaleString("fr-FR")}
                  </b>{" "}
                  / {needed.toLocaleString("fr-FR")} XP
                </span>
                <span>{Math.round(xpPercent)}%</span>
              </div>
            </div>
          </div>
        </article>

        {/* ── Stats strip ──────────────────────────────────────────────── */}
        <div
          className="pub-stats"
          style={{
            border: "1px solid #2A2560",
            background: "rgba(5,4,26,0.5)",
            marginBottom: 56,
          }}
        >
          {[
            {
              label: "XP total",
              value: `+${user.xpTotal.toLocaleString("fr-FR")}`,
              color: "#0AFFD4",
              sub: "expérience cumulée",
            },
            {
              label: "Streak actuel",
              value: `${String(user.streakDays)}j`,
              color: user.streakDays > 0 ? "#FFB547" : "#7F7BA9",
              sub: user.streakDays > 0 ? "🔥 en cours" : "à relancer",
            },
            {
              label: "Badges obtenus",
              value: String(user.badges.length),
              color: "#F5F5FA",
              sub: "trophées gagnés",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                padding: "26px 28px 22px",
                borderRight: i < 2 ? "1px solid #2A2560" : "none",
              }}
            >
              <div
                style={{
                  ...MONO,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#7F7BA9",
                  marginBottom: 14,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  ...SANS,
                  fontWeight: 800,
                  fontSize: 38,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: stat.color,
                  marginBottom: 10,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  ...MONO,
                  fontSize: 10.5,
                  color: "#44406B",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── Badges (earned-only, public showcase) ────────────────────── */}
        {user.badges.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <SectionLabel
              eyebrow={`01 · trophées · ${String(user.badges.length)}`}
              title="Badges obtenus."
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: "26px 14px",
              }}
            >
              {user.badges.map((ub) => (
                <div
                  key={ub.id}
                  title={ub.badge.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "center",
                  }}
                >
                  <BadgeMedallion
                    rarity={toBadgeRarity(ub.badge.rarity)}
                    size="md"
                    iconUrl={ub.badge.iconUrl}
                    name={ub.badge.name}
                  />
                  <span
                    style={{
                      ...MONO,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#7F7BA9",
                      maxWidth: 120,
                    }}
                  >
                    {ub.badge.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Recent lessons ───────────────────────────────────────────── */}
        {user.lessonProgress.length > 0 && (
          <section>
            <SectionLabel eyebrow="02 · activité" title="Leçons terminées récemment." />
            <div style={{ border: "1px solid #2A2560", background: "rgba(10,8,38,0.4)" }}>
              {user.lessonProgress.map((lp, i) => {
                const cat = CAT_META[lp.lesson.category] ?? CAT_DEFAULT;
                const dateStr = lp.completedAt
                  ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                      lp.completedAt,
                    )
                  : "-";

                return (
                  <div
                    key={`${lp.lesson.slug}-${String(i)}`}
                    className="pub-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "14px 20px",
                      borderBottom:
                        i < user.lessonProgress.length - 1 ? "1px solid #1F1B47" : "none",
                      transition: "background 150ms ease",
                    }}
                  >
                    <span
                      style={{
                        ...SANS,
                        fontWeight: 800,
                        fontSize: 22,
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                        color: "#44406B",
                        fontVariantNumeric: "tabular-nums",
                        width: 34,
                        flexShrink: 0,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          ...MONO,
                          fontSize: 9.5,
                          fontWeight: 600,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: cat.color,
                          marginBottom: 3,
                        }}
                      >
                        {cat.label}
                      </div>
                      <p
                        style={{
                          ...SANS,
                          fontWeight: 600,
                          fontSize: 15,
                          color: "#F5F5FA",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lp.lesson.title}
                      </p>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        ...MONO,
                        fontSize: 10.5,
                        color: "#7F7BA9",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 5,
                          height: 5,
                          background: "#0AFFD4",
                          transform: "rotate(45deg)",
                          boxShadow: "0 0 6px rgba(10,255,212,0.6)",
                        }}
                      />
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
