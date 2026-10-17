import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type ContentCategory,
  isContentCategory,
} from "../content/vocabulary.js";

/**
 * The portfolio side of a public profile: what somebody can show for their
 * work, in words the site and the app share. Skills are read off what is
 * finished (lessons by category, paths completed), certificates get the link
 * that adds them to a LinkedIn profile, and nothing here touches a database.
 */

export interface SkillLine {
  category: ContentCategory;
  /** "Cybersécurité" */
  label: string;
  /** The short name, for a chip: "Cybersec". */
  short: string;
  color: string;
  /** Lessons finished in this category. */
  lessons: number;
  /** The titles of the paths completed in this category, most recent first as given. */
  paths: string[];
}

/**
 * One line per content category with something to show, in the catalogue's
 * order. A category the catalogue does not know is left out rather than
 * drawn without a name.
 */
export function skillLines(
  lessonsByCategory: readonly { category: string; count: number }[],
  completedPaths: readonly { title: string; category: string }[],
): SkillLine[] {
  return CATEGORY_ORDER.map((category): SkillLine | null => {
    const lessons = lessonsByCategory
      .filter((row) => row.category === category)
      .reduce((n, row) => n + row.count, 0);
    const paths = completedPaths.filter((p) => p.category === category).map((p) => p.title);
    if (lessons === 0 && paths.length === 0) return null;
    const meta = CATEGORY_META[category];
    return { category, label: meta.label, short: meta.short, color: meta.color, lessons, paths };
  }).filter((line): line is SkillLine => line !== null);
}

/** "12 leçons terminées", "1 leçon terminée". */
export function lessonsFinishedLabel(count: number): string {
  return `${String(count)} leçon${count > 1 ? "s" : ""} terminée${count > 1 ? "s" : ""}`;
}

/** The public page that proves a certificate, from the site's origin. */
export function certificateVerifyUrl(siteUrl: string, publicId: string): string {
  return `${siteUrl.replace(/\/+$/u, "")}/verify/${encodeURIComponent(publicId)}`;
}

/** Somebody's profile, from the site's origin: the link its owner hands out. */
export function publicProfileUrl(siteUrl: string, username: string): string {
  return `${siteUrl.replace(/\/+$/u, "")}/u/${encodeURIComponent(username)}`;
}

export interface CertificateToAdd {
  /** The certificate's name on LinkedIn: the path's title. */
  name: string;
  issuedAt: Date | string;
  publicId: string;
  verifyUrl: string;
}

/**
 * The link LinkedIn documents for adding a certification to a profile, with
 * the name, the issuer, the month and year, and the public page and id that
 * let anyone verify it. Opened by the holder, who then confirms on LinkedIn.
 */
export function linkedInCertificateUrl(
  certificate: CertificateToAdd,
  organization = "CyberLearn",
): string {
  const issued = new Date(certificate.issuedAt);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: certificate.name,
    organizationName: organization,
    issueYear: String(issued.getUTCFullYear()),
    issueMonth: String(issued.getUTCMonth() + 1),
    certUrl: certificate.verifyUrl,
    certId: certificate.publicId,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/** Whether a category name is one the portfolio can file a line under. */
export function isPortfolioCategory(value: string): value is ContentCategory {
  return isContentCategory(value);
}

/**
 * "01", "02"... for the sections a profile shows, in their order: a section
 * left out (nothing to show, or not for this reader) leaves no gap in the
 * numbering. The site and the app number the same sections alike.
 */
export function sectionNumbers<K extends string>(
  shown: readonly (K | false)[],
): (key: K) => string {
  const keys = shown.filter((key): key is K => key !== false);
  return (key) => String(keys.indexOf(key) + 1).padStart(2, "0");
}

// ── Exact counts ────────────────────────────────────────────────────────────

/**
 * What a profile has to show, counted rather than read off its lists: the
 * lists stop at a dozen or so rows, and the strip used to print their length,
 * so nobody ever had more than 10 lessons or 30 challenges.
 */
export interface ProfileCounts {
  badges: number;
  lessons: number;
  challenges: number;
  certificates: number;
  paths: number;
}

/** "et 4 autres" under a list that stops before the count; null when it shows them all. */
export function moreLabel(shown: number, total: number): string | null {
  const rest = total - shown;
  if (rest <= 0) return null;
  return `et ${String(rest)} autre${rest > 1 ? "s" : ""}`;
}

/** How many badges a profile lists, the most recent first; `moreLabel` says the rest. */
export const PROFILE_BADGES = 12;

/**
 * The badges a profile lists out of every badge it holds, most recent first
 * as given. Cut where the list is drawn, not where it is read: the app's
 * profile has always received every badge, and an app already installed
 * still counts them off that list.
 */
export function listedBadges<T>(badges: readonly T[]): T[] {
  return badges.slice(0, PROFILE_BADGES);
}

// ── The rarest badges ───────────────────────────────────────────────────────

/** Rarity, from the most common up: an unknown one ranks as common. */
const RARITY_RANK: Readonly<Record<string, number>> = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
};

