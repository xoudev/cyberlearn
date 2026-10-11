"use client";

import React, { useId, useInsertionEffect, useLayoutEffect, useRef } from "react";
import { cn } from "../lib/utils.js";
import { ModalShell } from "./modal-shell.js";

/**
 * A panel against the right edge of the window: a header with its name and a
 * close button, the caller's content, a line at the bottom.
 *
 * It was the settings drawer's frame, drawn for the settings alone. Other
 * windows of the site want the same panel (the release notes, a support
 * ticket, the notes of a lesson), so it is drawn once here, with its classes
 * in dialogs.css.
 *
 * Two ways to sit beside the page:
 * - modal (the default): over the page, which is dimmed behind it, held still
 *   and out of reach of Tab. It is a ModalShell without chrome, so it gets
 *   Escape, the focus kept inside and the dialogs opened over it from there.
 * - docked (`modal={false}`): no backdrop, no lock, no trap. The page stays in
 *   use beside it: a reader can scroll, type and click there while it is open.
 *   Escape closes it when the focus is in it, not when the key belongs to the
 *   page.
 *
 * Either way the focus moves into it when it opens and goes back to what
 * opened it when it closes, unless the reader has since put it somewhere else
 * in the page, or the caller says not to (`returnFocus={false}`).
 */
export interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The name in the header, which is also what a screen reader calls it. */
  title: React.ReactNode;
  /** At the end of the header, before the close button: whose it is, a count. */
  meta?: React.ReactNode;
  /** The close button's spoken name. */
  closeLabel?: string;
  /** The line at the bottom. Left out, the Escape hint; null, no line. */
  footer?: React.ReactNode;
  /** Over the page (the default), or docked beside it. */
  modal?: boolean;
  /**
   * Whether closing it gives the focus back to what opened it: read when it
   * closes, from the render that closes it. False when it closes because the
   * page changed under it: the opener may still be there (the navbar's gear),
   * but a new page is read from its start.
   */
  returnFocus?: boolean;
  /** The panel's width in pixels, the window's at most. Defaults to the settings'. */
  width?: number;
  /** A class on the panel, for a stylesheet scoped to the content. */
  className?: string;
  children: React.ReactNode;
}

export function SideDrawer({
  open,
  onClose,
  title,
  meta,
  closeLabel = "Fermer",
  footer,
  modal = true,
  returnFocus = true,
  width = 680,
  className,
  children,
}: SideDrawerProps): React.ReactElement | null {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  // An insertion effect runs before the layout effects' cleanups of the same
  // commit, so the cleanup below reads the value of the render that closed it.
  const returnFocusRef = useRef(returnFocus);
  useInsertionEffect(() => {
    returnFocusRef.current = returnFocus;
  });

  // A layout effect: it runs before ModalShell's own effect moves the focus,
  // while the focus is still on what opened the drawer.
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Modal, the panel sits in ModalShell's root, which takes the focus itself.
    const frame = modal ? (panel?.parentElement ?? null) : panel;
    if (!modal) panel?.focus({ preventScroll: true });
    return () => {
      if (!returnFocusRef.current) return;
      const active = document.activeElement;
      const lost = active === null || active === document.body;
      const ours = frame !== null && active !== null && frame.contains(active);
      if (opener?.isConnected && (lost || ours)) opener.focus();
    };
  }, [open, modal]);

  if (!open) return null;

  const style = { width: `min(${String(width)}px, 100%)` };
  const inside = (
    <>
      <header className="side-drawer__head">
        <span className="side-drawer__dot" aria-hidden="true" />
        <span id={titleId}>{title}</span>
        {meta !== undefined && meta !== null && meta !== "" && (
          <span className="side-drawer__meta">{meta}</span>
        )}
        <button
          type="button"
          className="side-drawer__close"
          onClick={onClose}
          aria-label={closeLabel}
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
      <div className="side-drawer__body">{children}</div>
      {footer === undefined ? (
        <footer className="side-drawer__foot">
          <span>Échap pour fermer</span>
        </footer>
      ) : (
        footer !== null && <footer className="side-drawer__foot">{footer}</footer>
      )}
    </>
  );

  if (!modal) {
    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // A dialog opened from inside the drawer answers its own Escape.
      if (
        event.target instanceof Element &&
        event.target.closest('[role="dialog"]') !== event.currentTarget
      ) {
        return;
      }
      onClose();
    };
    return (
      <section
        ref={panelRef}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn("side-drawer side-drawer--docked", className)}
        style={style}
      >
        {inside}
      </section>
    );
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      chrome="none"
      labelledBy={titleId}
      className="side-drawer-root"
    >
      <div className="side-drawer__backdrop" aria-hidden="true" onClick={onClose} />
      <aside ref={panelRef} className={cn("side-drawer", className)} style={style}>
        {inside}
      </aside>
    </ModalShell>
  );
}
