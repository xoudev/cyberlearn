/**
 * How the class page names the people on a roster, and which names it links.
 *
 * A name is a link only when the profile behind it would open for the reader
 * (findPublicProfile's rule: public, one's own, or an accepted friend's). A
 * name that leads to "Cette page est introuvable" is worse than a name that is
 * not a link.
 */

import type { FriendshipView } from "@cyberlearn/lib/social/friendship";

export interface RosterPerson {
  id: string;
  username: string | null;
  displayName: string;
  preferences: { publicProfile: boolean } | null;
}

export interface ClassmateIdentity {
  name: string;
  /** The handle the name links to, or null for a name that is not a link. */
  username: string | null;
  /** Whether the row says who it is. "Anonyme" otherwise. */
  visible: boolean;
  isFriend: boolean;
  /**
   * Where the reader stands with this classmate, for the row's "Ajouter":
   * null on the reader's own row and on an "Anonyme" one, where it would say
   * which classmate already asked, or was asked.
   */
  friendship: FriendshipView | null;
}

/** displayName can be an empty string, so || falls through it to the handle. */
function nameOf(person: RosterPerson): string {
  return person.displayName || (person.username ?? "Sans nom");
}

/**
 * A classmate, as the student view lists them. A closed profile is
 * "Anonyme" to the rest of the class - but never to its owner, who used to
 * read their own row as "Anonyme · toi" and wonder where their name had gone.
 * Their own profile always opens for them, so their name stays a link.
 */
export function classmateIdentity(
  person: RosterPerson,
  viewerId: string,
  // The reader's relations with the classmates named, from
  // friendshipRepository.viewsOf. A classmate missing from it is a stranger.
  relations: ReadonlyMap<string, FriendshipView>,
): ClassmateIdentity {
  const self = person.id === viewerId;
  const visible = self || person.preferences?.publicProfile !== false;
  const friendship = !self && visible ? (relations.get(person.id) ?? "none") : null;
  return {
    name: visible ? nameOf(person) : "Anonyme",
    username: visible ? person.username : null,
    visible,
    isFriend: friendship === "friends",
    friendship,
  };
}

/** Whether a roster person's row would name them for the class: whose relation is worth reading. */
export function namedToClass(person: RosterPerson, viewerId: string): boolean {
  return person.id !== viewerId && person.preferences?.publicProfile !== false;
}

/**
 * A student, as their teacher's roster lists them: always by name - the
 * teacher has to know who has stalled - but a link only to a profile that
 * would open for the teacher. Teaching a class gives no way into a closed
 * profile, so a link there was a 404 for every student who had closed theirs.
 */
export function studentIdentity(
  person: RosterPerson,
  openToReader: ReadonlySet<string>,
): { name: string; username: string | null } {
  return {
    name: nameOf(person),
    username: openToReader.has(person.id) ? person.username : null,
  };
}
