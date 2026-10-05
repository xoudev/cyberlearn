"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { renderNoteMarkdown } from "@/lib/markdown/render-note";
import { downloadMarkdown, noteToMarkdown } from "@/lib/notes/export";
import { ReportNoteForm } from "./report-note-form";
import { ShareDialog } from "./share-dialog";
import { ModalShell } from "@/components/modal-shell";
import { CAT, type SerializedFolder, type SerializedNote } from "./notes-shared";
import { Select } from "@cyberlearn/ui";
import type { NoteReportReasonKey } from "@cyberlearn/lib/notes/report-reasons";

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
  /**
   * A received note only: reports it to the team. Resolves with the service's
   * answer; on success the parent closes the reader, the note having left the
   * reader's list.
   */
  onReport?: (input: {
    reason: NoteReportReasonKey;
    comment: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  /**
   * What the reader opens on: the note itself, or straight into one of its
   * actions - how the library's right-click menu lands on "Modifier",
   * "Partager" or "Signaler" without a second click.
   */
  initialMode?: ReaderMode;
}

export type ReaderMode = "read" | "edit" | "share" | "report";

export function NoteReader({
  note,
  folders,
  onClose,
  onMove,
  onSaveContent,
  sharedBy,
  onDismiss,
  onReport,
  initialMode = "read",
}: NoteReaderProps): React.JSX.Element {
  const mine = sharedBy === undefined;
  // Editing and sharing are the owner's; reporting is the recipient's.
  const [editing, setEditing] = useState(mine && initialMode === "edit");
  const [sharing, setSharing] = useState(mine && initialMode === "share");
  const [dismissing, setDismissing] = useState(false);
  const [dismissFailed, setDismissFailed] = useState(false);
  const [reporting, setReporting] = useState(!mine && initialMode === "report");
  const [draft, setDraft] = useState(note.content);
  const [pending, startTransition] = useTransition();
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

  const eyebrow = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: cat.color }}>
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color }}
      />
      {cat.label}
      {note.pathTitle ? (
        <span style={{ color: "var(--color-text-muted)" }}>· {note.pathTitle}</span>
      ) : null}
    </span>
  );

  const meta = (
    <>
      maj {dateLabel} · {note.wordCount} mot{note.wordCount > 1 ? "s" : ""}
      {sharedBy !== undefined ? (
        <>
          {" · "}
          <span style={{ color: "var(--cosmetic-accent)" }}>partagée par {sharedBy}</span>
        </>
      ) : null}
    </>
  );

  // Escape and the backdrop keep their hands off a draft being edited.
  return (
    <>
      <ModalShell
        open
        onClose={onClose}
        dismissable={!editing}
        ariaLabel={`Note : ${note.lessonTitle}`}
        eyebrow={eyebrow}
        title={note.lessonTitle}
        meta={meta}
        accent={cat.color}
        maxWidth={760}
        className="note-reader"
        actions={
          <Link
            href={`/lessons/${note.lessonSlug}`}
            style={{ ...toolBtn(false), textDecoration: "none" }}
          >
            Ouvrir la leçon →
          </Link>
        }
      >
        <style>{READER_CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderBottom: "1px solid var(--color-border-subtle)",
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
            {!mine && onReport ? (
              <button
                type="button"
                aria-expanded={reporting}
                onClick={() => {
                  setReporting((open) => !open);
                }}
                style={{ ...toolBtn(reporting), color: "#FF6B78" }}
              >
                Signaler
              </button>
            ) : null}
            {dismissFailed ? (
              <span
                role="alert"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--color-category-cybersec)",
                }}
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
                  color: "var(--color-text-muted)",
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
          {reporting && onReport ? (
            <ReportNoteForm
              onSubmit={onReport}
              onCancel={() => {
                setReporting(false);
              }}
            />
          ) : null}
          <div style={{ padding: "20px 22px", flex: 1 }}>
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
                  border: "1px solid var(--color-border-default)",
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
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                }}
              >
                Note vide.
              </p>
            ) : (
              <div className="note-md">{renderNoteMarkdown(note.content)}</div>
            )}
          </div>
        </div>
      </ModalShell>

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

function toolBtn(active: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: active ? "var(--color-bg-sunken)" : "var(--color-text-secondary)",
    background: active ? "var(--cosmetic-accent)" : "transparent",
    border: `1px solid ${active ? "var(--cosmetic-accent)" : "var(--color-border-default)"}`,
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
    color: "var(--color-bg-sunken)",
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
  font-family: var(--font-sans); color: var(--color-text-primary); font-weight: 700; line-height: 1.3;
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
  border: 1px solid var(--color-border-default); border-radius: 3px; padding: 1px 5px; color: #B8FBEB;
}
.note-md pre {
  background: var(--cosmetic-terminal-bg); border: 1px solid var(--color-border-subtle); border-radius: 4px;
  padding: 14px 16px; overflow-x: auto; margin: 0 0 14px;
}
.note-md pre code {
  background: none; border: none; padding: 0; color: var(--cosmetic-terminal-fg);
  font-size: 12.5px; line-height: 1.6;
}
.note-md blockquote {
  margin: 0 0 12px; padding: 4px 14px; border-left: 3px solid var(--cosmetic-accent);
  color: var(--color-text-secondary); background: color-mix(in srgb, var(--cosmetic-accent) 4%, transparent);
}
.note-md hr { border: none; border-top: 1px solid var(--color-border-default); margin: 18px 0; }
`;
