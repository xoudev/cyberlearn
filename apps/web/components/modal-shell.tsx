"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@cyberlearn/ui";

/**
 * The overlay every pop-up on the site is made of.
 *
 * It was extracted from the intro video's modal, which had grown the whole
 * behaviour a dialog needs - close on Escape, close on the backdrop, lock the
 * page behind it, put focus somewhere sensible on open, keep Tab inside -
 * written inline. Eight other pop-ups had each written their own copy of it,
 * none complete. This is the one copy.
 *
 * It owns the overlay, the frame and the behaviour; what goes inside is the
 * caller's. Three amounts of chrome: the framed panel with its header and
 * action row, the frame alone, or the overlay alone.
 */
export type ModalChrome = "panel" | "plain" | "none";

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  /** Small mono label above the title. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  /** A line under the title: a date, a count, who sent it. */
  meta?: React.ReactNode;
  /** Spoken name, when the visible title is not the whole story. */
  ariaLabel?: string;
  /** The id of the element in the content that names the dialog, instead of a label. */
  labelledBy?: string;
  /** Action row under the body, at its end. Omitted, no row is drawn. */
  actions?: React.ReactNode;
  /** Defaults to the video's width, which is the widest thing shown so far. */
  maxWidth?: number;
  /**
   * "panel" (the default): the frame, a header with the close button, the
   * action row. "plain": the frame alone, the content draws everything inside
   * it. "none": the overlay alone, the content is the whole thing.
   */
  chrome?: ModalChrome;
  /**
   * Escape and a click on the backdrop close it. Off, only the content's own
   * buttons do: a draft being edited, an upload in flight, a notice that must
   * be answered.
   */
  dismissable?: boolean;
  /** A coloured top edge on the frame. */
  accent?: string;
  /** A class on the frame, for a stylesheet scoped to the content. */
  className?: string;
  children: React.ReactNode;
}

/**
 * The dialogs open right now, bottom to top. Only the top one listens to the
 * keyboard: a reader with a share dialog over it must not close on the Escape
 * meant for the share dialog, nor pull Tab back out of it.
 */
const openDialogs: object[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside the dialog, wrapping at both ends. */
function trapTab(event: KeyboardEvent, root: HTMLElement): void {
  const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) {
    event.preventDefault();
    root.focus();
    return;
  }
  const active = document.activeElement;
  if (!root.contains(active)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export function ModalShell({
  open,
  onClose,
  eyebrow,
  title,
  meta,
  ariaLabel,
  labelledBy,
  actions,
  maxWidth = 1040,
  chrome = "panel",
  dismissable = true,
  accent,
  className,
  children,
}: ModalShellProps): React.ReactElement | null {
  const token = useRef<object>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Read at the time of the key press, so a caller passing a fresh arrow on
  // every render does not re-run the opening effect - which would put this
  // dialog back on top of one opened over it.
  const latest = useRef({ onClose, dismissable });
  useEffect(() => {
    latest.current = { onClose, dismissable };
  });

  useEffect(() => {
    if (!open) return;
    const me = token.current;
    openDialogs.push(me);

    const onKey = (event: KeyboardEvent): void => {
      if (openDialogs[openDialogs.length - 1] !== me) return;
      if (event.key === "Escape") {
        if (latest.current.dismissable) latest.current.onClose();
        return;
      }
      if (event.key === "Tab" && rootRef.current) trapTab(event, rootRef.current);
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (closeRef.current ?? rootRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      const at = openDialogs.lastIndexOf(me);
      if (at >= 0) openDialogs.splice(at, 1);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const name =
    labelledBy !== undefined
      ? { "aria-labelledby": labelledBy }
      : { "aria-label": ariaLabel ?? (typeof title === "string" ? title : "Fenêtre") };

  const onBackdrop = (): void => {
    if (dismissable) onClose();
  };

  // Without a frame there is no backdrop to click: the content is the whole
  // thing, and what a click on it does is its own business.
  if (chrome === "none") {
    return (
      <div
        ref={rootRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        {...name}
        className="modal-shell modal-shell--bare"
      >
        {children}
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" {...name} onClick={onBackdrop} className="modal-shell">
      <div
        ref={rootRef}
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={cn("modal-shell__frame", className)}
        style={{
          maxWidth,
          ...(accent !== undefined && { borderTop: `3px solid ${accent}` }),
        }}
      >
        {chrome === "panel" && (
          <div className="modal-shell__head">
            <div style={{ minWidth: 0 }}>
              {eyebrow !== undefined && <div className="modal-shell__eyebrow">{eyebrow}</div>}
              {title !== undefined && <div className="modal-shell__title">{title}</div>}
              {meta !== undefined && <div className="modal-shell__meta">{meta}</div>}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="modal-shell__close"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M3 3 L13 13 M13 3 L3 13" />
              </svg>
            </button>
          </div>
        )}

        <div className="modal-shell__body">{children}</div>

        {chrome === "panel" && actions !== undefined && (
          <div className="modal-shell__actions">{actions}</div>
        )}
      </div>
    </div>
  );
}
