/**
 * Sharing notes in the app: what the site's share dialog and its "Reçues"
 * section say, in the same words. Who may receive a note and whether the
 * screen lets it go are the server's (noteShareRepository); this module only
 * groups and words what it answered.
 */

export { noteExcerpt, timeAgo } from "@cyberlearn/lib/notes/preview";

/** A note somebody handed to the reader, as /api/mobile/notes/shared sends it. */
export interface IncomingNote {
  id: string;
  content: string;
  wordCount: number;
  updatedAt: string;
  sharedAt: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonCategory: string;
  authorName: string;
}

/** Somebody a note can go to, as /api/mobile/notes/share sends them. */
export interface ShareAudienceEntry {
  id: string;
  name: string;
  kind: "PEER" | "TEACHER" | "FRIEND";
  groupId: string;
  groupLabel: string;
  /** Already holds this note. */
  holds: boolean;
}

export interface ShareAudience {
  entries: ShareAudienceEntry[];
  /** Neither a live class nor a friend. */
  noAudience: boolean;
}

export interface AudienceGroup {
  id: string;
  label: string;
  people: ShareAudienceEntry[];
}

/**
 * The picker's headings, in the order the server listed the people: a class
 * then its members, teachers first, then friends. Keyed by the group's id, not
 * its label: two classes called "3A" are two classes.
 */
export function groupAudience(entries: ShareAudienceEntry[]): AudienceGroup[] {
  const groups = new Map<string, AudienceGroup>();
  for (const entry of entries) {
    const group = groups.get(entry.groupId);
    if (group) group.people.push(entry);
    else groups.set(entry.groupId, { id: entry.groupId, label: entry.groupLabel, people: [entry] });
  }
  return [...groups.values()];
}

/** What the picker says once a share went out, as on the site. */
export function shareDoneLabel(shared: number): string {
  if (shared === 0) return "Ces personnes avaient déjà cette note.";
  return `Note partagée à ${String(shared)} personne${shared > 1 ? "s" : ""}.`;
}

/** The count next to the "Reçues" heading. */
export function receivedCountLabel(count: number): string {
  const s = count > 1 ? "s" : "";
  return `${String(count)} note${s} partagée${s} avec toi`;
}

/** The site's line when there is nobody to share with. */
export const NO_AUDIENCE =
  "Une note se partage avec les membres de ta classe et avec tes amis, et tu n'as encore ni l'un ni l'autre. Ton établissement peut t'ajouter à une classe, et tu peux ajouter quelqu'un en ami depuis son profil.";

/** Under the picker's title, as on the site. */
export const SHARE_REASSURANCE = "Ta note reste la tienne : tu peux la reprendre à tout moment.";
