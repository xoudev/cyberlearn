"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SideDrawer } from "@cyberlearn/ui";
import { saveNoteAction } from "@/app/(app)/notes/_actions/note-actions";
import { useMediaQuery } from "@/hooks/use-media-query";
import { NOTE_CONTENT_MAX } from "@/lib/notes/limits";

/**
 * From this width the notes sit beside the lesson instead of over it: there is
 * room for the drawer and for a column of text, so the reader can read and
 * write at once. Below it, the drawer covers the page like any other.
 */
export const NOTES_DOCKED_QUERY = "(min-width: 1440px)";

/**
 * The drawer's widths, in pixels. Docked, the wide one is narrower than over
 * the page: the lesson still needs a column beside it. globals.css carries a
 * copy of the docked widths, the room it leaves the drawer on the right.
 */
export const NOTE_DRAWER_WIDTH = { narrow: 400, wide: 760, wideDocked: 560 } as const;

interface NoteDrawerProps {
  lessonId: string;
  lessonTitle: string;
  initialContent: string;
  initialWordCount: number;
  open: boolean;
  onClose: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** From this length the footer counts the characters left (90 % of the limit). */
const COUNT_FROM = Math.floor(NOTE_CONTENT_MAX * 0.9);

const TOO_LONG = `Note trop longue : ${NOTE_CONTENT_MAX.toLocaleString("fr-FR")} caractères au plus.`;
const SAVE_FAILED = "Enregistrement impossible.";
const OFFLINE = "Enregistrement impossible. Vérifie ta connexion.";

/** The footer's count near the limit: what is left, or how far past it. */
export function charactersLeft(length: number): string {
  const left = NOTE_CONTENT_MAX - length;
  if (left < 0) {
    const over = -left;
    return `${over.toLocaleString("fr-FR")} caractère${over > 1 ? "s" : ""} en trop`;
  }
  return `${left.toLocaleString("fr-FR")} caractère${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}`;
}

/** Small formatting-toolbar button. */
function ToolBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="lesson-notes__tool"
    >
      {children}
    </button>
  );
}

/**
 * The reader's note on this lesson, in a drawer opened from the lesson's
 * toolbar. It keeps the note while closed (the toolbar keeps it mounted), and
 * saves it a moment after each pause in the typing.
 *
 * Docked beside the page on a wide screen (NOTES_DOCKED_QUERY): no backdrop,
 * the lesson stays in use, and the page makes room for it (globals.css). Over
 * the page, dimmed behind it, below that width.
 */
