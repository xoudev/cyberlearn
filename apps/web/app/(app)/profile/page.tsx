import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { computeLevel, computeTier } from "@cyberlearn/lib";
import { classRepository, userRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { StreakCard } from "@/components/streak-card";
import { TierBadge } from "@/components/tier-badge";
import { ProfileContent } from "./_components/profile-content";
import { Crumb } from "@/components/crumb";
import { StatTile } from "@/components/stat-tile";
import { AvatarView } from "@/components/avatar-view";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";
import { XpProgress } from "@/components/xp-progress";
import {
  BADGE_RARITY_GRADIENT,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_VAR,
  rarestOf,
  type BadgeRarity,
} from "@cyberlearn/ui";
import type { SerializedLesson, SerializedCert } from "./_components/profile-content";
import type { SerializedBadge } from "@/lib/badges/collection";

export const metadata: Metadata = { title: "Profil" };

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEX_CLIP = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

// ── Hex avatar ────────────────────────────────────────────────────────────────

function HexAvatar({
  avatarUrl,
  displayName,
  rarity,
}: {
  avatarUrl: string | null;
  displayName: string;
  rarity: BadgeRarity;
}) {
  const grad = BADGE_RARITY_GRADIENT[rarity];
  const color = BADGE_RARITY_VAR[rarity];
  const label = `★ ${BADGE_RARITY_LABELS[rarity]}`;
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
      <div
        style={{
          position: "absolute",
          inset: 3,
          background: "var(--color-bg-elevated)",
          clipPath: HEX_CLIP,
        }}
      />
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
          <AvatarView
            src={avatarUrl}
            name={displayName}
            className="profile-avatar"
            glyphSize={64}
            glyphColor={color}
            style={{ backgroundImage: grad }}
          />
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
          background: "var(--color-bg-base)",
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

  const [user, certs, classes] = await Promise.all([
    userRepository.findProfile(authUser.id),
    prisma.certificate.findMany({
      where: { userId: authUser.id, revokedAt: null },
      include: { path: { select: { title: true } } },
      orderBy: { issuedAt: "desc" },
      take: 10,
    }),
    classRepository.findForMember(authUser.id),
  ]);

  if (!user) notFound();

  // Resolve a stored "__upload:" marker to a short-lived signed URL before it
  // reaches the avatar component. Built-in paths, "__glyph:" markers and null
  // pass through unchanged.
  const resolvedAvatarUrl = await resolveAvatarSrc(user.avatarUrl ?? null);

  // Most recently joined first, so the one shown is the current one.
  const primaryClass = classes[0];

  const { level, current: xpCurrent, needed: xpNeeded } = computeLevel(user.xpTotal);
  const tier = computeTier(level);
  const xpRemaining = xpNeeded - xpCurrent;

  const joinedStr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    user.createdAt,
  );

  // Highest rarity badge for avatar ring
  const earnedRarities = user.badges.map((ub) => ub.badge.rarity as string);
  const avatarRarity = rarestOf(earnedRarities);

  // Serialize badges (drop Date objects)
  const serializedBadges: SerializedBadge[] = user.badges.map((ub) => ({
    id: ub.badge.id,
    refCode: ub.badge.refCode,
    earned: true,
    progress: null,
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
      <Crumb segments={["profil", `@${user.username ?? user.displayName}`]} />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="catalog-header-grid"
        style={{
          marginBottom: 56,
          paddingBottom: 40,
          borderBottom: "1px solid var(--color-border-subtle)",
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
                color: "var(--color-text-primary)",
                margin: "0 0 14px",
                overflowWrap: "anywhere",
              }}
            >
              {user.username && (
                <span
                  style={{
                    color: "var(--cosmetic-accent)",
                    fontWeight: 600,
                    marginRight: 4,
                    textShadow:
                      "0 0 14px color-mix(in srgb, var(--cosmetic-accent) 50%, transparent)",
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
                className="mono-label"
                style={{
                  color: "var(--color-text-muted)",
                }}
              >
                Niveau {level}
              </span>

              {/* The class belongs beside the level, not in a panel further
                  down: which class someone is in is part of who they are here,
                  read in the same glance as their rank. The roster lives on
                  /my-class, which this links to - a line of identity rather
                  than a block of content. */}
              {primaryClass && (
                <Link
                  className="mono-label"
                  href="/my-class"
                  style={{
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      width: 1,
                      height: 11,
                      background: "var(--color-border-default)",
                      display: "inline-block",
                    }}
                  />
                  Classe{" "}
                  <b style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>
                    {primaryClass.name}
                  </b>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {primaryClass.promotion.establishment.name} · {primaryClass.promotion.name}
                  </span>
                  {classes.length > 1 && (
                    <span style={{ color: "var(--color-text-muted)" }}>+{classes.length - 1}</span>
                  )}
                </Link>
              )}
            </div>

            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                letterSpacing: "0.06em",
                color: "var(--color-text-secondary)",
                margin: "0 0 24px",
              }}
            >
              <b style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                {user.displayName}
              </b>
            </p>

            {user.bio && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--color-text-secondary)",
                  maxWidth: 540,
                  margin: "0 0 18px",
                }}
              >
                {user.bio}
              </p>
            )}

            <div
              className="mono-label"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--color-text-muted)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  transform: "rotate(45deg)",
                  background: "var(--cosmetic-accent)",
                  boxShadow: "0 0 6px var(--cosmetic-accent)",
                  flexShrink: 0,
                }}
              />
              Membre depuis{" "}
              <b style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{joinedStr}</b>
            </div>
          </div>
        </div>

        {/* Right: edit button + stat cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Corner-bracket card */}
          <div
            className="card card--sunken"
            style={{
              position: "relative",
              padding: "24px 28px",
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
                borderTop: "2px solid var(--cosmetic-accent)",
                borderLeft: "2px solid var(--cosmetic-accent)",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: -1,
                right: -1,
                width: 14,
                height: 14,
                borderTop: "2px solid var(--cosmetic-accent)",
                borderRight: "2px solid var(--cosmetic-accent)",
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: -1,
                left: -1,
                width: 14,
                height: 14,
                borderBottom: "2px solid var(--cosmetic-accent)",
                borderLeft: "2px solid var(--cosmetic-accent)",
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 14,
                height: 14,
                borderBottom: "2px solid var(--cosmetic-accent)",
                borderRight: "2px solid var(--cosmetic-accent)",
              }}
            />

            {/* Eyebrow */}
            <div
              className="mono-label"
              style={{
                color: "var(--color-text-muted)",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 1,
                  background: "var(--cosmetic-accent)",
                  display: "inline-block",
                }}
              />
              Récapitulatif
              <span
                className="mono-label"
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  color: "var(--cosmetic-accent)",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--cosmetic-accent)",
                    boxShadow: "0 0 6px var(--cosmetic-accent)",
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
                background:
                  "linear-gradient(180deg, var(--color-text-primary), var(--cosmetic-accent))",
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
              className="mono-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingTop: 14,
                borderTop: "1px dashed var(--color-border-subtle)",
                color: "var(--color-text-muted)",
              }}
            >
              <span>
                Niv. <b style={{ color: "var(--cosmetic-accent)", fontWeight: 700 }}>{level}</b>
              </span>
              <span style={{ color: "var(--color-border-subtle)" }}>/</span>
              <span>
                <b style={{ color: "var(--cosmetic-accent)", fontWeight: 700 }}>
                  {user.streakDays}j
                </b>{" "}
                de série
              </span>
              {legendaryCount > 0 && (
                <>
                  <span style={{ color: "var(--color-border-subtle)" }}>/</span>
                  <span>
                    <b style={{ color: "var(--color-rarity-legendary)", fontWeight: 700 }}>
                      {legendaryCount}
                    </b>{" "}
                    légendaire
                    {legendaryCount > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Edit profile button */}
          <Link href="/profile/edit" className="btn btn--ghost">
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
          border: "1px solid var(--color-border-subtle)",
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
            color: "var(--color-text-muted)",
            background: "var(--color-bg-base)",
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
              background:
                "linear-gradient(180deg, var(--color-text-primary) 30%, var(--cosmetic-accent))",
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
              className="mono-label"
              style={{
                color: "var(--color-text-muted)",
              }}
            >
              Niveau actuel
            </span>
            <b
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {levelLabel(level)}
            </b>
          </div>
        </div>

        <XpProgress current={xpCurrent} needed={xpNeeded} level={level} />

        {/* Remaining XP */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "var(--color-text-secondary)",
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
              color: "var(--cosmetic-accent)",
              textShadow: "0 0 14px color-mix(in srgb, var(--cosmetic-accent) 45%, transparent)",
              marginBottom: 2,
            }}
          >
            {xpRemaining.toLocaleString("fr-FR")} XP
          </b>
          <span
            style={{
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              letterSpacing: "0.12em",
            }}
          >
            avant le prochain palier
          </span>
        </div>
      </div>

      {/* ── Stats row (5 cells) ─────────────────────────────────────────────── */}
      <div
        className="profile-stats-grid card card--sunken"
        style={{
          marginBottom: 64,
        }}
      >
        {/* 01 · Niveau */}
        <StatTile size="lg" className="profile-stats-cell" idx="01" label="Niveau">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: "var(--color-text-primary)",
            }}
          >
            {level}
          </span>
          <sub
            className="mono-label"
            style={{
              color: "var(--color-text-muted)",
              marginTop: 10,
            }}
          >
            {levelLabel(level)}
          </sub>
        </StatTile>

        {/* 02 · Streak */}
        <StatTile size="lg" className="profile-stats-cell" idx="02" label="Série">
          <div style={{ position: "relative" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-rarity-legendary)"
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
                background:
                  "linear-gradient(180deg, var(--color-rarity-legendary), var(--color-category-cybersec))",
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
                  color: "var(--color-text-muted)",
                  WebkitTextFillColor: "var(--color-text-disabled)",
                }}
              >
                j
              </span>
            </span>
          </div>
          <sub
            className="mono-label"
            style={{
              color: "var(--color-text-muted)",
              marginTop: 10,
            }}
          >
            jours d&#39;affilée
          </sub>
        </StatTile>

        {/* 03 · Leçons */}
        <StatTile size="lg" className="profile-stats-cell" idx="03" label="Leçons">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: "var(--color-text-primary)",
            }}
          >
            {completedLessonsCount}
          </span>
          <sub
            className="mono-label"
            style={{
              color: "var(--color-text-muted)",
              marginTop: 10,
            }}
          >
            terminées
          </sub>
        </StatTile>

        {/* 04 · Badges */}
        <StatTile size="lg" className="profile-stats-cell" idx="04" label="Badges">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              background:
                "linear-gradient(180deg, var(--color-text-primary), var(--cosmetic-accent))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {badgesCount}
          </span>
          <sub
            className="mono-label"
            style={{
              color: "var(--color-text-muted)",
              marginTop: 10,
            }}
          >
            obtenus · <b style={{ color: "var(--cosmetic-accent)" }}>{legendaryCount}</b> légendaire
            {legendaryCount > 1 ? "s" : ""}
          </sub>
        </StatTile>

        {/* 05 · Certificats */}
        <StatTile size="lg" className="profile-stats-cell" idx="05" label="Certificats">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              background:
                "linear-gradient(180deg, var(--color-text-primary), var(--color-rarity-rare))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {certsCount}
          </span>
          <sub
            className="mono-label"
            style={{
              color: "var(--color-text-muted)",
              marginTop: 10,
            }}
          >
            délivré{certsCount > 1 ? "s" : ""} ·{" "}
            <b style={{ color: "var(--cosmetic-accent)" }}>vérifié{certsCount > 1 ? "s" : ""}</b>
          </sub>
        </StatTile>
      </div>

      {/* ── Série quotidienne ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <h2
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
            margin: "0 0 16px",
          }}
        >
          Série quotidienne
        </h2>
        <StreakCard userId={authUser.id} year />
      </div>

      {/* ── Ma classe ───────────────────────────────────────────────────────
          Renders nothing for a learner who belongs to no class, which is most
          of them - an empty heading would read as something missing. */}

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
