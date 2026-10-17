import { duelRepository, profileRepository, streakRepository } from "@cyberlearn/db";
import type { DuelResultCounts, HeadToHead } from "@cyberlearn/lib/social/duel";
// rarityLabel, not @cyberlearn/ui's BADGE_RARITY_LABELS: this module also
// serves an API route, and the UI barrel brings client components with it.
import {
  type ContributionCounts,
  type PathProgressLine,
  pathProgressLines,
  profileTimeline,
  rarestBadges,
  rarityLabel,
  type TimelineEvent,
} from "@cyberlearn/lib/social/portfolio";

/**
 * What somebody's profile shows beyond its user row, read the same way for
 * the site's page (/u/[username]) and the app's screen (mobile-profile.ts),
 * so the two never disagree on a figure.
 *
 * Callers are responsible for ACCESS: `ownerId` comes from
 * userRepository.findPublicProfile, which already let the reader in (a
 * public profile, their own, or an accepted friend's private one). Nothing
 * here says which class somebody is in: the paths are the catalogue's only.
 */

export interface ProfileActivity {
  /** Activity count by day, "YYYY-MM-DD", over the last year. */
  days: Record<string, number>;
  daysThisYear: number;
  longestStreak: number;
}

export interface ProfileBadgeHighlight {
  id: string;
  name: string;
  rarity: string;
  /** "Légendaire": written on the server, so the app says what the site says. */
  rarityLabel: string;
  iconUrl: string | null;
  /** How many people hold it, the owner included. */
  holders: number;
}

export interface ProfileExtras {
  activity: ProfileActivity;
  /** The owner's results over every duel they played; what is open is theirs alone. */
  duelRecord: DuelResultCounts;
  /** Between the reader and the owner, from the reader's seat: friends only. */
  headToHead: HeadToHead | null;
  rarestBadges: ProfileBadgeHighlight[];
  paths: PathProgressLine[];
  contributions: ContributionCounts;
}

const NO_ACTIVITY: ProfileActivity = { days: {}, daysThisYear: 0, longestStreak: 0 };

/**
 * The extras of the owner's profile for this reader. `readerIsFriend` is the
 * friendship the page already read (friendshipView === "friends"): the
 * head-to-head is between friends only, and a reader on their own page has
 * nobody to face.
 */
export async function profileExtras(
  ownerId: string,
  readerId: string | null,
  readerIsFriend: boolean,
): Promise<ProfileExtras> {
  const facing = readerIsFriend && readerId !== null && readerId !== ownerId ? readerId : null;
  const [overview, record, between, open, candidates, paths, contributions] = await Promise.all([
    streakRepository.getOverview(ownerId),
    duelRepository.recordFor(ownerId),
    facing === null ? null : duelRepository.recordBetween(facing, ownerId),
    facing === null ? null : duelRepository.findOpenBetween(facing, ownerId),
    profileRepository.badgeCandidates(ownerId),
    profileRepository.pathsOf(ownerId),
    profileRepository.contributionsOf(ownerId),
  ]);

  return {
    activity:
      overview === null
        ? NO_ACTIVITY
        : {
            days: overview.activity,
            daysThisYear: overview.daysThisYear,
            longestStreak: overview.longestStreak,
          },
    duelRecord: { win: record.win, loss: record.loss, draw: record.draw },
    headToHead: between === null ? null : { ...between, openDuelId: open?.id ?? null },
    rarestBadges: rarestBadges(candidates).map((badge) => ({
      id: badge.id,
      name: badge.name,
      rarity: badge.rarity,
      rarityLabel: rarityLabel(badge.rarity),
      iconUrl: badge.iconUrl,
      holders: badge.holders,
    })),
    paths: pathProgressLines(paths),
    contributions,
  };
}

/** What the timeline merges, as findPublicProfile and profileExtras return it. */
export interface TimelineInput {
  badges: readonly { id: string; earnedAt: Date; badge: { name: string } }[];
  certificates: readonly { publicId: string; issuedAt: Date; path: { title: string } }[];
  challengeProgress: readonly {
    completedAt: Date | null;
    challenge: { slug: string; title: string };
  }[];
}

/**
 * The profile's last moments: its badges, certificates, finished paths and
 * solved challenges, on their dates (profileTimeline). The paths are the
 * extras' own, the catalogue's.
 */
export function timelineOf(
  user: TimelineInput,
  paths: readonly PathProgressLine[],
): TimelineEvent[] {
  return profileTimeline({
    badges: user.badges.map((ub) => ({ id: ub.id, name: ub.badge.name, earnedAt: ub.earnedAt })),
    certificates: user.certificates.map((cert) => ({
      publicId: cert.publicId,
      pathTitle: cert.path.title,
      issuedAt: cert.issuedAt,
    })),
    paths: paths.map((path) => ({
      slug: path.slug,
      title: path.title,
      completedAt: path.completedAt,
    })),
    challenges: user.challengeProgress.map((cp) => ({
      slug: cp.challenge.slug,
      title: cp.challenge.title,
      completedAt: cp.completedAt,
    })),
  });
}
