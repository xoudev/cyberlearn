/**
 * Requests one part of the page sends another, through window events: the
 * site's right-click menu asks the navbar's search to look a term up, or the
 * lesson's toolbar to add a passage to the lesson's note, without either
 * knowing where the other is mounted.
 */

export const SEARCH_EVENT = "cyberlearn:search";
export const ADD_TO_NOTES_EVENT = "cyberlearn:add-to-notes";

/** Attribute on the element that answers SEARCH_EVENT (the navbar's search). */
export const SEARCH_TARGET_ATTR = "data-global-search";
/** Attribute on the element that answers ADD_TO_NOTES_EVENT (a lesson's toolbar). */
export const ADD_TO_NOTES_TARGET_ATTR = "data-add-to-notes";

export function requestSearch(term: string): void {
  window.dispatchEvent(new CustomEvent<{ term: string }>(SEARCH_EVENT, { detail: { term } }));
}

export function requestAddToNotes(text: string): void {
  window.dispatchEvent(new CustomEvent<{ text: string }>(ADD_TO_NOTES_EVENT, { detail: { text } }));
}

/** The string in an event's detail under `key`, or null. */
export function detailString(event: Event, key: string): string | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail: unknown = event.detail;
  if (typeof detail !== "object" || detail === null || !(key in detail)) return null;
  const value: unknown = (detail as Record<string, unknown>)[key]; // narrowed by the `in` check above
  return typeof value === "string" ? value : null;
}
