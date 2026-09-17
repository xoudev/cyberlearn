"use client";

import React, { useTransition } from "react";
import { moderateTopicAction } from "../_actions/forum-actions";

/** Pinning and closing: shown to administrators, refused to everyone else
 *  server-side as well, since a hidden button is not a permission check. */
export function TopicTools({
  topicId,
  pinned,
  locked,
  path,
}: {
  topicId: string;
  pinned: boolean;
  locked: boolean;
  path: string;
}): React.JSX.Element {
  const [pending, start] = useTransition();

  const run = (patch: { pinned?: boolean; locked?: boolean }): void => {
    start(() => {
      void moderateTopicAction({ topicId, path, ...patch });
    });
  };

  return (
    <div className="fo-post-tools">
      <button
        type="button"
        className="fo-btn"
        disabled={pending}
        onClick={() => {
          run({ pinned: !pinned });
        }}
      >
        {pinned ? "Désépingler" : "Épingler"}
      </button>
      <button
        type="button"
        className="fo-btn"
        disabled={pending}
        onClick={() => {
          run({ locked: !locked });
        }}
      >
        {locked ? "Rouvrir" : "Fermer"}
      </button>
    </div>
  );
}
