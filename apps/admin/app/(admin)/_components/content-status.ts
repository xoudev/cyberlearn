import type { Tone } from "./admin-ui";

/** The publication state a lesson and a path share. */
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/**
 * How the console names and colours that state, wherever it shows it: the
 * badge in a list and the head of an edit page. The edit pages had their own
 * map, with an amber draft and a red archive the lists did not use.
 *
 * A plain module rather than an export of status-badge: that one is a client
 * module, and a server page reading a value from it gets a reference, not the
 * object.
 */
export const CONTENT_STATUS: Record<ContentStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PUBLISHED: { label: "Publié", tone: "accent" },
  ARCHIVED: { label: "Archivé", tone: "danger" },
};
