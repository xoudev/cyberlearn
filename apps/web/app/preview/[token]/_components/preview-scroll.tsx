"use client";

import { useEffect } from "react";

/**
 * Keeps the author's place across refreshes.
 *
 * The editor reloads the preview after each pause in typing, and a reload
 * starts at the top: an author working on the fifth section would scroll back
 * down every few seconds. The position is kept per preview address in
 * sessionStorage, which is this tab's and goes with it.
 */
export function PreviewScroll(): null {
  useEffect(() => {
    const key = `lesson-preview-scroll:${window.location.pathname}`;
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved !== null) window.scrollTo(0, Number(saved));
    } catch {
      // Storage refused (private mode, quota): the preview still works, from the top.
    }

    let frame: number | null = null;
    const onScroll = (): void => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        try {
          window.sessionStorage.setItem(key, String(window.scrollY));
        } catch {
          // As above.
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
