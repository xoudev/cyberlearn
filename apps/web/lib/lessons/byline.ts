/**
 * Who a lesson is credited to.
 *
 * The column that holds the author is nullable and set to null when the
 * account is erased, so on its own it cannot tell "there never was a person"
 * from "there was one and they are gone". Read as the second, every catalogue
 * lesson carried the byline "Compte supprimé" - alarming, useless to a reader,
 * and wrong about a hundred and ninety-two lessons that were imported from MDX
 * and never had a personal author in the first place.
 *
 * The audience settles it. A CATALOGUE lesson is the platform's own work; the
 * author column exists for the other kind, the lesson a teacher writes for
 * their classes. So a missing author means the platform on one side and a
 * deleted account on the other, and both are true statements rather than one
 * guess applied to everything.
 */

export type BylineKind =
  /** A named person, with a profile to open. */
  | "person"
  /** Someone who keeps their profile private. */
  | "anonymous"
  /** No author, and none was expected: the lesson is CyberLearn's. */
  | "platform"
  /** No author, and one is missing: the account was erased. */
  | "gone";

export interface BylineAuthor {
  username: string | null;
  displayName: string;
  role: string;
  preferences: { publicProfile: boolean } | null;
}

export interface Byline {
  kind: BylineKind;
  /** What the rail shows as the name. */
  name: string;
  /** The line under it, when the person's standing is worth stating. */
  roleLabel: string | null;
  /** Where the name links, or null when there is nowhere to go. */
  profilePath: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Professeur",
  ADMIN: "Équipe CyberLearn",
};

/** The platform's own name, for the lessons it wrote itself. */
export const PLATFORM_BYLINE = "Équipe CyberLearn";

export function lessonByline(author: BylineAuthor | null, audience: "CATALOGUE" | "CLASS"): Byline {
  if (author === null) {
    return audience === "CATALOGUE"
      ? { kind: "platform", name: PLATFORM_BYLINE, roleLabel: null, profilePath: null }
      : { kind: "gone", name: "Compte supprimé", roleLabel: null, profilePath: null };
  }

  // A private profile is not a missing one: the person is there, they just do
  // not want their name on it. Saying so beats both naming them and pretending
  // the lesson has no author.
  if (author.preferences?.publicProfile === false) {
    return { kind: "anonymous", name: "Anonyme", roleLabel: null, profilePath: null };
  }

  // displayName is a string that can be empty, so || is the operator meant
  // here: fall through an empty name to the handle.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const name = author.displayName.trim() || author.username || "Sans nom";
  return {
    kind: "person",
    name,
    roleLabel: ROLE_LABEL[author.role] ?? null,
    profilePath: author.username === null ? null : `/u/${author.username}`,
  };
}
