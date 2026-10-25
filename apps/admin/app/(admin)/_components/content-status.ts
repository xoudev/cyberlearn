import type { SelectOption } from "@cyberlearn/ui";
import { toneColor, type Tone } from "./admin-ui";

/** The publication state a lesson and a path share. */
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/**
 * How the console names and colours that state, wherever it shows it: the
 * badge in a list, the head of an edit page and the status field of its form.
 * The edit pages had their own map, with an amber draft the lists did not use.
 *
 * A plain module rather than an export of status-badge: that one is a client
 * module, and a server page reading a value from it gets a reference, not the
 * object.
 */
export const CONTENT_STATUS: Record<ContentStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PUBLISHED: { label: "Publié", tone: "success" },
  ARCHIVED: { label: "Archivé", tone: "danger" },
};

const ORDER: readonly ContentStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

/**
 * The same states as options of the shared <Select>, in the order a piece of
 * content goes through them. The tone colours the chosen option in the field,
 * so the form states the value the way the badge in the list does.
 */
export const CONTENT_STATUS_OPTIONS: SelectOption[] = ORDER.map((status) => ({
  value: status,
  label: CONTENT_STATUS[status].label,
  tone: toneColor(CONTENT_STATUS[status].tone),
}));
