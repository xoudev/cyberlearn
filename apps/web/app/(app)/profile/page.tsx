import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { computeLevel, computeTier } from "@cyberlearn/lib";
import { userRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { StreakPanel } from "@/components/streak-panel";
import { TierBadge } from "@/components/tier-badge";
import { ProfileContent } from "./_components/profile-content";
import type {
  SerializedBadge,
  SerializedLesson,
  SerializedCert,
} from "./_components/profile-content";

export const metadata: Metadata = { title: "Profil" };

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEX_CLIP = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "COMMON"] as const;
type Rarity = (typeof RARITY_ORDER)[number];

const RARITY_GRAD: Record<Rarity, string> = {
  LEGENDARY: "linear-gradient(135deg, #FFB547 0%, #FF4757 50%, #0024FF 100%)",
  EPIC: "linear-gradient(135deg, #0AFFD4 0%, #0024FF 100%)",
  RARE: "linear-gradient(135deg, #6E8BFF 0%, #4A3FCC 100%)",
  COMMON: "linear-gradient(135deg, #B8B5D1 0%, #6F6B99 100%)",
};

const RARITY_COLOR: Record<Rarity, string> = {
  LEGENDARY: "#FFB547",
  EPIC: "#0AFFD4",
  RARE: "#6E8BFF",
  COMMON: "#B8B5D1",
};

const RARITY_LABEL: Record<Rarity, string> = {
  LEGENDARY: "★ Légendaire",
  EPIC: "★ Épique",
  RARE: "★ Rare",
  COMMON: "★ Commun",
};

function topRarity(rarities: string[]): Rarity {
  for (const r of RARITY_ORDER) {
    if (rarities.includes(r)) return r;
  }
  return "COMMON";
}

// ── Glyph avatar (avatarUrl stored as "__glyph:{name}") ───────────────────────

const GLYPH_PATHS: Record<string, string> = {
  skull:
    "M12 4a6 6 0 0 0-6 6c0 2.1 1 4 2.6 5.2V17h6.8v-1.8A6 6 0 0 0 12 4zm-1.5 13v1.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V17h-3zM9 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0z",
  ghost:
    "M12 3a7 7 0 0 0-7 7v9l2-2 2 2 2-2 2 2 2-2 2 2v-9a7 7 0 0 0-7-7zm-2 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
  matrix:
    "M4 4h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 8h2v2H4zm8 0h2v2h-2zM4 12h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zM8 16h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2z",
  circuit:
    "M2 12h3M19 12h3M12 2v3M12 19v3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  bug: "M9 3h6l-1 3H10zm3 4a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0v-1a5 5 0 0 0-5-5zM4 10H2m20 0h-2M4 7l2 2m12-2-2 2M4 17l2-2m12 2-2-2",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  shield:
    "M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4zm0 4l5 2.5v4.5c0 3-2 5.8-5 6.75-3-.95-5-3.75-5-6.75V8.5L12 6z",
  wire: "M4 12h4l3-8 4 16 3-8h2",
};

// ── Hex avatar ────────────────────────────────────────────────────────────────

