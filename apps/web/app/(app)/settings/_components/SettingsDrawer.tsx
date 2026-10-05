"use client";

// "use client" justification: the drawer closes on Escape, on its backdrop
// and on its button through the router, and locks the page's scroll while
// it is open.

import React, { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SettingsNav } from "./SettingsNav";
import { settingsHref } from "./sections";

/**
 * The settings as a drawer over the page, opened from the navbar's gear.
 *
 * The settings used to be a destination: a page with a hero, a side nav and
 * the content, which is a lot of travel to flip a switch. The drawer shows
 * the same sections and the same forms over whatever the reader was doing,
 * and closes back onto it. The address is still /settings/<section>, so a
 * reload, a bookmark or a shared link opens the full page.
 *
 * Switching sections replaces the history entry rather than pushing one, so
 * that closing always goes back to the page the drawer opened over.
 */
export function SettingsDrawer({
  section,
  username,
  children,
}: {
  section: string;
  username: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const closeButton = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    closeButton.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);

  return (
    <div className="settings-drawer-root">
      <div className="settings-drawer-backdrop" aria-hidden="true" onClick={close} />
      <aside
        className="settings-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-drawer-title"
      >
        <header className="settings-drawer-head">
          <span className="settings-drawer-dot" aria-hidden="true" />
          <span id="settings-drawer-title">Paramètres</span>
          <span className="settings-drawer-user">@{username}</span>
          <button
            ref={closeButton}
            type="button"
            className="settings-drawer-close"
            onClick={close}
            aria-label="Fermer les paramètres"
            title="Fermer (Échap)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>
        <div className="settings-drawer-body">
          <div className="settings-drawer-nav">
            <SettingsNav replace sticky={false} />
          </div>
          <div className="settings-drawer-content">{children}</div>
        </div>
        <footer className="settings-drawer-foot">
          <span>Échap pour fermer</span>
          {/* A plain link, not the router's: it leaves the drawer for the page. */}
          <a href={settingsHref(section)}>Ouvrir la page complète →</a>
        </footer>
      </aside>
    </div>
  );
}
