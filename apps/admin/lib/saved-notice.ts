/**
 * The success of a save that ends in a redirect.
 *
 * Creating a badge or a lesson, saving a path or deleting a tournament sends
 * the administrator to another page with redirect(), and the form that would
 * have said "Enregistré." is gone with the page it was on: the list simply
 * appeared, with no word that anything happened. The action now leaves a flag
 * on the address it sends to; SavedNoticeToast, in the console's layout, says
 * it in a toast and takes it off the address, so a reload or a shared link
 * does not say it again.
 *
 * A flag only, never a name or a title: what is in a URL outlives the page in
 * the browser history and the server logs.
 */

/** The parameter the console's layout reads. */
export const SAVED_PARAM = "saved";

const NOTICES = {
  "1": "Enregistré.",
  created: "Créé.",
  deleted: "Supprimé.",
} as const satisfies Record<string, string>;

export type SavedNotice = keyof typeof NOTICES;

function isSavedNotice(value: string): value is SavedNotice {
  return Object.hasOwn(NOTICES, value);
}

/** Where a save sends the administrator, with what it came to. */
export function withSavedNotice(href: string, notice: SavedNotice = "1"): string {
  const [path = "", query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.set(SAVED_PARAM, notice);
  return `${path}?${params.toString()}`;
}

/** What to say for the flag on the address, or null for none or an unknown one. */
export function savedNoticeText(value: string | null): string | null {
  if (value === null || !isSavedNotice(value)) return null;
  return NOTICES[value];
}

/** The same address without the flag, the rest of the query kept as it was. */
export function withoutSavedNotice(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(SAVED_PARAM);
  const query = params.toString();
  return query === "" ? pathname : `${pathname}?${query}`;
}
