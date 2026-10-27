import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { computeLevel, computeTier } from "@cyberlearn/lib";
import { certificateRepository, classRepository, userRepository } from "@cyberlearn/db";
import { BADGE_RARITY_LABELS, BADGE_RARITY_VAR, rarestOf } from "@cyberlearn/ui";
import { publicProfileUrl } from "@cyberlearn/lib/social/portfolio";
import { requireRequestUser } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { buildBadgeCollection } from "@/lib/badges/collection";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { AvatarView } from "@/components/avatar-view";
import { CopyButton } from "@/components/copy-button";
import { StreakCard } from "@/components/streak-card";
import { TierBadge } from "@/components/tier-badge";
import { ProfileProgress } from "@/components/profile-progress";
import { ProfileContent } from "./_components/profile-content";
import { ActivityFeed, type SerializedLesson } from "./_components/activity-feed";
import { BadgesCollection } from "./_components/badges-collection";
import { CertificatesList } from "./_components/certificates-list";
import "../../../components/profile-workspace.css";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();
  const [{ collection, user }, certs, classes] = await Promise.all([
    buildBadgeCollection(authUser.id).then(async (collection) => ({
      collection,
      user: await userRepository.findProfile(authUser.id),
    })),
    certificateRepository.listForUser(authUser.id),
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
  // A custom property is a valid inline style that CSSProperties does not list.
  const rarityStyle: React.CSSProperties & { "--rarity": string } = {
    "--rarity": BADGE_RARITY_VAR[avatarRarity],
  };
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
  const completedLessonsCount = user.counts.lessons;
  const certsCount = certs.filter((cert) => cert.revokedAt === null).length;
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
            {/* Square, framed by what the learner equipped (globals.css, Avatar
                frames). The rarest badge is said beside it, in its own colour,
                rather than painted around the picture. */}
            <div className="profile-avatar-frame" style={cosmeticAvatarFilter(1)}>
              <AvatarView
                src={resolvedAvatarUrl}
                name={user.displayName}
                className="profile-avatar-face"
                glyphSize={56}
              />
            </div>
            <span className="profile-avatar-rarity" style={rarityStyle}>
              {BADGE_RARITY_LABELS[avatarRarity]}
            </span>
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
          <dd>{completedLessonsCount}</dd>
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
          <dd>{certsCount}</dd>
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
        counts={{
          activite: completedLessonsCount,
          badges: `${String(collection.earnedCount)}/${String(collection.totalCount)}`,
          certificats: certsCount,
        }}
        panels={{
          activite: <ActivityFeed lessons={serializedLessons} total={completedLessonsCount} />,
          badges: (
            <BadgesCollection
              groups={collection.groups}
              earnedCount={collection.earnedCount}
              totalCount={collection.totalCount}
              rarityTotals={collection.rarityTotals}
              rarityEarned={collection.rarityEarned}
            />
          ),
          certificats: <CertificatesList certs={certs} />,
        }}
      />
    </div>
  );
}
