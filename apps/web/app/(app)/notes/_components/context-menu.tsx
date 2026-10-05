"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./context-menu.module.css";

/**
 * The library's right-click menu.
 *
 * Everything it offers is already somewhere on the page - the reader's toolbar,
 * the "Gérer" panel, a drag onto a folder - but each of those is a trip: open
 * the note to move it, open the panel to rename a folder. The menu puts the
 * actions where the pointer already is. It adds no action of its own, so a
 * reader who never right-clicks loses nothing, and the phone, which has no
 * pointer, keeps its buttons.
 *
 * It is a plain menu in the ARIA sense: one list, focus moved with the arrow
 * keys, Enter to pick, Escape or a click elsewhere to close, focus handed back
 * to what was right-clicked.
 */

export type MenuEntry =
  | {
      kind: "item";
      id: string;
      label: string;
      onSelect: () => void;
      /** Destructive: drawn in red, and always last in its group. */
      danger?: boolean;
      disabled?: boolean;
      /** A choice among several (the note's current folder). */
      checked?: boolean;
    }
  | { kind: "separator"; id: string }
  /** A heading over the items that follow. Not focusable. */
  | { kind: "label"; id: string; label: string }
  /** A row of small choices - colours, icons - each an item of its own. */
  | {
      kind: "swatches";
      id: string;
      label: string;
      options: { key: string; label: string; active: boolean; render: React.ReactNode }[];
      onPick: (key: string) => void;
    };

export interface MenuState {
  x: number;
  y: number;
  label: string;
  entries: MenuEntry[];
  /** What gets the focus back once the menu closes. */
  returnFocus: HTMLElement | null;
}

const MARGIN = 8;

/**
 * Where the menu goes: at the pointer, unless that would push it off screen,
 * in which case it opens to the left of or above the pointer - the way a
 * system menu does near a window's edge - and never closer than MARGIN.
 */
export function placeMenu(
  point: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number } {
  let left = point.x;
  let top = point.y;
  if (left + size.width > viewport.width - MARGIN) left = point.x - size.width;
  if (top + size.height > viewport.height - MARGIN) top = viewport.height - size.height - MARGIN;
  left = Math.max(MARGIN, Math.min(left, viewport.width - size.width - MARGIN));
  top = Math.max(MARGIN, top);
  return { left, top };
}

/**
 * Where a right-click should leave the browser's own menu alone: in a field
 * (paste, spelling), on a link (open in a new tab), over selected text (copy),
 * inside a dialog, and whenever Shift is held - the usual way out.
 */
export function keepsNativeMenu(event: { target: EventTarget | null; shiftKey: boolean }): boolean {
  if (event.shiftKey) return true;
  const target = event.target;
  if (!(target instanceof Element)) return true;
  if (
    target.closest('input, textarea, select, [contenteditable="true"], a[href], [role="dialog"]')
  ) {
    return true;
  }
  const selection = typeof window === "undefined" ? null : window.getSelection();
  return selection !== null && selection.toString().trim() !== "";
}

/**
 * The point to open at. A menu opened from the keyboard (the Menu key,
 * Shift+F10) comes with no pointer position, or a meaningless one: it then
 * opens under the element that has the focus.
 */
export function menuPoint(event: React.MouseEvent, anchor: Element): { x: number; y: number } {
  if (event.clientX !== 0 || event.clientY !== 0) return { x: event.clientX, y: event.clientY };
  const rect = anchor.getBoundingClientRect();
  return { x: rect.left + 12, y: rect.bottom - 4 };
}

export function useContextMenu(): {
  menu: MenuState | null;
  open: (state: MenuState) => void;
  close: () => void;
} {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const close = useCallback((): void => {
    setMenu((current) => {
      // Hand the focus back where it was, after this render: the element may be
      // the very card the menu was drawn over.
      const back = current?.returnFocus;
      if (back) {
        requestAnimationFrame(() => {
          if (back.isConnected) back.focus({ preventScroll: true });
        });
      }
      return null;
    });
  }, []);
  return { menu, open: setMenu, close };
}

