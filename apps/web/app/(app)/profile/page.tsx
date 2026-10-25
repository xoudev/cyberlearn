import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { computeLevel, computeTier } from "@cyberlearn/lib";
import { classRepository, userRepository, prisma } from "@cyberlearn/db";
import { BADGE_RARITY_LABELS, BADGE_RARITY_VAR, rarestOf } from "@cyberlearn/ui";
import { publicProfileUrl } from "@cyberlearn/lib/social/portfolio";
import { requireRequestUser } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { AvatarView } from "@/components/avatar-view";
import { CopyButton } from "@/components/copy-button";
import { StreakCard } from "@/components/streak-card";
import { TierBadge } from "@/components/tier-badge";
import { ProfileProgress } from "@/components/profile-progress";
import type { SerializedBadge } from "@/lib/badges/collection";
import {
  ProfileContent,
  type SerializedLesson,
  type SerializedCert,
} from "./_components/profile-content";
import "../../../components/profile-workspace.css";

export const metadata: Metadata = { title: "Profil" };

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
  const resolvedAvatarUrl = await resolveAvatarSrc(user.avatarUrl ?? null);
  const primaryClass = classes[0];
  const { level, current: xpCurrent, needed: xpNeeded } = computeLevel(user.xpTotal);
  const tier = computeTier(level);
  const joinedStr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    user.createdAt,
  );
  const avatarRarity = rarestOf(user.badges.map((entry) => entry.badge.rarity));
  const serializedBadges: SerializedBadge[] = user.badges.map((entry) => ({
    id: entry.badge.id,
    refCode: entry.badge.refCode,
    earned: true,
    progress: null,
    name: entry.badge.name,
    description: entry.badge.description,
    iconUrl: entry.badge.iconUrl,
    rarity: entry.badge.rarity,
    criterionType: entry.badge.criterionType,
    earnedDateStr: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(entry.earnedAt),
  }));
  const serializedLessons: SerializedLesson[] = user.lessonProgress.map((entry) => ({
    lessonId: entry.lessonId,
    slug: entry.lesson.slug,
    title: entry.lesson.title,
    category: entry.lesson.category,
    xpReward: entry.lesson.xpReward,
    completedDateStr: entry.completedAt
      ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
          entry.completedAt,
        )
      : null,
  }));
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
  const legendaryCount = user.badges.filter((entry) => entry.badge.rarity === "LEGENDARY").length;
  const isPublic = user.preferences?.publicProfile !== false;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr";

  return (
    <div className="page-container learning-catalogue learning-workspace progression-workspace profile-workspace">
      <header className="profile-page-heading">
        <p>Ton espace / Profil</p>
        <span>Membre depuis {joinedStr}</span>
      </header>
      <section className="profile-hero" aria-label="Ton identité">
        <div className="profile-identity">
          <div className="profile-avatar-block">
            <div
              className="profile-avatar-frame"
              style={{ color: BADGE_RARITY_VAR[avatarRarity], ...cosmeticAvatarFilter(1) }}
            >
              <AvatarView
                src={resolvedAvatarUrl}
                name={user.displayName}
                className="profile-avatar-face"
                glyphSize={56}
                glyphColor={BADGE_RARITY_VAR[avatarRarity]}
              />
            </div>
            <span className="profile-avatar-rarity">{BADGE_RARITY_LABELS[avatarRarity]}</span>
          </div>
          <div className="profile-identity__body">
            <h1>
              {user.username ? (
                <>
                  <span>@</span>
                  {user.username}
                </>
              ) : (
                user.displayName
              )}
              <span>.</span>
            </h1>
            <p className="profile-display-name">{user.displayName}</p>
            <div className="profile-rank">
              <TierBadge tier={tier.tier} />
              <span>Niveau {level}</span>
            </div>
          </div>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          {primaryClass && (
            <Link className="profile-class" href="/my-class">
              <span>Ma classe</span>
              <strong>{primaryClass.name}</strong>
              <span>
                {primaryClass.promotion.establishment.name} · {primaryClass.promotion.name}
                {classes.length > 1 ? ` · +${String(classes.length - 1)}` : ""}
              </span>
            </Link>
          )}
        </div>
        <div className="profile-actions">
          <Link href="/settings/profile" className="btn">
            Éditer le profil
          </Link>
          {user.username && (
            <>
              <Link href={`/u/${user.username}`} className="btn btn--ghost">
                {isPublic ? "Voir mon profil public" : "Voir mon profil"}
              </Link>
              <CopyButton
                text={publicProfileUrl(siteUrl, user.username)}
                label="Copier le lien"
                copiedLabel="✓ Lien copié"
                className="btn btn--ghost"
              />
            </>
          )}
        </div>
      </section>
      <ProfileProgress current={xpCurrent} needed={xpNeeded} level={level} total={user.xpTotal} />
      <dl className="profile-totals">
        <div>
          <dt>Série actuelle</dt>
          <dd>
            {user.streakDays}
            <span> jours</span>
          </dd>
        </div>
        <div>
          <dt>Leçons terminées</dt>
          <dd>{user.lessonProgress.length}</dd>
        </div>
        <div>
          <dt>Badges obtenus</dt>
          <dd>
            {user.badges.length}
            <span className="profile-totals__detail">
              {legendaryCount} légendaire{legendaryCount > 1 ? "s" : ""}
            </span>
          </dd>
        </div>
        <div>
          <dt>Certificats délivrés</dt>
          <dd>{certs.length}</dd>
        </div>
      </dl>
      <section className="profile-calendar" aria-labelledby="profile-calendar-title">
        <div className="workspace-section">
          <h2 id="profile-calendar-title">Ton activité</h2>
          <span>Ta série et tes jours d’activité</span>
        </div>
        <StreakCard userId={authUser.id} year />
      </section>
      <ProfileContent
        badges={serializedBadges}
        lessons={serializedLessons}
        certs={serializedCerts}
      />
    </div>
  );
}
