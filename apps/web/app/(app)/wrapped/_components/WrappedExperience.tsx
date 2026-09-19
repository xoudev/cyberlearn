"use client";

import React from "react";
import type { WrappedPayload } from "@cyberlearn/lib";
import { WrappedShare } from "./WrappedClient";
import { WrappedStory } from "./story/WrappedStory";

/**
 * One recap, two ways in: the chip in the navbar and a direct link to
 * /wrapped. Both land here, so neither can drift into being a different
 * Wrapped from the other.
 */
export function WrappedExperience({
  payload,
  handle,
  onClose,
}: {
  payload: WrappedPayload | null;
  handle: string;
  onClose: () => void;
}): React.JSX.Element {
  if (!payload) {
    return (
      <div className="ws-root" role="dialog" aria-modal="true" aria-label="Ton Wrapped">
        <div className="ws-frame">
          <div className="ws-stage">
            <p className="ws-eyebrow">Cyber Learn · Récap</p>
            <p className="ws-lead">Ton récap n’est pas encore disponible.</p>
            <div className="ws-steps" style={{ borderTop: "none", padding: "20px 0 0" }}>
              <button type="button" className="ws-step" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WrappedStory
      payload={payload}
      onClose={onClose}
      share={<WrappedShare payload={payload} handle={handle} />}
    />
  );
}