export function ContextMenu({
  menu,
  onClose,
}: {
  menu: MenuState;
  onClose: () => void;
}): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // Measure once drawn, then place: the size depends on the entries.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPosition(
      placeMenu(
        { x: menu.x, y: menu.y },
        { width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [menu]);

  const focusables = useCallback(
    (): HTMLElement[] =>
      ref.current
        ? [
            ...ref.current.querySelectorAll<HTMLElement>(
              '[role^="menuitem"]:not([aria-disabled="true"])',
            ),
          ]
        : [],
    [],
  );

  useEffect(() => {
    if (position) focusables()[0]?.focus({ preventScroll: true });
  }, [position, focusables]);

  // Anything that moves the page from under the menu closes it: a click
  // elsewhere, a scroll, a resize, the window losing the focus.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (ref.current && event.target instanceof Node && ref.current.contains(event.target)) return;
      onClose();
    };
    const onScroll = (event: Event): void => {
      if (ref.current && event.target instanceof Node && ref.current.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const items = focusables();
    const index = items.findIndex((item) => item === document.activeElement);
    const go = (next: number): void => {
      event.preventDefault();
      items[Math.max(0, Math.min(items.length - 1, next))]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        go(index + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        go(index < 0 ? items.length - 1 : index - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(items.length - 1);
        break;
      case "Escape":
      case "Tab":
        event.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  const pick = (run: () => void): void => {
    onClose();
    run();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={menu.label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      style={{
        position: "fixed",
        left: position?.left ?? menu.x,
        top: position?.top ?? menu.y,
        // Hidden for the one frame it takes to measure, so it never flashes at
        // the wrong place.
        visibility: position ? "visible" : "hidden",
        zIndex: 80,
        minWidth: 220,
        maxWidth: 300,
        maxHeight: `calc(100vh - ${String(MARGIN * 2)}px)`,
        overflowY: "auto",
        padding: 4,
        background: "#0B0A2A",
        border: "1px solid var(--color-border-default)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        outline: "none",
      }}
    >
      {menu.entries.map((entry) => {
        switch (entry.kind) {
          case "separator":
            return (
              <div
                key={entry.id}
                role="separator"
                style={{ height: 1, background: "var(--color-border-subtle)", margin: "4px 2px" }}
              />
            );
          case "label":
            return (
              <div
                key={entry.id}
                role="presentation"
                style={{
                  padding: "8px 10px 4px",
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.label}
              </div>
            );
          case "swatches":
            return (
              <div
                key={entry.id}
                role="group"
                aria-label={entry.label}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  padding: "4px 10px 8px",
                }}
              >
                {entry.options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={option.active}
                    aria-label={option.label}
                    title={option.label}
                    tabIndex={-1}
                    className={styles.swatch}
                    onClick={() => {
                      pick(() => {
                        entry.onPick(option.key);
                      });
                    }}
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 24,
                      height: 24,
                      padding: 0,
                      background: option.active
                        ? "color-mix(in srgb, var(--cosmetic-accent) 18%, transparent)"
                        : "transparent",
                      border: `1px solid ${option.active ? "var(--cosmetic-accent)" : "var(--color-border-default)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {option.render}
                  </button>
                ))}
              </div>
            );
          case "item":
            return (
              <button
                key={entry.id}
                type="button"
                role={entry.checked === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={entry.checked}
                aria-disabled={entry.disabled === true ? true : undefined}
                tabIndex={-1}
                className={styles.item}
                data-danger={entry.danger === true ? "true" : undefined}
                onClick={() => {
                  if (entry.disabled === true) return;
                  pick(entry.onSelect);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  font: "inherit",
                  color:
                    entry.disabled === true
                      ? "#4A4775"
                      : entry.danger === true
                        ? "#FF6B7A"
                        : "#E6E4F0",
                  cursor: entry.disabled === true ? "default" : "pointer",
                }}
              >
                {entry.checked !== undefined ? (
                  <span aria-hidden="true" style={{ width: 10, color: "var(--cosmetic-accent)" }}>
                    {entry.checked ? "✓" : ""}
                  </span>
                ) : null}
                <span
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {entry.label}
                </span>
              </button>
            );
          default:
            return null;
        }
      })}
    </div>,
    document.body,
  );
}
