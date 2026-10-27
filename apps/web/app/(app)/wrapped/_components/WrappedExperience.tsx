"use client";

import React from "react";
import type { WrappedPayload } from "@cyberlearn/lib";
import { WrappedShare } from "./WrappedClient";
import { WrappedStory } from "./story/WrappedStory";
import { ModalShell } from "@cyberlearn/ui";
import { BastionLogo } from "@/components/bastion-logo";

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
      <ModalShell open onClose={onClose} chrome="none" ariaLabel="Ton Wrapped">
        <div className="ws-root">
          <div className="ws-frame">
            <div className="ws-chrome">
              <span className="ws-brand">
                <BastionLogo size={28} /> CyberLearn
              </span>
            </div>
            <div className="ws-stage">
              <div className="ws-slide">
                <p className="ws-eyebrow">CyberLearn / Récap</p>
                <h1 className="ws-headline">Ton récap n’est pas encore disponible.</h1>
                <div className="ws-steps" style={{ borderTop: "none", padding: "20px 0 0" }}>
                  <button type="button" className="ws-step" onClick={onClose}>
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalShell>
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
