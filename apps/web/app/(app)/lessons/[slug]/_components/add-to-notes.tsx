"use client";

// Client boundary: it follows the reader's text selection on the page.

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ADD_TO_NOTES_EVENT, ADD_TO_NOTES_TARGET_ATTR, detailString } from "@/lib/site-events";

/** The longest passage taken at once: a paragraph or two, not the lesson. */
export const QUOTE_MAX = 2_000;

/** A passage as a markdown quote, followed by where it comes from. */
export function quoteMarkdown(text: string, source: string): string {
  const body = text
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, QUOTE_MAX)
    .split("\n")
    .map((line) => (line.trim() ? `> ${line.trim()}` : ">"))
    .join("\n");
  return source ? `${body}\n>\n> Source : *${source.replace(/\*/g, "")}*` : body;
}

/**
 * "Ajouter à mes notes": select a passage of the lesson and a button appears
 * just above it; one click adds it, quoted with its section's name, to the
 * end of the lesson's note. Only for text inside the lesson itself
 * (`.lesson-content`), never for a field or the notes drawer.
 */
export function AddToNotes({ onAdd }: { onAdd: (text: string) => void }): React.JSX.Element | null {
  const [spot, setSpot] = useState<{ x: number; y: number; text: string } | null>(null);
  const timer = useRef<number | null>(null);
  const onAddRef = useRef(onAdd);
  useEffect(() => {
    onAddRef.current = onAdd;
  });

  // The site's right-click menu offers "Ajouter à mes notes" on a selection in
  // the lesson: it looks for this marker, then sends the passage here.
  useEffect(() => {
    document.body.setAttribute(ADD_TO_NOTES_TARGET_ATTR, "");
    const onRequest = (event: Event): void => {
      const text = detailString(event, "text")?.trim();
      if (text) onAddRef.current(text);
    };
    window.addEventListener(ADD_TO_NOTES_EVENT, onRequest);
    return () => {
      document.body.removeAttribute(ADD_TO_NOTES_TARGET_ATTR);
      window.removeEventListener(ADD_TO_NOTES_EVENT, onRequest);
    };
  }, []);

  useEffect(() => {
    const read = (): void => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSpot(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const el = node instanceof Element ? node : node.parentElement;
      if (
        !el?.closest(".lesson-content") ||
        el.closest("input, textarea, [contenteditable='true']")
      ) {
        setSpot(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 3) {
        setSpot(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSpot({
        x: Math.min(Math.max(rect.left + rect.width / 2, 90), window.innerWidth - 90),
        y: Math.max(rect.top - 8, 56),
        text,
      });
    };
    const onChange = (): void => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(read, 180);
    };
    const hide = (): void => {
      setSpot(null);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setSpot(null);
    };
    document.addEventListener("selectionchange", onChange);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("selectionchange", onChange);
      window.removeEventListener("scroll", hide, { capture: true });
      document.removeEventListener("keydown", onKey);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  if (!spot) return null;
  return createPortal(
    <button
      type="button"
      className="add-to-notes"
      style={{ left: spot.x, top: spot.y }}
      // Keep the selection: the button reads it on click.
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={() => {
        onAdd(spot.text);
        window.getSelection()?.removeAllRanges();
        setSpot(null);
      }}
    >
      <span aria-hidden="true">＋</span> Ajouter à mes notes
    </button>,
    document.body,
  );
}
