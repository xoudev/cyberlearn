"use client";

// Client boundary: selection, multi-selection and drag sources are local state.

import React from "react";
import { timeAgo } from "@cyberlearn/lib/notes/preview";
import { richExcerpt } from "@cyberlearn/lib/notes/rich-markdown";
import { folderPath } from "@cyberlearn/lib/notes/workspace";
import { CheckBox } from "@/lib/markdown/render-rich-note";
import { keepsNativeMenu, menuPoint } from "@/components/context-menu/context-menu";
import { writeDrag } from "./folder-tree";
import { CAT, type SerializedFolder, type SerializedNote } from "./notes-shared";

interface NoteListProps {
  notes: readonly SerializedNote[];
  folders: readonly SerializedFolder[];
  selectedId: string | null;
  checked: ReadonlySet<string>;
  now: number | null;
  /** In the trash: no drag, the date it goes is shown instead. */
  trash?: boolean;
  trashDays?: number;
  onOpen: (noteId: string) => void;
  /** Ctrl/Cmd-click toggles one, Shift-click extends from the last pick. */
  onCheck: (noteId: string, mode: "toggle" | "range") => void;
  onMenu: (point: { x: number; y: number }, anchor: HTMLElement, note: SerializedNote) => void;
  empty: React.ReactNode;
}

/** Days left before a trashed note is purged. */
function daysLeft(deletedAt: string, trashDays: number, now: number | null): number {
  const gone = new Date(deletedAt).getTime() + trashDays * 86_400_000;
  return Math.max(0, Math.ceil((gone - (now ?? Date.now())) / 86_400_000));
}

/**
 * The middle column: the notes of the current view, pinned first. A click
 * opens one; Ctrl/Cmd-click and Shift-click select several, and the box on
 * each row does the same for the keyboard and the touch screen. Dragging a
 * selected row drags the whole selection.
 */
export function NoteList({
  notes,
  folders,
  selectedId,
  checked,
  now,
  trash = false,
  trashDays = 30,
  onOpen,
  onCheck,
  onMenu,
  empty,
}: NoteListProps): React.JSX.Element {
  if (notes.length === 0) return <div className="nw-list__empty">{empty}</div>;
  return (
    <ul className="nw-list" aria-label="Notes">
      {notes.map((note) => {
        const isChecked = checked.has(note.id);
        const cat = note.lessonCategory ? CAT[note.lessonCategory] : null;
        const path = folderPath(folders, note.folderId);
        return (
          <li
            key={note.id}
            className="nw-row"
            data-active={selectedId === note.id ? "true" : undefined}
            data-checked={isChecked ? "true" : undefined}
            draggable={!trash}
            onDragStart={(e) => {
              const ids = isChecked && checked.size > 1 ? [...checked] : [note.id];
              writeDrag(e, { kind: "notes", ids });
            }}
            onContextMenu={(e) => {
              if (keepsNativeMenu(e)) return;
              e.preventDefault();
              onMenu(menuPoint(e, e.currentTarget), e.currentTarget, note);
            }}
          >
            <CheckBox
              className="rnote-check nw-row__check"
              checked={isChecked}
              label={`Sélectionner ${note.title}`}
              onChange={(e) => {
                const native = e.nativeEvent;
                onCheck(
                  note.id,
                  native instanceof MouseEvent && native.shiftKey ? "range" : "toggle",
                );
              }}
            />
            <button
              type="button"
              className="nw-row__open"
              aria-current={selectedId === note.id ? "true" : undefined}
              onClick={(e) => {
                if (e.shiftKey) {
                  onCheck(note.id, "range");
                } else if (e.metaKey || e.ctrlKey) {
                  onCheck(note.id, "toggle");
                } else {
                  onOpen(note.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  onMenu({ x: r.left + 16, y: r.bottom }, e.currentTarget, note);
                }
              }}
            >
              <span className="nw-row__top">
                {note.pinned ? (
                  <span className="nw-row__pin" aria-label="Épinglée" title="Épinglée">
                    ◆
                  </span>
                ) : null}
                <span className="nw-row__title">{note.title}</span>
              </span>
              <span className="nw-row__excerpt">{richExcerpt(note.content) || "Note vide"}</span>
              <span className="nw-row__meta">
                {cat ? (
                  <span className="nw-row__lesson" style={{ color: cat.color }}>
                    <span className="nw-dot" style={{ background: cat.color }} aria-hidden="true" />
                    {note.lessonTitle}
                  </span>
                ) : (
                  <span className="nw-row__free">Note libre</span>
                )}
                {path.length > 0 ? <span className="nw-row__path">{path.join(" / ")}</span> : null}
                <span className="nw-row__time">
                  {trash && note.deletedAt
                    ? `supprimée dans ${String(daysLeft(note.deletedAt, trashDays, now))} j`
                    : timeAgo(note.updatedAt, now)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