export function NoteDrawer({
  lessonId,
  lessonTitle,
  initialContent,
  initialWordCount,
  open,
  onClose,
}: NoteDrawerProps): React.JSX.Element {
  const docked = useMediaQuery(NOTES_DOCKED_QUERY);
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(initialWordCount);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initialContent);
  // Only the latest save speaks: an earlier one answering late must not
  // overwrite what the footer says about the note as it is now.
  const latestSave = useRef(0);
  // Saves sent and not answered yet. Until they are, what is stored is not
  // known: one of them may still land, with a text the note no longer has.
  const inFlight = useRef(0);
  // The note as it is on screen, for an answer that arrives after it changed.
  const contentRef = useRef(content);
  contentRef.current = content;

  // A refused save used to fall back to "Sauvegardé auto", and a dropped
  // request left "Enregistrement…" up for good: the note was lost on reload
  // without a word. A failure now says so, and can be tried again.
  const save = useCallback(
    (text: string) => {
      const id = ++latestSave.current;
      // Speaks only for the note on screen: once it has changed, a newer save
      // is waiting to go or already sent, and that one will say how it went.
      const current = (): boolean => id === latestSave.current && text === contentRef.current;
      const fail = (message: string): void => {
        if (!current()) return;
        setSaveError(message);
        setStatus("error");
      };
      if (text.length > NOTE_CONTENT_MAX) {
        fail(TOO_LONG);
        return;
      }
      setStatus("saving");
      inFlight.current++;
      saveNoteAction({ lessonId, content: text }).then(
        (res) => {
          inFlight.current--;
          if (!res.ok) {
            fail(res.error ?? SAVE_FAILED);
            return;
          }
          lastSaved.current = text;
          if (!current()) return;
          setWordCount(res.wordCount ?? 0);
          setSaveError(null);
          setStatus("saved");
        },
        () => {
          inFlight.current--;
          fail(OFFLINE);
        },
      );
    },
    [lessonId],
  );

  // Debounced auto-save whenever the content differs from the last saved value.
  useEffect(() => {
    if (content === lastSaved.current && inFlight.current === 0) {
      // Back to what is stored, say a too-long note undone: nothing is left to
      // save, and a failure about a later version no longer applies. Not while
      // a save is on its way: "A" typed into "AB" and back to "A" while "AB"
      // is sent ends with "AB" stored, so "A" is saved again.
      latestSave.current++;
      setSaveError(null);
      setStatus((s) => (s === "idle" ? s : "saved"));
      return;
    }
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save(content);
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [content, save]);

  // Wrap the current selection with markdown markers (bold, italic, code).
  const surround = useCallback((before: string, after = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || "texte";
    setContent(value.slice(0, s) + before + sel + after + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }, []);

  // Prefix the current line (heading, list item).
  const prefixLine = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    setContent(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  }, []);

  const width = !expanded
    ? NOTE_DRAWER_WIDTH.narrow
    : docked
      ? NOTE_DRAWER_WIDTH.wideDocked
      : NOTE_DRAWER_WIDTH.wide;

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      modal={!docked}
      title="Mes notes"
      closeLabel="Fermer les notes"
      width={width}
      className={
        expanded ? "lesson-tools lesson-notes lesson-notes--wide" : "lesson-tools lesson-notes"
      }
      meta={
        <button
          type="button"
          onClick={() => {
            setExpanded((v) => !v);
          }}
          aria-label={expanded ? "Réduire" : "Agrandir"}
          aria-pressed={expanded}
          title={expanded ? "Réduire" : "Agrandir"}
          className="lesson-notes__expand"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            aria-hidden="true"
          >
            <path
              d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      }
      footer={
        <>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 7,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                  status === "error"
                    ? "var(--color-danger)"
                    : status === "saving"
                      ? "var(--color-warning)"
                      : "var(--cosmetic-accent)",
              }}
            />
            <span
              role="status"
              style={status === "error" ? { color: "var(--color-danger)" } : undefined}
            >
              {status === "error"
                ? saveError
                : status === "saving"
                  ? "Enregistrement…"
                  : "Sauvegardé auto"}
            </span>
            {/* Too long is not retried: the note has to be shortened first. */}
            {status === "error" && saveError !== TOO_LONG ? (
              <button
                type="button"
                onClick={() => {
                  save(content);
                }}
                style={retryBtn}
              >
                Réessayer
              </button>
            ) : null}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            {content.length >= COUNT_FROM ? (
              <span
                style={
                  content.length > NOTE_CONTENT_MAX ? { color: "var(--color-danger)" } : undefined
                }
              >
                {charactersLeft(content.length)}
              </span>
            ) : null}
            <span>
              {wordCount} mot{wordCount > 1 ? "s" : ""} · MD
            </span>
            <Link
              href="/notes"
              style={{
                color: "var(--cosmetic-accent)",
                textDecoration: "none",
              }}
            >
              Toutes mes notes →
            </Link>
          </span>
        </>
      }
    >
      {/* Linked-lesson badge */}
      <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            background: "color-mix(in srgb, var(--cosmetic-accent) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 18%, transparent)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--cosmetic-accent)",
              flexShrink: 0,
            }}
          />
          <span style={{ minWidth: 0 }}>
            Liée à cette leçon ·{" "}
            <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>{lessonTitle}</b>
          </span>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "8px 14px",
          borderBottom: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
        }}
      >
        <ToolBtn
          label="Gras"
          onClick={() => {
            surround("**");
          }}
        >
          <b>B</b>
        </ToolBtn>
        <ToolBtn
          label="Italique"
          onClick={() => {
            surround("*");
          }}
        >
          <i>I</i>
        </ToolBtn>
        <ToolBtn
          label="Titre"
          onClick={() => {
            prefixLine("## ");
          }}
        >
          <b>H</b>
        </ToolBtn>
        <span
          style={{
            width: 1,
            height: 16,
            background: "var(--color-border-default)",
            margin: "0 6px",
          }}
          aria-hidden="true"
        />
        <ToolBtn
          label="Code"
          onClick={() => {
            surround("`");
          }}
        >
          {"</>"}
        </ToolBtn>
        <ToolBtn
          label="Liste"
          onClick={() => {
            prefixLine("- ");
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            aria-hidden="true"
          >
            <path d="M6 4h8M6 8h8M6 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeLinecap="round" />
          </svg>
        </ToolBtn>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
        }}
        aria-label="Note de la leçon"
        maxLength={NOTE_CONTENT_MAX}
        placeholder={
          "# Titre de la note\n\nÉcris tes notes en markdown…\n\n- **gras**, *italique*, `code`"
        }
        spellCheck={false}
        style={{
          flex: 1,
          minHeight: 160,
          width: "100%",
          resize: "none",
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "18px 18px",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-mono)",
          fontSize: 13.5,
          lineHeight: 1.65,
          letterSpacing: "0.01em",
        }}
      />
    </SideDrawer>
  );
}

const retryBtn: React.CSSProperties = {
  padding: 0,
  background: "transparent",
  border: "none",
  color: "var(--cosmetic-accent)",
  font: "inherit",
  letterSpacing: "inherit",
  textTransform: "inherit",
  textDecoration: "underline",
  cursor: "pointer",
};