export interface HeldBadge {
  id: string;
  name: string;
  rarity: string;
  iconUrl: string | null;
  earnedAt: Date | string;
  /** How many people hold it, the owner included. */
  holders: number;
}

/**
 * The few badges somebody would put forward: the highest rarity first, then
 * the one the fewest people hold, then the most recent. Shared by the site's
 * profile and the app's, so both put forward the same three.
 */
export function rarestBadges<T extends HeldBadge>(held: readonly T[], n = 3): T[] {
  const rank = (badge: HeldBadge): number => RARITY_RANK[badge.rarity] ?? 0;
  return [...held]
    .sort(
      (a, b) =>
        rank(b) - rank(a) ||
        a.holders - b.holders ||
        new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime() ||
        a.name.localeCompare(b.name, "fr"),
    )
    .slice(0, Math.max(0, n));
}

const RARITY_WORD: Readonly<Record<string, string>> = {
  COMMON: "Commun",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
};

/**
 * A rarity in French, the words of the site's badges (BADGE_RARITY_LABELS in
 * @cyberlearn/ui, which a server route cannot import without its client
 * components). An unknown rarity reads as common, as it is drawn.
 */
export function rarityLabel(rarity: string): string {
  return RARITY_WORD[rarity] ?? "Commun";
}

/** "Détenu par 3 personnes", under a badge put forward. */
export function holdersLabel(holders: number): string {
  if (holders <= 1) return "Détenu par une seule personne";
  return `Détenu par ${String(holders)} personnes`;
}

// ── The timeline ────────────────────────────────────────────────────────────

export type TimelineKind = "badge" | "certificate" | "path" | "challenge";

export interface TimelineEvent {
  kind: TimelineKind;
  /** The badge's name, the path's title, the challenge's title. */
  title: string;
  /** ISO date. */
  at: string;
  /** Unique within the timeline, for a list key. */
  key: string;
}

/** What happened, in a word, before its title. */
export const TIMELINE_LABEL: Record<TimelineKind, string> = {
  badge: "Badge obtenu",
  certificate: "Certificat obtenu",
  path: "Parcours terminé",
  challenge: "Défi résolu",
};

export interface TimelineSources {
  badges: readonly { id: string; name: string; earnedAt: Date | string }[];
  certificates: readonly { publicId: string; pathTitle: string; issuedAt: Date | string }[];
  paths: readonly { slug: string; title: string; completedAt: Date | string | null }[];
  challenges: readonly { slug: string; title: string; completedAt: Date | string | null }[];
}

/** How many moments the timeline shows. */
export const TIMELINE_LENGTH = 8;

/**
 * Somebody's last moments, most recent first: the badges they earned, the
 * certificates they were given, the paths they finished and the challenges
 * they solved, merged on their dates. Each source is read most recent first
 * and bounded above `limit`, so the merge of their heads is the true head of
 * the whole. A moment without a date is left out rather than guessed.
 */
export function profileTimeline(
  sources: TimelineSources,
  limit: number = TIMELINE_LENGTH,
): TimelineEvent[] {
  const iso = (value: Date | string): string => new Date(value).toISOString();
  const events: TimelineEvent[] = [
    ...sources.badges.map((b) => ({
      kind: "badge" as const,
      title: b.name,
      at: iso(b.earnedAt),
      key: `badge:${b.id}`,
    })),
    ...sources.certificates.map((c) => ({
      kind: "certificate" as const,
      title: c.pathTitle,
      at: iso(c.issuedAt),
      key: `certificate:${c.publicId}`,
    })),
    ...sources.paths.flatMap((p) =>
      p.completedAt === null
        ? []
        : [
            {
              kind: "path" as const,
              title: p.title,
              at: iso(p.completedAt),
              key: `path:${p.slug}`,
            },
          ],
    ),
    ...sources.challenges.flatMap((c) =>
      c.completedAt === null
        ? []
        : [
            {
              kind: "challenge" as const,
              title: c.title,
              at: iso(c.completedAt),
              key: `challenge:${c.slug}`,
            },
          ],
    ),
  ];
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, Math.max(0, limit));
}

