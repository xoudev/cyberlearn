"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { VideoModal } from "@/components/video-modal";

const SEEN_KEY = "cl-welcome-seen";

/**
 * Plays the onboarding video once, the first time a freshly-onboarded user
 * lands on the dashboard. "Seen" is tracked per-browser in localStorage so it
 * never nags on later visits; a per-account flag can replace this later.
 *
 * Its button is the mission card's: the lesson the leading path offers first
 * (past the ones the placement test waived), or the paths to choose from when
 * there is none. It used to say "Lancer ma première leçon" and open the
 * catalogue, leaving the newcomer to pick one. Web-only: the app greets a
 * newcomer with its tour instead (docs/MOBILE_PARITY.md).
 */
export function WelcomeModal({
  cta,
}: {
  cta: { href: string; label: string };
}): React.ReactElement | null {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // Private mode / storage disabled: skip the welcome rather than loop it.
    }
  }, []);

  function dismiss(): void {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <VideoModal
      open={open}
      onClose={dismiss}
      src="/videos/welcome.mp4"
      poster="/videos/welcome-poster.jpg"
      eyebrow="Bienvenue"
      title="Bienvenue sur CyberLearn"
      actions={
        <>
          <Link className="btn" href={cta.href} onClick={dismiss}>
            {cta.label} →
          </Link>
          <button className="btn btn--ghost" type="button" onClick={dismiss}>
            Passer
          </button>
        </>
      }
    />
  );
}
