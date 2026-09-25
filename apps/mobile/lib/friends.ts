import type { FriendshipView } from "@cyberlearn/lib/social/friendship";
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
  badges: ProfileBadge[];
  recentLessons: ProfileLesson[];
}

/** The undo button on a row: the same call, three different words, as on the site. */
export function removeLabel(kind: FriendListKind): string {
  if (kind === "friends") return "Retirer";
  if (kind === "incoming") return "Refuser";
  return "Annuler";
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
 * The line under the friends board. Being on this board says nothing about
 * being on the friends' own boards, so it says which of the two the reader is,
 * with the word the link carries.
 */
export function friendsBoardNotice(listedForFriends: boolean): { text: string; link: string } {
  return listedForFriends
    ? { text: "Tes amis te voient dans leur propre classement.", link: "Changer" }
    : {
        text: "Tu n'apparais pas dans le classement de tes amis : ce tableau est le tien, eux ne t'y voient pas.",
        link: "S'y ajouter",
      };
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
