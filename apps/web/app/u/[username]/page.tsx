import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { cosmeticRepository, friendshipRepository, userRepository } from "@cyberlearn/db";
import { computeLevel, friendshipView, type FriendshipView } from "@cyberlearn/lib";
import { BadgeMedallion, toBadgeRarity } from "@cyberlearn/ui";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import {
  certificateVerifyUrl,
  lessonsFinishedLabel,
  linkedInCertificateUrl,
  publicProfileUrl,
  skillLines,
} from "@cyberlearn/lib/social/portfolio";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { getRequestUser } from "@/lib/auth";
import { scopedCosmeticAttrs } from "@/lib/cosmetics/attrs";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { CornerBrackets } from "@/app/_components/corner-brackets";
import { AvatarView } from "@/components/avatar-view";
import { CopyButton } from "@/components/copy-button";
import { Crumb } from "@/components/crumb";
import { StatTile } from "@/components/stat-tile";
import { XpProgress } from "@/components/xp-progress";
import { FriendshipActions } from "./_components/friendship-actions";
import "./public-profile.css";

// ── Metadata ──────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

// ── Shared bits ───────────────────────────────────────────────────────────────

/** A colour a row takes from its data (a category, a difficulty), for the stylesheet. */
function tone(color: string): React.CSSProperties & { "--pp-tone": string } {
  return { "--pp-tone": color };
}

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }): React.ReactElement {
  return (
    <div className="pp-sec">
      <p className="pp-sec__eyebrow">{eyebrow}</p>
      <h2 className="pp-sec__title">{title}</h2>
    </div>
  );
}

/**
 * The owner's equipped cosmetics, for the profile's own scope. Decorative,
 * like the shell's: a failed read draws the profile in the default look
 * rather than taking the page down.
 */
