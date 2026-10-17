import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { cosmeticRepository, friendshipRepository } from "@cyberlearn/db";
import { computeLevel, dayKey, friendshipView, type FriendshipView } from "@cyberlearn/lib";
import { BADGE_RARITY_VAR, BadgeMedallion, toBadgeRarity } from "@cyberlearn/ui";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { duelRecordLines, headToHeadVerdict } from "@cyberlearn/lib/social/duel";
import {
  certificateVerifyUrl,
  contributionLines,
  holdersLabel,
  lessonsFinishedLabel,
  linkedInCertificateUrl,
  missionsLabel,
  moreLabel,
  publicProfileUrl,
  sectionNumbers,
  skillLines,
  TIMELINE_LABEL,
} from "@cyberlearn/lib/social/portfolio";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { profileExtras, timelineOf } from "@/lib/profile/profile-extras";
import {
  findProfileFor,
  profileAccessFor,
  profileReaderId,
} from "@/lib/profile/public-profile-read";
import { scopedCosmeticAttrs } from "@/lib/cosmetics/attrs";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { CornerBrackets } from "@/app/_components/corner-brackets";
import { pageAddressWithOwnImage } from "@/app/page-metadata";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { AvatarView } from "@/components/avatar-view";
import { CopyButton } from "@/components/copy-button";
import { Crumb } from "@/components/crumb";
import { ProgressBar } from "@/components/progress-bar";
import { StatTile } from "@/components/stat-tile";
import { XpProgress } from "@/components/xp-progress";
import { FriendshipActions } from "./_components/friendship-actions";
import "./public-profile.css";

// ── Metadata ──────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ username: string }>;
}

