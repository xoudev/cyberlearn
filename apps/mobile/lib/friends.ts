import type { DuelResultCounts, HeadToHead } from "@cyberlearn/lib/social/duel";
import {
  UNFRIEND_DETAIL,
  unfriendQuestion,
  type FriendshipView,
} from "@cyberlearn/lib/social/friendship";
import type {
  ContributionCounts,
  PathProgressLine,
  ProfileCounts,
  TimelineEvent,
} from "@cyberlearn/lib/social/portfolio";
import type { CosmeticLoadout } from "./cosmetics";
import type { Category, Rarity } from "./db";

/**
 * Friends in the app: the three lists, somebody's profile page with its
 * button, and the friends board. What the server decides (who may see a
 * profile, who is on a friends board, what a request turns into) stays on the
 * server; this module only words it, the same way the site does.
 */

export type { FriendshipView } from "@cyberlearn/lib/social/friendship";

/** One person in a list, as /api/mobile/friends sends them. */
export interface Friend {
  id: string;
  username: string | null;
  name: string;
  level: number;
  xpTotal: number;
  /** Ready to draw: a glyph, a preset path, a signed URL, or null. */
  avatar: string | null;
  since: string;
  /** Whether the reader would be let into their profile (false: private, and not a friend). */
  profileOpen: boolean;
}

export interface FriendLists {
  /** Requests waiting on the reader's answer. */
  incoming: Friend[];
  friends: Friend[];
  /** Requests the reader sent that nobody has answered yet. */
  outgoing: Friend[];
}

export type FriendListKind = keyof FriendLists;

export interface ProfileBadge {
  id: string;
  name: string;
  rarity: string;
  iconUrl: string | null;
}

export interface ProfileLesson {
  title: string;
  slug: string;
  category: string;
  completedAt: string | null;
}

export interface ProfileSkill {
  category: string;
  label: string;
  short: string;
  color: string;
  lessons: number;
  paths: string[];
}

export interface ProfileCertificate {
  publicId: string;
  pathTitle: string;
  category: string;
  issuedAt: string;
  score: number | null;
  verifyUrl: string;
  /** On the holder's own page only. */
  linkedInUrl: string | null;
}

export interface ProfileChallenge {
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  difficultyLabel: string;
  difficultyColor: string;
  completedAt: string | null;
}

export interface ProfileBadgeHighlight extends ProfileBadge {
  /** "Légendaire", in the site's words. */
  rarityLabel: string;
  /** How many people hold it, the owner included. */
  holders: number;
}

/** A year of activity, day by day: the site's calendar's data. */
export interface ProfileActivity {
  /** Activity count by day, "YYYY-MM-DD". */
  days: Record<string, number>;
  daysThisYear: number;
  longestStreak: number;
}

/** Somebody's profile page, as /api/mobile/profile sends it. */
export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatar: string | null;
  joinedAt: string;
  xpTotal: number;
  streakDays: number;
  level: { level: number; current: number; needed: number };
  isPrivate: boolean;
  isSelf: boolean;
  friendship: FriendshipView;
  /** The most recent badges, a dozen at most: `counts.badges` has them all. */
  badges: ProfileBadge[];
  recentLessons: ProfileLesson[];
  skills: ProfileSkill[];
  certificates: ProfileCertificate[];
  challenges: ProfileChallenge[];
  // Added later, each beside the rest: a server from before them sends none,
  // and the screen draws what it had then.
  /** Counted on the server, not read off the bounded lists above. */
  counts?: ProfileCounts;
  activity?: ProfileActivity;
  /** The owner's results over every duel they played. */
  duelRecord?: DuelResultCounts;
  /** Between the reader and the owner, from the reader's seat; null unless friends. */
  headToHead?: HeadToHead | null;
  rarestBadges?: ProfileBadgeHighlight[];
  timeline?: TimelineEvent[];
  paths?: PathProgressLine[];
  contributions?: ContributionCounts;
  /** The owner's equipped cosmetic codes: the screen wears them. */
  ownerCosmetics?: CosmeticLoadout;
}

/**
 * The profile's figures: the server's counts, or, from a server that sends
 * none, the lengths of the lists it sent, as the screen showed them before.
 */
export function profileCounts(profile: PublicProfile): ProfileCounts {
  return (
    profile.counts ?? {
      badges: profile.badges.length,
      lessons: profile.recentLessons.length,
      challenges: profile.challenges.length,
      certificates: profile.certificates.length,
      paths: 0,
    }
  );
}

/**
 * The handle a row's name opens, or null when it opens nothing: no handle, or
 * a private profile the reader is not let into - somebody who has only sent a
 * request is still a stranger to it, and a tap on a name that lands on
 * "Profil introuvable" is worse than a name that is not a button.
 */
export function profileTarget(friend: Pick<Friend, "username" | "profileOpen">): string | null {
  return friend.profileOpen ? friend.username : null;
}