async function ownerCosmetics(ownerId: string): Promise<ReturnType<typeof scopedCosmeticAttrs>> {
  try {
    return scopedCosmeticAttrs(await cosmeticRepository.findLoadout(ownerId));
  } catch (cosmeticError) {
    Sentry.captureException(cosmeticError, { tags: { area: "public-profile.cosmetics" } });
    return scopedCosmeticAttrs(null);
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Somebody's profile: who they are, their level, and what they have finished.
 *
 * Drawn in the app's shell for a signed-in reader and alone for anybody else
 * (the layout next to it decides). Below the breadcrumb it wears its owner's
 * cosmetics, while the shell around it keeps the reader's.
 */
export default async function PublicProfilePage({ params }: Props): Promise<React.ReactElement> {
  const { username } = await params;

  // Signed out is an ordinary way to read a public profile, so the viewer is
  // optional here - getRequestUser rather than requireRequestUser - and the
  // friend buttons simply do not appear. It is read before the profile
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
  const isSelf = viewerId === user.id;
  const friendState: FriendshipView =
    viewerId === null || isSelf
      ? "none"
      : friendshipView(await friendshipRepository.between(viewerId, user.id), viewerId);

  // Resolve "__upload:" markers to short-lived signed URLs before rendering;
  // built-in paths, "__glyph:" markers and null pass through unchanged.
  const [avatarSrc, cosmetics] = await Promise.all([
    resolveAvatarSrc(user.avatarUrl),
    ownerCosmetics(user.id),
  ]);

  // The portfolio: skills read off what is finished, certificates with their
  // proof, and, on the holder's own page only, the link that adds one to a
  // LinkedIn profile.
  const skills = skillLines(
    user.lessonsByCategory,
    user.pathProgress.map((pp) => ({ title: pp.path.title, category: pp.path.category })),
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr";
  const handle = user.username ?? username;
  const name = user.displayName || handle;

  const { level, current, needed } = computeLevel(user.xpTotal);
  const joinedStr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    user.createdAt,
  );

  return (
    <div className="page-container">
      <Crumb segments={["u", `@${handle}`]} />

      <div className="pp-owner" {...cosmetics}>
        {/* ── Hero: player card ──────────────────────────────────────── */}
        <header className="pp-hero">
          <CornerBrackets opacity={0.8} />
          <span className="pp-hero__strip" aria-hidden="true" />

          <div className="pp-avatar" style={cosmeticAvatarFilter(0.6)}>
            <div className="pp-avatar__ring" aria-hidden="true" />
            <div className="pp-avatar__face">
              <AvatarView src={avatarSrc} name={name} className="pp-avatar__img" glyphSize={44} />
            </div>
          </div>

          <div className="pp-identity">
            <p className="pg-eyebrow">
              {isPrivate ? "Profil privé, visible par ses amis" : "Profil public"} · membre depuis{" "}
              <b>{joinedStr}</b>
            </p>
            <h1 className="pg-title pp-title">
              <em>{name}</em>.
            </h1>
            <p className="pp-handle">@{handle}</p>
            {user.bio && <p className="pg-lede pp-lede">{user.bio}</p>}

            <div className="pp-actions">
              {/* Your own page: the way to change it, and the link to hand
                  out. Somebody else's: the friendship with them. Neither
                  when signed out - a button that cannot work is worse than
                  no button. */}
              {isSelf ? (
                <>
                  <Link href="/settings/profile" className="btn btn--ghost btn--sm">
                    Modifier mon profil
                  </Link>
                  <CopyButton
                    text={publicProfileUrl(siteUrl, handle)}
                    label="Copier le lien"
                    copiedLabel="✓ Lien copié"
                    className="btn btn--accent btn--ghost btn--sm"
                  />
                </>
              ) : viewerId !== null ? (
                <FriendshipActions targetId={user.id} name={name} initialState={friendState} />
              ) : null}
            </div>
          </div>

          <div className="pp-level">
            <p className="pp-level__eyebrow">
              <b>&gt;</b> Niveau actuel
            </p>
            <div className="pp-level__row">
              <span className="pp-level__n">{level}</span>
              <span className="pp-level__next">→ LVL {level + 1}</span>
            </div>
            <XpProgress current={current} needed={needed} level={level} />
          </div>
        </header>

        {/* ── Stats strip ────────────────────────────────────────────── */}
        <div className="pp-stats card">
          <StatTile
            size="lg"
            label="XP total"
            value={`+${user.xpTotal.toLocaleString("fr-FR")}`}
            sub="expérience cumulée"
            color="var(--cosmetic-accent)"
          />
          <StatTile
            size="lg"
            label="Série en cours"
            value={`${String(user.streakDays)}j`}
            sub={user.streakDays > 0 ? "🔥 en cours" : "à relancer"}
            color={
              user.streakDays > 0 ? "var(--color-rarity-legendary)" : "var(--color-text-muted)"
            }
          />
          <StatTile
            size="lg"
            label="Badges obtenus"
            value={String(user.badges.length)}
            sub="trophées gagnés"
          />
        </div>

        {/* ── Badges (earned-only, public showcase) ──────────────────── */}
        {user.badges.length > 0 && (
          <section className="pp-section">
            <SectionLabel
              eyebrow={`01 · trophées · ${String(user.badges.length)}`}
              title="Badges obtenus."
            />
            <ul className="pp-badges">
              {user.badges.map((ub) => (
                <li key={ub.id} title={ub.badge.name} className="pp-badge">
                  <BadgeMedallion
                    rarity={toBadgeRarity(ub.badge.rarity)}
                    size="md"
                    iconUrl={ub.badge.iconUrl}
                    name={ub.badge.name}
                  />
                  <span className="pp-badge__name">{ub.badge.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Skills: what is finished, by category ──────────────────── */}
        {skills.length > 0 && (
          <section className="pp-section">
            <SectionLabel eyebrow="02 · compétences" title="Ce qui est acquis." />
            <div className="pp-skills">
              {skills.map((skill) => (
                <div key={skill.category} className="card pp-skill">
                  <div className="pp-kicker" style={tone(skill.color)}>
                    {skill.label}
                  </div>
                  <p className="pp-row__title">{lessonsFinishedLabel(skill.lessons)}</p>
                  {skill.paths.length > 0 && (
                    <ul className="pp-skill__paths">
                      {skill.paths.map((title) => (
                        <li key={title}>Parcours terminé : {title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Certificates: the proof, and the way to a LinkedIn profile ── */}
        {user.certificates.length > 0 && (
          <section className="pp-section">
            <SectionLabel
              eyebrow={`03 · certificats · ${String(user.certificates.length)}`}
              title="Attestations obtenues."
            />
            <div className="card">
              {user.certificates.map((cert) => {
                const verifyUrl = certificateVerifyUrl(siteUrl, cert.publicId);
                const cat = categoryMeta(cert.path.category);
                const dateStr = new Intl.DateTimeFormat("fr-FR", {
                  month: "long",
                  year: "numeric",
                }).format(cert.issuedAt);
                return (
                  <div key={cert.publicId} className="pp-row pp-row--wrap">
                    <div className="pp-row__main">
                      <div className="pp-kicker" style={tone(cat.color)}>
                        {cat.short} · {dateStr}
                        {cert.score !== null ? ` · ${String(cert.score)} %` : ""}
                      </div>
                      <p className="pp-row__title">{cert.path.title}</p>
                    </div>
                    <Link href={`/verify/${cert.publicId}`} className="btn btn--ghost btn--sm">
                      Vérifier
                    </Link>
                    {isSelf && (
                      <a
                        href={linkedInCertificateUrl({
                          name: cert.path.title,
                          issuedAt: cert.issuedAt,
                          publicId: cert.publicId,
                          verifyUrl,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--accent btn--ghost btn--sm"
                      >
                        Ajouter à LinkedIn
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Challenges solved ──────────────────────────────────────── */}
        {user.challengeProgress.length > 0 && (
          <section className="pp-section">
            <SectionLabel
              eyebrow={`04 · défis · ${String(user.challengeProgress.length)}`}
              title="Défis résolus."
            />
            <div className="card">
              {user.challengeProgress.map((cp) => {
                const diff = difficultyMeta(cp.challenge.difficulty);
                const dateStr = cp.completedAt
                  ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                      cp.completedAt,
                    )
                  : "-";
                return (
                  <div key={cp.challenge.slug} className="pp-row">
                    <div className="pp-row__main">
                      <div className="pp-kicker" style={tone(diff.color)}>
                        {diff.label} · {categoryMeta(cp.challenge.category).short}
                      </div>
                      <p className="pp-row__title pp-row__title--clip">{cp.challenge.title}</p>
                    </div>
                    <span className="pp-row__date">{dateStr}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Recent lessons ─────────────────────────────────────────── */}
        {user.lessonProgress.length > 0 && (
          <section className="pp-section">
            <SectionLabel eyebrow="05 · activité" title="Leçons terminées récemment." />
            <div className="card">
              {user.lessonProgress.map((lp, i) => {
                const cat = categoryMeta(lp.lesson.category);
                const dateStr = lp.completedAt
                  ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                      lp.completedAt,
                    )
                  : "-";

                return (
                  <div key={`${lp.lesson.slug}-${String(i)}`} className="pp-row">
                    <span className="pp-row__n">{String(i + 1).padStart(2, "0")}</span>
                    <div className="pp-row__main">
                      <div className="pp-kicker" style={tone(cat.color)}>
                        {cat.short}
                      </div>
                      <p className="pp-row__title pp-row__title--clip">{lp.lesson.title}</p>
                    </div>
                    <span className="pp-row__date">
                      <span className="pp-row__dot" aria-hidden="true" />
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