/**
 * The tab says "@handle" only for a profile the reader may open. It used to
 * say it for any address, so a closed profile's 404 still confirmed, in its
 * title, that the account existed. It asks the layout's light, cached check
 * rather than reading the profile: the handle in the address is the one the
 * lookup matched.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  // The layout's light, cached check, reused here: a closed or missing profile
  // 404s in generateMetadata too, so the tab never confirms, in its title, that
  // an account the reader may not open exists. No profile is read - the handle
  // in the address is the one the check matched. For a profile the reader may
  // open, the preview is the shared link's own - title, description, og:url
  // and the card drawn by opengraph-image.tsx - not the home page's.
  const access = await profileAccessFor(username);
  if (access === "closed") notFound();
  return {
    title: `@${username}`,
    description: `Le profil de @${username} sur CyberLearn : son niveau, ses badges, ses parcours et ses certificats.`,
    ...pageAddressWithOwnImage(`/u/${encodeURIComponent(username)}`),
    // Its owner closed it to everybody but their friends: a friend reads it,
    // a search engine never lists it, nor follows it to the people it names.
    ...(access === "private" ? { robots: { index: false, follow: false } } : {}),
  };
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

const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const MONTH_YEAR = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const FULL_DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

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
  // optional here - not requireRequestUser - and the friend buttons simply do
  // not appear. A banned account counts as signed out: every button would
  // send it to /banned. The viewer also decides whether a private profile
  // opens at all: a friend gets in, everybody else gets the same 404 as a
  // name that does not exist. The reader is the layout's read, cached; the
  // profile is read here only, behind the skeleton, so a prefetched link
  // never pays for it.
  const viewerId = await profileReaderId();

  const user = await findProfileFor(username);
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
  // built-in paths, "__glyph:" markers and null pass through unchanged. The
  // extras are the app's too (profileExtras): the year of activity, the duels,
  // the badges put forward, the paths, the contributions, and the
  // head-to-head, which only a friend gets.
  const [avatarSrc, cosmetics, extras] = await Promise.all([
    resolveAvatarSrc(user.avatarUrl),
    ownerCosmetics(user.id),
    profileExtras(user.id, viewerId, friendState === "friends"),
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
  const { counts } = user;

  const { level, current, needed } = computeLevel(user.xpTotal);
  const joinedStr = MONTH_YEAR.format(user.createdAt);

  const timeline = timelineOf(user, extras.paths);
  const contributions = contributionLines(extras.contributions);
  const duelLines = duelRecordLines(extras.duelRecord);
  const duelsPlayed = extras.duelRecord.win + extras.duelRecord.loss + extras.duelRecord.draw;
  const showCommunity = duelsPlayed > 0 || contributions.length > 0;
  const moreBadges = moreLabel(user.badges.length, counts.badges);
  const moreChallenges = moreLabel(user.challengeProgress.length, counts.challenges);

  const no = sectionNumbers([
    "activity",
    extras.headToHead !== null && "faceToFace",
    user.badges.length > 0 && "badges",
    extras.paths.length > 0 && "paths",
    skills.length > 0 && "skills",
    user.certificates.length > 0 && "certificates",
    user.challengeProgress.length > 0 && "challenges",
    showCommunity && "community",
    timeline.length > 0 && "timeline",
    user.lessonProgress.length > 0 && "lessons",
  ]);

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
            value={counts.badges.toLocaleString("fr-FR")}
            sub="trophées gagnés"
          />
          <StatTile
            size="lg"
            label="Leçons terminées"
            value={counts.lessons.toLocaleString("fr-FR")}
            sub="missions accomplies"
          />
          <StatTile
            size="lg"
            label="Défis résolus"
            value={counts.challenges.toLocaleString("fr-FR")}
            sub="flags, puzzles et labos"
          />
        </div>

        {/* ── A year of activity, day by day ─────────────────────────── */}
        <section className="pp-section">
          <SectionLabel
            eyebrow={`${no("activity")} · activité`}
            title="Une année d'apprentissage."
          />
          <div className="card pp-year">
            <div className="pp-year__figs">
              <p>
                <b>{extras.activity.daysThisYear}</b>
                {extras.activity.daysThisYear > 1 ? " jours actifs" : " jour actif"} cette année
              </p>
              {extras.activity.longestStreak > 0 && (
                <p>
                  record de série : <b>{extras.activity.longestStreak}</b>
                  {extras.activity.longestStreak > 1 ? " jours" : " jour"}
                </p>
              )}
            </div>
            <ActivityHeatmap
              activity={extras.activity.days}
              today={dayKey(new Date())}
              label={`Activité de ${name} sur les douze derniers mois`}
            />
          </div>
        </section>

        {/* ── Face to face: between friends only ─────────────────────── */}
        {extras.headToHead !== null && (
          <section className="pp-section">
            <SectionLabel eyebrow={`${no("faceToFace")} · duels entre vous`} title="Face à face." />
            <div className="card pp-versus">
              <p className="pp-versus__score">
                <span className="sr-only">{`Toi ${String(extras.headToHead.win)}, ${name} ${String(extras.headToHead.loss)}`}</span>
                <span aria-hidden="true">Toi</span>
                <b aria-hidden="true">{extras.headToHead.win}</b>
                <span className="pp-versus__dash" aria-hidden="true">
                  –
                </span>
                <b aria-hidden="true">{extras.headToHead.loss}</b>
                <span aria-hidden="true">{name}</span>
              </p>
              <div className="pp-versus__text">
                <p className="pp-row__title">{headToHeadVerdict(extras.headToHead, name)}</p>
                {extras.headToHead.draw > 0 && (
                  <p className="pp-versus__draws">
                    {extras.headToHead.draw} égalité{extras.headToHead.draw > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {extras.headToHead.openDuelId !== null ? (
                <Link
                  href={`/duels/${extras.headToHead.openDuelId}`}
                  className="btn btn--ghost btn--sm"
                >
                  Voir le duel en cours
                </Link>
              ) : (
                <Link href={`/duels?ami=${user.id}`} className="btn btn--accent btn--sm">
                  Défier
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ── Badges: the rarest put forward, then the most recent ───── */}
        {user.badges.length > 0 && (
          <section className="pp-section">
            <SectionLabel
              eyebrow={`${no("badges")} · trophées · ${String(counts.badges)}`}
              title="Badges obtenus."
            />
            {extras.rarestBadges.length > 0 && (
              <ul className="pp-rarest" aria-label="Ses badges les plus rares">
                {extras.rarestBadges.map((badge) => {
                  const rarity = toBadgeRarity(badge.rarity);
                  return (
                    <li key={badge.id} className="card pp-rarest__item">
                      <BadgeMedallion
                        rarity={rarity}
                        size="lg"
                        iconUrl={badge.iconUrl}
                        name={badge.name}
                      />
                      <div className="pp-row__main">
                        <div className="pp-kicker" style={tone(BADGE_RARITY_VAR[rarity])}>
                          {badge.rarityLabel}
                        </div>
                        <p className="pp-row__title">{badge.name}</p>
                        <p className="pp-rarest__holders">{holdersLabel(badge.holders)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
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
            {moreBadges !== null && <p className="pp-more">{moreBadges}</p>}
          </section>
        )}

        {/* ── Paths: going on, then finished, each with its bar ──────── */}
        {extras.paths.length > 0 && (
          <section className="pp-section">
            <SectionLabel eyebrow={`${no("paths")} · parcours`} title="En cours et terminés." />
            <div className="card">
              {extras.paths.map((path) => {
                const cat = categoryMeta(path.category);
                return (
                  <div key={path.slug} className="pp-row pp-row--wrap">
                    <div className="pp-row__main">
                      <div className="pp-kicker" style={tone(cat.color)}>
                        {cat.short} ·{" "}
                        {path.completed && path.completedAt !== null
                          ? `terminé le ${FULL_DAY.format(new Date(path.completedAt))}`
                          : "en cours"}
                      </div>
                      <p className="pp-row__title">{path.title}</p>
                    </div>
                    <div className="pp-path__bar">
                      <ProgressBar
                        value={path.percent}
                        label={`${path.title} : ${String(path.percent)} %`}
                        {...(path.completed ? { color: "var(--cosmetic-accent)" } : {})}
                      />
                      <span className="pp-row__date">
                        {path.completed
                          ? "100 %"
                          : `${String(path.percent)} % · ${missionsLabel(path.done, path.total)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Skills: what is finished, by category ──────────────────── */}
        {skills.length > 0 && (
          <section className="pp-section">
            <SectionLabel eyebrow={`${no("skills")} · compétences`} title="Ce qui est acquis." />
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
              eyebrow={`${no("certificates")} · certificats · ${String(counts.certificates)}`}
              title="Attestations obtenues."
            />
            <div className="card">
              {user.certificates.map((cert) => {
                const verifyUrl = certificateVerifyUrl(siteUrl, cert.publicId);
                const cat = categoryMeta(cert.path.category);
                const dateStr = MONTH_YEAR.format(cert.issuedAt);
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
              eyebrow={`${no("challenges")} · défis · ${String(counts.challenges)}`}
              title="Défis résolus."
            />
            <div className="card">
              {user.challengeProgress.map((cp) => {
                const diff = difficultyMeta(cp.challenge.difficulty);
                const dateStr = cp.completedAt ? DAY_MONTH.format(cp.completedAt) : "-";
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
            {moreChallenges !== null && <p className="pp-more">{moreChallenges}</p>}
          </section>
        )}

        {/* ── With the others: duels over all time, contributions ────── */}
        {showCommunity && (
          <section className="pp-section">
            <SectionLabel eyebrow={`${no("community")} · communauté`} title="Avec les autres." />
            <div className="pp-community">
              {duelsPlayed > 0 && (
                <div className="card pp-community__card">
                  <p className="pp-kicker">Duels · depuis toujours</p>
                  <ul className="pp-figures">
                    {duelLines.map((line) => (
                      <li key={line.outcome} data-outcome={line.outcome}>
                        <b>{line.n}</b>
                        <span>{line.word}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {contributions.length > 0 && (
                <div className="card pp-community__card">
                  <p className="pp-kicker">Contributions</p>
                  <ul className="pp-figures">
                    {contributions.map((line) => (
                      <li key={line.key}>
                        <b>{line.n}</b>
                        <span>
                          {line.label}
                          {line.detail !== null && <small>{line.detail}</small>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Timeline: the last moments, on their dates ─────────────── */}
        {timeline.length > 0 && (
          <section className="pp-section">
            <SectionLabel
              eyebrow={`${no("timeline")} · chronologie`}
              title="Ses derniers moments."
            />
            <ol className="card pp-timeline">
              {timeline.map((event) => (
                <li key={event.key} className="pp-row" data-kind={event.kind}>
                  <span className="pp-row__dot" aria-hidden="true" />
                  <div className="pp-row__main">
                    <div className="pp-kicker">{TIMELINE_LABEL[event.kind]}</div>
                    <p className="pp-row__title pp-row__title--clip">{event.title}</p>
                  </div>
                  <time className="pp-row__date" dateTime={event.at}>
                    {FULL_DAY.format(new Date(event.at))}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ── Recent lessons ─────────────────────────────────────────── */}
        {user.lessonProgress.length > 0 && (
          <section className="pp-section">
            <SectionLabel
              eyebrow={`${no("lessons")} · leçons · ${String(counts.lessons)}`}
              title="Leçons terminées récemment."
            />
            <div className="card">
              {user.lessonProgress.map((lp, i) => {
                const cat = categoryMeta(lp.lesson.category);
                const dateStr = lp.completedAt ? DAY_MONTH.format(lp.completedAt) : "-";

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
