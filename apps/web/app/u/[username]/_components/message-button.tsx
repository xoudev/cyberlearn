"use client";

// "use client" justified: the button opens the messages panel, which lives in
// the app shell, through a window event.

import React from "react";
import { openMessagesWith } from "@/components/messages/open-messages";

/**
 * « Envoyer un message » on somebody's profile: opens the messages panel on
 * the conversation with them, or on a first message. Whether it goes straight
 * to them or into their requests is decided when it is sent.
 */
export function MessageButton({
  userId,
  displayName,
  username,
}: {
  userId: string;
  displayName: string;
  username: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={() => {
        openMessagesWith({ userId, displayName, username });
      }}
    >
      Envoyer un message
    </button>
  );
}
