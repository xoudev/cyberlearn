"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { VideoModal } from "@/components/video-modal";

const SEEN_KEY = "cl-welcome-seen";

/**
 * Plays the onboarding video once, the first time a freshly-onboarded user
 * lands on the dashboard. "Seen" is tracked per-browser in localStorage so it
 * never nags on later visits; a per-account flag can replace this later.
 */
export function WelcomeModal(): React.ReactElement | null {
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
          <Link
            href="/lessons"
            onClick={dismiss}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 22px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "#0024FF",
              border: "1px solid #0024FF",
              color: "#fff",
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(0,36,255,0.4)",
            }}
          >
            Lancer ma première leçon →
          </Link>
          <button
            type="button"
            onClick={dismiss}
            style={{
              padding: "13px 20px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#B8B5D1",
              cursor: "pointer",
            }}
          >
            Passer
          </button>
        </>
      }
    />
  );
}