/** The undo button on a row: the same call, three different words, as on the site. */
export function removeLabel(kind: FriendListKind): string {
  if (kind === "friends") return "Retirer";
  if (kind === "incoming") return "Refuser";
  return "Annuler";
}

/** One answer of the phone's own dialog (react-native's Alert). */
export interface AlertChoice {
  text: string;
  style: "cancel" | "destructive";
  onPress?: () => void;
}

/**
 * The question before a friendship ends, in the site's words
 * (@cyberlearn/lib/social/friendship): "Annuler" first, the answer that ends
 * it marked destructive. Only unfriending asks; a request costs one tap to
 * send again.
 */
export function unfriendAlert(
  name: string,
  onConfirm: () => void,
): { title: string; message: string; buttons: AlertChoice[] } {
  return {
    title: unfriendQuestion(name),
    message: UNFRIEND_DETAIL,
    buttons: [
      { text: "Annuler", style: "cancel" },
      { text: "Retirer", style: "destructive", onPress: onConfirm },
    ],
  };
}

/** The count next to "Tes amis" on the friends board. */
export function friendsCountLabel(count: number): string {
  if (count === 0) return "personne pour l'instant";
  return `${String(count)} ami${count > 1 ? "s" : ""}`;
}

/** The count on a list's heading: "3 demandes", "1 ami". */
export function listCountLabel(kind: FriendListKind, count: number): string {
  const plural = count > 1 ? "s" : "";
  if (kind === "friends") return `${String(count)} ami${plural}`;
  return `${String(count)} demande${plural}`;
}

/**
 * The line under the friends board, beside its switch. Being on this board
 * says nothing about being on the friends' own boards, so it says which of the
 * two the reader is, in the site's words.
 */
export function friendsBoardNotice(listedForFriends: boolean): string {
  return listedForFriends
    ? "Tes amis te voient dans leur propre classement."
    : "Tu n'apparais pas dans le classement de tes amis : ce tableau est le tien, eux ne t'y voient pas.";
}

/**
 * Whether a board row carries the friend mark, as on the site: the server
 * flags a friend only on a row that shows who it is, and the row checks
 * again that it names somebody - a mark beside "Anonyme" would say who it
 * is. A server from before the marks sends no flag at all, which marks
 * nobody.
 */
export function showsFriendMark(entry: {
  isFriend?: boolean;
  isCurrentUser: boolean;
  displayName: string | null;
  username: string | null;
}): boolean {
  return (
    entry.isFriend === true &&
    !entry.isCurrentUser &&
    (entry.username !== null || entry.displayName !== null)
  );
}

/** A board row's name: nobody is anonymous on the friends board. */
export function boardName(entry: { displayName: string | null; username: string | null }): string {
  return entry.displayName || (entry.username ? `@${entry.username}` : "?");
}

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** "Membre depuis septembre 2026", in the reader's own time zone. */
export function joinedLabel(iso: string): string {
  const date = new Date(iso);
  return `Membre depuis ${MONTHS[date.getMonth()] ?? ""} ${String(date.getFullYear())}`;
}

/** The eyebrow over a profile: the site's, word for word. */
export function profileEyebrow(isPrivate: boolean): string {
  return isPrivate ? "profil privé · visible par ses amis" : "profil public";
}

/** The site's short months (Intl, fr-FR, month "short"). */
const SHORT_MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** The date a lesson was finished, short, as on the site: "1 sept.". */
export function shortDay(iso: string | null): string {
  if (iso === null) return "-";
  const date = new Date(iso);
  return `${String(date.getDate())} ${SHORT_MONTHS[date.getMonth()] ?? ""}`;
}

/** A moment of the timeline, a path finished, in full as on the site: "12 mars 2026". */
export function longDay(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate())} ${MONTHS[date.getMonth()] ?? ""} ${String(date.getFullYear())}`;
}

/**
 * A handle typed to open somebody's profile: "@Alex " reads as "alex". Null
 * for anything a handle cannot be (3 to 32 lowercase letters, digits and
 * inner hyphens, the rule sign-up applies), so the screen says so rather than
 * asking the server about a name that cannot exist.
 */
export function handleFrom(input: string): string | null {
  const handle = input.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(handle) ? handle : null;
}

const RARITIES: readonly string[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
const CATEGORIES: readonly string[] = ["DEV", "CYBERSEC", "NETWORK"];

/** A badge's rarity as sent; an unknown one is drawn as common rather than not at all. */
export function profileRarity(value: string): Rarity {
  // SAFETY: narrowed by the membership test on the schema's four values.
  return RARITIES.includes(value) ? (value as Rarity) : "COMMON";
}

/** A lesson's category as sent, or null for one the app does not know yet. */
export function profileCategory(value: string): Category | null {
  // SAFETY: narrowed by the membership test on the schema's three values.
  return CATEGORIES.includes(value) ? (value as Category) : null;
}
