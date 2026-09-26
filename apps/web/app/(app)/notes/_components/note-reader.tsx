"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { renderNoteMarkdown } from "@/lib/markdown/render-note";
import { downloadMarkdown, noteToMarkdown } from "@/lib/notes/export";
import { ShareDialog } from "./share-dialog";
import { CAT, type SerializedFolder, type SerializedNote } from "./notes-shared";
import { Select } from "@cyberlearn/ui";

interface NoteReaderProps {
  note: SerializedNote;
  folders: SerializedFolder[];
  onClose: () => void;
  /** Move the note to a folder (or out of any folder). Optimistic in the parent. */
  onMove: (folderId: string | null) => void;
  /** Persist edited content. Resolves true on success; parent updates the note. */
  onSaveContent: (content: string) => Promise<boolean>;
  /**
   * Set when somebody else wrote this note and handed it over. It is then read
   * only: a recipient holds a copy to read, not a copy to edit, and none of
   * editing, filing or re-sharing is theirs to do.
   */
  sharedBy?: string;
  /**
   * A received note only: takes it out of the reader's "Reçues". Resolves
   * true once done; the parent then closes the reader.
   */
  onDismiss?: () => Promise<boolean>;
}

export function NoteReader({
  note,
  folders,
  onClose,
  onMove,
  onSaveContent,
  sharedBy,
  onDismiss,
}: NoteReaderProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const mine = sharedBy === undefined;
  const [dismissing, setDismissing] = useState(false);
  const [dismissFailed, setDismissFailed] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const openedId = useRef(note.id);
  const cat = CAT[note.lessonCategory];

  // Reset the editor draft only when a DIFFERENT note is opened. Resetting on
  // every note.content change would clobber a live draft when a save flows the
  // content back through props (dropping characters typed during the round-trip).
  useEffect(() => {
    if (openedId.current !== note.id) {
      openedId.current = note.id;
      setEditing(false);
      setDraft(note.content);
    }
  }, [note.id, note.content]);

  // Move focus into the dialog when it opens (accessibility).
  useEffect(() => {
    panelRef.current?.focus();
  }, [note.id]);

  // Escape closes (unless editing, to protect the draft); Tab is trapped within
  // the dialog so keyboard focus cannot wander to the covered background.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // The share dialog is a modal of its own: while it is up it owns both
      // Escape and the focus ring, and a trap still running here would pull
      // the caret straight back out of it.
      if (sharing) return;
      if (e.key === "Escape" && !editing) {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        const active = document.activeElement;
        if (!panelRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [editing, sharing, onClose]);

  const save = (): void => {
    startTransition(() => {
      void onSaveContent(draft).then((ok) => {
        if (ok) setEditing(false);
      });
    });
  };

  const exportMd = (): void => {
    downloadMarkdown(
      note.lessonSlug,
      noteToMarkdown({
        lessonTitle: note.lessonTitle,
        lessonSlug: note.lessonSlug,
        pathTitle: note.pathTitle,
        categoryLabel: cat.label,
        content: note.content,
        updatedAt: note.updatedAt,
      }),
    );
  };

  const dateLabel = new Date(note.updatedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Note : ${note.lessonTitle}`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          display: "grid",
          placeItems: "center",
          padding: "clamp(12px,4vw,40px)",
          background: "rgba(2,1,14,0.72)",
          backdropFilter: "blur(4px)",
        }}
        onClick={() => {
          // Match the Escape behaviour: do not discard an in-progress edit on a
          // stray backdrop click.
          if (!editing) onClose();
        }}
      >
        <style>{READER_CSS}</style>
        <div
          ref={panelRef}
          tabIndex={-1}
          className="note-reader"
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            width: "min(760px, 100%)",
            maxHeight: "100%",
            background: "#08061c",
            border: `1px solid ${cat.color}44`,
            borderTop: `3px solid ${cat.color}`,
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: "20px 22px 16px",
              borderBottom: "1px solid #1F1B47",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: cat.color,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color }}
                />
                {cat.label}
                {note.pathTitle ? (
                  <span style={{ color: "#7F7BA9" }}>· {note.pathTitle}</span>
                ) : null}
              </span>
              <h2
                style={{
                  margin: "8px 0 0",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 800,
                  fontSize: "clamp(20px,3vw,26px)",
                  letterSpacing: "-0.02em",
                  color: "#F5F5FA",
                  lineHeight: 1.2,
                }}
              >
                {note.lessonTitle}
              </h2>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#7F7BA9",
                }}
              >
                maj {dateLabel} · {note.wordCount} mot{note.wordCount > 1 ? "s" : ""}
                {sharedBy !== undefined ? (
                  <>
                    {" · "}
                    <span style={{ color: "var(--cosmetic-accent)" }}>partagée par {sharedBy}</span>
                  </>
                ) : null}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" style={iconBtn}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                aria-hidden="true"
              >
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderBottom: "1px solid #1F1B47",
            }}
          >
            {mine && (
              <button
                type="button"
                onClick={() => {
                  if (editing) {
                    setDraft(note.content);
                    setEditing(false);
                  } else {
                    setEditing(true);
                  }
                }}
                style={toolBtn(editing)}
              >
                {editing ? "Annuler" : "Modifier"}
              </button>
            )}
            {editing && (
              <button type="button" onClick={save} disabled={pending} style={primaryBtn(pending)}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            )}
            {mine && !editing && (
              <button
                type="button"
                onClick={() => {
                  setSharing(true);
                }}
                style={toolBtn(false)}
              >
                Partager
              </button>
            )}
            <button type="button" onClick={exportMd} style={toolBtn(false)}>
              Exporter .md
            </button>
            {/* A received note can hold anything its author wrote: the reader
                can at least take it out of their list, where it was put. */}
            {!mine && onDismiss ? (
              <button
                type="button"
                disabled={dismissing}
                onClick={() => {
                  setDismissing(true);
                  setDismissFailed(false);
                  void onDismiss().then((ok) => {
                    setDismissing(false);
                    if (!ok) setDismissFailed(true);
                  });
                }}
                style={toolBtn(false)}
              >
                {dismissing ? "…" : "Masquer cette note"}
              </button>
            ) : null}
            {dismissFailed ? (
              <span
                role="alert"
                style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#FF4757" }}
              >
                Impossible de la masquer, réessaie.
              </span>
            ) : null}
            {mine ? (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#7F7BA9",
                }}
              >
                Dossier
                <Select
                  block={false}
                  aria-label="Dossier"
                  style={{ maxWidth: 180 }}
                  triggerStyle={{ fontSize: 12, padding: "6px 8px" }}
                  value={note.folderId ?? ""}
                  options={[
                    { value: "", label: "Sans dossier" },
                    ...folders.map((f) => ({ value: f.id, label: f.name })),
                  ]}
                  onChange={(next) => {
                    onMove(next === "" ? null : next);
                  }}
                />
              </label>
            ) : null}
          </div>

          {/* Body */}
          <div style={{ overflowY: "auto", padding: "20px 22px", flex: 1 }}>
            {editing ? (
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                }}
                spellCheck={false}
                autoFocus
                // Lock input while the save round-trip is in flight so no keystroke
                // is lost when the saved content flows back through props.
                disabled={pending}
                style={{
                  width: "100%",
                  minHeight: 320,
                  resize: "vertical",
                  background: "rgba(5,4,26,0.5)",
                  border: "1px solid #2A2560",
                  color: "#E6E4F0",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  padding: 14,
                  outline: "none",
                  opacity: pending ? 0.6 : 1,
                }}
              />
            ) : note.content.trim() === "" ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#7F7BA9" }}>
                Note vide.
              </p>
            ) : (
              <div className="note-md">{renderNoteMarkdown(note.content)}</div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "14px 22px",
              borderTop: "1px solid #1F1B47",
            }}
          >
            <Link
              href={`/lessons/${note.lessonSlug}`}
              style={{ ...toolBtn(false), textDecoration: "none" }}
            >
              Ouvrir la leçon →
            </Link>
          </div>
        </div>
      </div>

      {sharing && (
        <ShareDialog
          noteId={note.id}
          lessonTitle={note.lessonTitle}
          onClose={() => {
            setSharing(false);
          }}
        />
      )}
    </>
  );
}

const iconBtn: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 30,
  height: 30,
  flexShrink: 0,
  background: "transparent",
  border: "1px solid #2A2560",
  color: "#8B88A8",
  cursor: "pointer",
  borderRadius: 2,
};

function toolBtn(active: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: active ? "#05041A" : "#B8B5D1",
    background: active ? "var(--cosmetic-accent)" : "transparent",
    border: `1px solid ${active ? "var(--cosmetic-accent)" : "#2A2560"}`,
    padding: "8px 12px",
    cursor: "pointer",
  };
}

function primaryBtn(pending: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#05041A",
    background: "var(--cosmetic-accent)",
    border: "1px solid var(--cosmetic-accent)",
    padding: "8px 12px",
    cursor: pending ? "wait" : "pointer",
    opacity: pending ? 0.7 : 1,
  };
}

// Scoped styling for rendered note markdown.
const READER_CSS = `
.note-md { font-family: var(--font-body); font-size: 14.5px; line-height: 1.7; color: #D6D3E8; }
.note-md > :first-child { margin-top: 0; }
.note-md h1, .note-md h2, .note-md h3, .note-md h4, .note-md h5, .note-md h6 {
  font-family: var(--font-sans); color: #F5F5FA; font-weight: 700; line-height: 1.3;
  margin: 22px 0 10px; letter-spacing: -0.01em;
}
.note-md h1 { font-size: 22px; }
.note-md h2 { font-size: 19px; }
.note-md h3 { font-size: 16.5px; }
.note-md h4, .note-md h5, .note-md h6 { font-size: 14.5px; }
.note-md p { margin: 0 0 12px; }
.note-md ul, .note-md ol { margin: 0 0 12px; padding-left: 24px; }
.note-md ul { list-style: disc; }
.note-md ol { list-style: decimal; }
.note-md li { margin: 4px 0; }
.note-md li::marker { color: var(--cosmetic-accent); }
.note-md a { color: var(--cosmetic-accent); text-decoration: underline; text-underline-offset: 2px; }
.note-md code {
  font-family: var(--font-mono); font-size: 0.88em; background: color-mix(in srgb, var(--cosmetic-accent) 8%, transparent);
  border: 1px solid #2A2560; border-radius: 3px; padding: 1px 5px; color: #B8FBEB;
}
.note-md pre {
  background: var(--cosmetic-terminal-bg); border: 1px solid #1F1B47; border-radius: 4px;
  padding: 14px 16px; overflow-x: auto; margin: 0 0 14px;
}
.note-md pre code {
  background: none; border: none; padding: 0; color: var(--cosmetic-terminal-fg);
  font-size: 12.5px; line-height: 1.6;
}
.note-md blockquote {
  margin: 0 0 12px; padding: 4px 14px; border-left: 3px solid var(--cosmetic-accent);
  color: #B8B5D1; background: color-mix(in srgb, var(--cosmetic-accent) 4%, transparent);
}
.note-md hr { border: none; border-top: 1px solid #2A2560; margin: 18px 0; }
`;
