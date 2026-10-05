"use client";

import React, { useEffect, type RefObject } from "react";

/**
 * The navbar's panels, the friends and the bell: one button and one way of
 * closing. Each panel used to carry its own copy of the trigger (36 pixels,
 * lit while open, a count in the corner) and of the click-outside effect,
 * and the badge was a class on one and a style object on the other.
 */
export function PanelButton({
  open,
  label,
  count,
  onClick,
  buttonRef,
  children,
}: {
  open: boolean;
  label: string;
  /** Drawn in the corner while above zero; "99+" past that. */
  count: number;
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={open}
      className={`notif-bell panel-button${open ? " panel-button--open" : ""}`}
    >
      {children}
      {count > 0 && (
        <span aria-hidden="true" className="navbar-badge">
          {count > 99 ? "99+" : String(count)}
        </span>
      )}
    </button>
  );
}

/** Closes the panel on a click outside of it and of its button. */
export function useClickOutside(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  buttonRef: RefObject<HTMLElement | null>,
  setOpen: (open: boolean) => void,
): void {
  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
    };
  }, [open, panelRef, buttonRef, setOpen]);
}
