/**
 * Opening the messages panel from anywhere on a page: a window event the
 * panel (messages-dock.tsx, mounted in the app shell) listens for. Kept apart
 * from the panel so a button that opens it does not pull the panel, its
 * actions and their server code into its own module graph.
 */

/** What a page sends to open the panel on somebody (a profile's button). */
export const OPEN_MESSAGES_EVENT = "cyberlearn:open-messages";

export interface OpenMessagesDetail {
  userId: string;
  displayName: string;
  username: string | null;
}

/** Opens the messages panel on a conversation with somebody. */
export function openMessagesWith(detail: OpenMessagesDetail): void {
  window.dispatchEvent(new CustomEvent<OpenMessagesDetail>(OPEN_MESSAGES_EVENT, { detail }));
}