function HexAvatar({
  avatarUrl,
  displayName,
  rarity,
}: {
  avatarUrl: string | null;
  displayName: string;
  rarity: Rarity;
}) {
  const grad = RARITY_GRAD[rarity];
  const color = RARITY_COLOR[rarity];
  const label = RARITY_LABEL[rarity];

  return (
    <div
      style={{
        position: "relative",
        width: 156,
        height: 180,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        // equipped hexagon glow + profile frame, applied to the composited hex
        ...cosmeticAvatarFilter(1),
      }}
    >
      {/* Gradient ring */}
      <div style={{ position: "absolute", inset: 0, background: grad, clipPath: HEX_CLIP }} />
      {/* Inner background */}
      <div style={{ position: "absolute", inset: 3, background: "#0A0826", clipPath: HEX_CLIP }} />
      {/* Inner content area */}
      <div
        style={{
          position: "absolute",
          inset: 4,
          background: "linear-gradient(160deg, #1a1640, rgba(7,5,32,0.6))",
          clipPath: HEX_CLIP,
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        {/* Pixel grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(42,37,96,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,37,96,0.5) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
          aria-hidden="true"
        />
        {/* Avatar content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
          }}
        >
          {avatarUrl?.startsWith("__glyph:") ? (
            <svg
              width={64}
              height={64}
              viewBox="0 0 24 24"
              fill="none"
              stroke={color}
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {GLYPH_PATHS[avatarUrl.slice(8)] ? (
                <path d={GLYPH_PATHS[avatarUrl.slice(8)]} />
              ) : (
                <circle cx="12" cy="12" r="8" />
              )}
            </svg>
          ) : avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              style={{ objectFit: "cover" }}
              sizes="148px"
            />
          ) : (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 56,
                letterSpacing: "-0.04em",
                background: grad,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      {/* Rarity label */}
      <span
        style={{
          position: "absolute",
          bottom: -10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color,
          background: "#030219",
          padding: "4px 10px",
          border: `1px solid ${color}90`,
          boxShadow: `0 0 12px ${color}58`,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  const [user, certs] = await Promise.all([
    userRepository.findProfile(authUser.id),
    prisma.certificate.findMany({
      where: { userId: authUser.id, revokedAt: null },
      include: { path: { select: { title: true } } },
      orderBy: { issuedAt: "desc" },
      take: 10,
    }),
  ]);

  if (!user) notFound();

  // Resolve a stored "__upload:" marker to a short-lived signed URL before it
  // reaches the avatar component. Built-in paths, "__glyph:" markers and null
  // pass through unchanged.
  const resolvedAvatarUrl = await resolveAvatarSrc(user.avatarUrl ?? null);

  const { level, current: xpCurrent, needed: xpNeeded } = computeLevel(user.xpTotal);
  const tier = computeTier(level);
  const xpPct = xpNeeded > 0 ? Math.min((xpCurrent / xpNeeded) * 100, 100) : 100;
  const xpRemaining = xpNeeded - xpCurrent;

  const joinedStr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    user.createdAt,
  );

  // Highest rarity badge for avatar ring
  const earnedRarities = user.badges.map((ub) => ub.badge.rarity as string);
  // SAFETY: topRarity always returns one of the RARITY_ORDER values
  const avatarRarity = topRarity(earnedRarities);

  // Serialize badges (drop Date objects)
  const serializedBadges: SerializedBadge[] = user.badges.map((ub) => ({
    id: ub.badge.id,
    name: ub.badge.name,
    description: ub.badge.description,
    iconUrl: ub.badge.iconUrl,
    rarity: ub.badge.rarity,
    criterionType: ub.badge.criterionType,
    earnedDateStr: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(ub.earnedAt),
  }));

  // Serialize lesson activity
  const serializedLessons: SerializedLesson[] = user.lessonProgress.map((lp) => ({
    lessonId: lp.lessonId,
    slug: lp.lesson.slug,
    title: lp.lesson.title,
    category: lp.lesson.category,
    xpReward: lp.lesson.xpReward,
    completedDateStr: lp.completedAt
      ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(lp.completedAt)
      : null,
  }));

  // Serialize certificates
  const serializedCerts: SerializedCert[] = certs.map((cert) => ({
    id: cert.id,
    publicId: cert.publicId,
    pathTitle: cert.path.title,
    issuedDateStr: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(cert.issuedAt),
    sha256Hash: cert.sha256Hash,
  }));

  // Stats
  const completedLessonsCount = user.lessonProgress.length; // already filtered to COMPLETED in repo
  const badgesCount = user.badges.length;
  const certsCount = certs.length;
  const legendaryCount = user.badges.filter((ub) => ub.badge.rarity === "LEGENDARY").length;

  return (
    <div className="page-container">
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "#6F6B99",
          marginBottom: 28,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "#0AFFD4" }}>$</span>
        <span>~/</span>
        <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
        <span style={{ color: "#44406B" }}>/</span>
        <span>profil</span>
        <span style={{ color: "#44406B" }}>/</span>
        <span style={{ color: "#F5F5FA", fontWeight: 500 }}>
          @{user.username ?? user.displayName}
        </span>
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: "#0AFFD4",
            boxShadow: "0 0 8px #0AFFD4",
            marginLeft: 4,
            verticalAlign: "-2px",
            animation: "blink 1s step-end infinite",
          }}
          aria-hidden="true"
        />
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="catalog-header-grid"
        style={{
          marginBottom: 56,
          paddingBottom: 40,
          borderBottom: "1px solid #1F1B47",
          alignItems: "start",
        }}
      >
        {/* Left: avatar + identity */}
        <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
          <HexAvatar
            avatarUrl={resolvedAvatarUrl}
            displayName={user.displayName}
            rarity={avatarRarity}
          />

          {/* flex-basis forces the identity block onto its own row once the
              avatar leaves too little space (mobile), so the username tail and
              level never get clipped. minWidth:0 lets it shrink and wrap. */}
          <div style={{ paddingTop: 6, minWidth: 0, flex: "1 1 260px" }}>
            <h1
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: "clamp(40px, 5vw, 64px)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
                color: "#F5F5FA",
                margin: "0 0 14px",
                overflowWrap: "anywhere",
              }}
            >
              {user.username && (
                <span
                  style={{
                    color: "#0AFFD4",
                    fontWeight: 600,
                    marginRight: 4,
                    textShadow: "0 0 14px rgba(10,255,212,0.5)",
                  }}
                >
                  @
                </span>
              )}
              {user.username ?? user.displayName}
            </h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                margin: "0 0 16px",
              }}
            >
              <TierBadge tier={tier.tier} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#6F6B99",
                }}
              >
                Niveau {level}
              </span>
            </div>

            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                letterSpacing: "0.06em",
                color: "#B8B5D1",
                margin: "0 0 24px",
              }}
            >
              <b style={{ color: "#F5F5FA", fontWeight: 600 }}>{user.displayName}</b>
            </p>

            {user.bio && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "#B8B5D1",
                  maxWidth: 540,
                  margin: "0 0 18px",
                }}
              >
                {user.bio}
              </p>
            )}

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#3F3D5C",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  transform: "rotate(45deg)",
                  background: "#0AFFD4",
                  boxShadow: "0 0 6px #0AFFD4",
                  flexShrink: 0,
                }}
              />
              Membre depuis <b style={{ color: "#B8B5D1", fontWeight: 500 }}>{joinedStr}</b>
            </div>
          </div>
        </div>

        {/* Right: edit button + stat cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Corner-bracket card */}
          <div
            style={{
              position: "relative",
              padding: "24px 28px",
              background: "rgba(5,4,26,0.6)",
              border: "1px solid #1F1B47",
            }}
          >
            {/* Corner brackets */}
            <span
              style={{
                position: "absolute",
                top: -1,
                left: -1,
                width: 14,
                height: 14,
                borderTop: "2px solid #0AFFD4",
                borderLeft: "2px solid #0AFFD4",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: -1,
                right: -1,
                width: 14,
                height: 14,
                borderTop: "2px solid #0AFFD4",
                borderRight: "2px solid #0AFFD4",
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: -1,
                left: -1,
                width: 14,
                height: 14,
                borderBottom: "2px solid #0AFFD4",
                borderLeft: "2px solid #0AFFD4",
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 14,
                height: 14,
                borderBottom: "2px solid #0AFFD4",
                borderRight: "2px solid #0AFFD4",
              }}
            />

            {/* Eyebrow */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#3F3D5C",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{ width: 16, height: 1, background: "#0AFFD4", display: "inline-block" }}
              />
              Récapitulatif
              <span
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  color: "#0AFFD4",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#0AFFD4",
                    boxShadow: "0 0 6px #0AFFD4",
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                  aria-hidden="true"
                />
                LIVE
              </span>
            </div>

            {/* Big XP number */}
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 64,
                lineHeight: 0.9,
                letterSpacing: "-0.045em",
                marginBottom: 14,
                background: "linear-gradient(180deg, #F5F5FA, #0AFFD4)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {user.xpTotal.toLocaleString("fr-FR")} XP
            </div>

            {/* Meta row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingTop: 14,
                borderTop: "1px dashed #1F1B47",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#3F3D5C",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span>
                Niv. <b style={{ color: "#0AFFD4", fontWeight: 700 }}>{level}</b>
              </span>
              <span style={{ color: "#1F1B47" }}>/</span>
              <span>
                <b style={{ color: "#0AFFD4", fontWeight: 700 }}>{user.streakDays}j</b> streak
              </span>
              {legendaryCount > 0 && (
                <>
                  <span style={{ color: "#1F1B47" }}>/</span>
                  <span>
                    <b style={{ color: "#FFB547", fontWeight: 700 }}>{legendaryCount}</b> légendaire
                    {legendaryCount > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Edit profile button */}
          <Link
            href="/profile/edit"
            className="btn-ghost"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 18px",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#B8B5D1",
              background: "transparent",
              border: "1px solid #2A2560",
              textDecoration: "none",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 2 L14 5 L5 14 L2 14 L2 11 Z M9 4 L12 7" />
            </svg>
            Éditer le profil
          </Link>
        </div>
      </section>

      {/* ── XP bar ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          marginBottom: 56,
          background: "rgba(5,4,26,0.5)",
          border: "1px solid #1F1B47",
        }}
        className="profile-xp-bar"
      >
        {/* // SYS.XP label */}
        <span
          style={{
            position: "absolute",
            top: -8,
            left: 24,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#3F3D5C",
            background: "#030219",
            padding: "0 8px",
          }}
        >
          {"// SYS.XP"}
        </span>

        {/* Level number */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 96,
              lineHeight: 0.85,
              letterSpacing: "-0.05em",
              background: "linear-gradient(180deg, #F5F5FA 30%, #0AFFD4)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {level}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#3F3D5C",
              }}
            >
              Niveau actuel
            </span>
            <b
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 16,
                color: "#F5F5FA",
                letterSpacing: "-0.01em",
              }}
            >
              Niv. {level}
            </b>
          </div>
        </div>

        {/* Track */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "#3F3D5C",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 18,
                fontWeight: 700,
                color: "#F5F5FA",
                letterSpacing: "-0.01em",
                textTransform: "none",
              }}
            >
              <b style={{ color: "#0AFFD4" }}>{xpCurrent.toLocaleString("fr-FR")}</b> /{" "}
              {xpNeeded.toLocaleString("fr-FR")} XP
            </span>
            <span>→ Niv. {level + 1}</span>
            <span style={{ color: "#0AFFD4", fontWeight: 700 }}>{Math.round(xpPct)}%</span>
          </div>

          {/* Segmented bar (marginBottom reserves a row for the YOU marker,
              which now sits below the bar so it never overlaps the centered
              "Niv. N+1" label in the row above) */}
          <div
            style={{
              position: "relative",
              height: 10,
              marginBottom: 22,
              background: "#05041A",
              border: "1px solid #1F1B47",
              overflow: "visible",
            }}
          >
            {/* Hash marks */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), rgba(42,37,96,0.7) calc(10% - 1px), rgba(42,37,96,0.7) 10%)",
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
                width: `${xpPct.toFixed(1)}%`,
                background: "linear-gradient(90deg, #0024FF 0%, #0AFFD4 100%)",
                boxShadow: "0 0 14px rgba(10,255,212,0.55)",
                zIndex: 2,
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
                  background: "#0AFFD4",
                  boxShadow: "0 0 12px #0AFFD4",
                }}
                aria-hidden="true"
              />
            </div>
            {/* YOU label - placed below the bar so it never collides with the
                centered "Niv. N+1" label sitting above the track */}
            <span
              style={{
                position: "absolute",
                top: "calc(100% + 5px)",
                left: `${xpPct.toFixed(1)}%`,
                transform: "translateX(-50%)",
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: "#0AFFD4",
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
                zIndex: 3,
              }}
            >
              YOU · {xpCurrent.toLocaleString("fr-FR")}
            </span>
          </div>
        </div>

        {/* Remaining XP */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "#B8B5D1",
            textAlign: "right",
            lineHeight: 1.5,
          }}
        >
          <b
            style={{
              display: "block",
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: "-0.02em",
              color: "#0AFFD4",
              textShadow: "0 0 14px rgba(10,255,212,0.45)",
              marginBottom: 2,
            }}
          >
            {xpRemaining.toLocaleString("fr-FR")} XP
          </b>
          <span
            style={{
              textTransform: "uppercase",
              color: "#3F3D5C",
              letterSpacing: "0.12em",
            }}
          >
            avant le prochain palier
          </span>
        </div>
      </div>

      {/* ── Stats row (5 cells) ─────────────────────────────────────────────── */}
      <div
        className="profile-stats-grid"
        style={{
          border: "1px solid #1F1B47",
          background: "rgba(5,4,26,0.5)",
          marginBottom: 64,
        }}
      >
        {/* 01 · Niveau */}
        <StatCell idx="01" label="Niveau">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: "#F5F5FA",
            }}
          >
            {level}
          </span>
          <sub
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#3F3D5C",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            Niv. {level}
          </sub>
        </StatCell>

        {/* 02 · Streak */}
        <StatCell idx="02" label="Streak">
          <div style={{ position: "relative" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFB547"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                top: -2,
                right: -4,
                filter: "drop-shadow(0 0 10px rgba(255,181,71,0.55))",
              }}
              aria-hidden="true"
            >
              <path
                d="M12 3 C12 7.5 8 9 8 13.5 C8 14.8 8.7 15.5 9.6 15.5 C8.6 17 8 18.3 8 19.5 C8 22 10 24 13 24 C16.5 24 19 21.5 19 17.8 C19 13.5 14.5 12 14.5 8 C14.5 6 13.7 4.5 12 3 Z"
                fill="currentColor"
                fillOpacity="0.3"
              />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 52,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                background: "linear-gradient(180deg, #FFB547, #FF4757)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: "inline-flex",
                alignItems: "baseline",
                gap: 4,
              }}
            >
              {user.streakDays}
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#3F3D5C",
                  WebkitTextFillColor: "#3F3D5C",
                }}
              >
                j
              </span>
            </span>
          </div>
          <sub
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#3F3D5C",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            jours d&#39;affilée
          </sub>
        </StatCell>

        {/* 03 · Leçons */}
        <StatCell idx="03" label="Leçons">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: "#F5F5FA",
            }}
          >
            {completedLessonsCount}
          </span>
          <sub
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#3F3D5C",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            terminées
          </sub>
        </StatCell>

        {/* 04 · Badges */}
        <StatCell idx="04" label="Badges">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              background: "linear-gradient(180deg, #F5F5FA, #0AFFD4)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {badgesCount}
          </span>
          <sub
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#3F3D5C",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            obtenus · <b style={{ color: "#0AFFD4" }}>{legendaryCount}</b> légendaire
            {legendaryCount > 1 ? "s" : ""}
          </sub>
        </StatCell>

        {/* 05 · Certificats */}
        <StatCell idx="05" label="Certificats">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              background: "linear-gradient(180deg, #F5F5FA, #6E8BFF)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {certsCount}
          </span>
          <sub
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#3F3D5C",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            délivré{certsCount > 1 ? "s" : ""} ·{" "}
            <b style={{ color: "#0AFFD4" }}>vérifié{certsCount > 1 ? "s" : ""}</b>
          </sub>
        </StatCell>
      </div>

      {/* ── Série quotidienne ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6F6B99",
            margin: "0 0 16px",
          }}
        >
          Série quotidienne
        </h2>
        <StreakPanel userId={authUser.id} />
      </div>

      {/* ── Interactive tabs + content ──────────────────────────────────────── */}
      <ProfileContent
        badges={serializedBadges}
        lessons={serializedLessons}
        certs={serializedCerts}
      />
    </div>
  );
}

// ── Stat cell helper ───────────────────────────────────────────────────────────

function StatCell({
  idx,
  label,
  children,
}: {
  idx: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="profile-stats-cell">
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#3F3D5C",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ color: "#1F1B47" }}>{idx} ·</span>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}