// ── Paths and their progress ────────────────────────────────────────────────

export interface PathProgressRow {
  slug: string;
  title: string;
  category: string;
  completed: boolean;
  /** The path's missions the owner finished. */
  done: number;
  /** The path's missions: its published lessons. */
  total: number;
  completedAt: Date | string | null;
}

export interface PathProgressLine {
  slug: string;
  title: string;
  category: string;
  completed: boolean;
  done: number;
  total: number;
  /** 0 to 100; 100 only for a path completed. */
  percent: number;
  /** ISO date, once completed. */
  completedAt: string | null;
}

/**
 * How far into a path, in percent. A completed path is 100 whatever its
 * lessons say (one may have been added since); one still going never shows
 * 100, since every lesson done is not the path finished (its final quiz may
 * be left), and "100 %" on an unfinished path reads as done.
 */
export function pathPercent(done: number, total: number, completed: boolean): number {
  if (completed) return 100;
  if (total <= 0) return 0;
  return Math.min(99, Math.max(0, Math.round((done / total) * 100)));
}

/**
 * The paths a profile shows, each with its bar: the ones going on first, the
 * furthest along first, then the ones finished, the most recent first.
 */
export function pathProgressLines(rows: readonly PathProgressRow[]): PathProgressLine[] {
  const lines = rows.map(
    (row): PathProgressLine => ({
      slug: row.slug,
      title: row.title,
      category: row.category,
      completed: row.completed,
      done: Math.min(row.done, row.total),
      total: row.total,
      percent: pathPercent(row.done, row.total, row.completed),
      completedAt:
        row.completed && row.completedAt !== null ? new Date(row.completedAt).toISOString() : null,
    }),
  );
  const going = lines.filter((l) => !l.completed).sort((a, b) => b.percent - a.percent);
  const finished = lines
    .filter((l) => l.completed)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  return [...going, ...finished];
}

/** "7 / 12 missions", under a path's bar. */
export function missionsLabel(done: number, total: number): string {
  return `${String(done)} / ${String(total)} mission${total > 1 ? "s" : ""}`;
}

// ── Contributions ───────────────────────────────────────────────────────────

/** What somebody gave the others: visible messages only, nothing moderation hid. */
export interface ContributionCounts {
  /** Forum messages, the opening ones included. */
  posts: number;
  /** Threads opened, among those messages. */
  topics: number;
  /** Answers under lessons. */
  answers: number;
  /** Of which the asker accepted. */
  acceptedAnswers: number;
  /** Challenge solutions shared. */
  writeups: number;
}

export interface ContributionLine {
  key: "posts" | "answers" | "writeups";
  n: number;
  /** "messages au forum" */
  label: string;
  /** "dont 2 sujets ouverts", or null. */
  detail: string | null;
}

/** The contributions worth a line, the empty ones left out. */
export function contributionLines(counts: ContributionCounts): ContributionLine[] {
  const s = (n: number): string => (n > 1 ? "s" : "");
  const lines: ContributionLine[] = [];
  if (counts.posts > 0) {
    lines.push({
      key: "posts",
      n: counts.posts,
      label: `message${s(counts.posts)} au forum`,
      detail:
        counts.topics > 0
          ? `dont ${String(counts.topics)} sujet${s(counts.topics)} ouvert${s(counts.topics)}`
          : null,
    });
  }
  if (counts.answers > 0) {
    lines.push({
      key: "answers",
      n: counts.answers,
      label: `réponse${s(counts.answers)} sous les leçons`,
      detail:
        counts.acceptedAnswers > 0
          ? `dont ${String(counts.acceptedAnswers)} acceptée${s(counts.acceptedAnswers)}`
          : null,
    });
  }
  if (counts.writeups > 0) {
    lines.push({
      key: "writeups",
      n: counts.writeups,
      label: `solution${s(counts.writeups)} de défi partagée${s(counts.writeups)}`,
      detail: null,
    });
  }
  return lines;
}
