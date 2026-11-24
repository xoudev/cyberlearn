"use client";

// Client boundary: the editor, its autosave and the note's actions are local state.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { extractFlashcards } from "@cyberlearn/lib/notes/rich-markdown";
import { NOTE_CONTENT_MAX, NOTE_TITLE_MAX } from "@cyberlearn/lib/notes/workspace";
import { NoteEditor, type NoteEditorHandle } from "@/components/notes/editor/note-editor";
import { updateNoteContentAction, syncNoteCardsAction } from "../_actions/note-actions";
import { breadcrumbOf, Btn } from "./dialogs";
import { FolderGlyph } from "./folder-icons";
import {
  CAT,
  FOLDER_DEFAULT_COLOR,
  type SerializedFolder,
  type SerializedNote,
} from "./notes-shared";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

const SAVE_DELAY = 800;
const COUNT_FROM = Math.floor(NOTE_CONTENT_MAX * 0.9);

export interface NotePaneProps {
  note: SerializedNote;
  folders: readonly SerializedFolder[];
  /** Titles of the user's live notes, for [[ completion. */
  linkTargets: readonly string[];
  /** Notes that link to this one with [[its title]]. */
  backlinks: readonly SerializedNote[];
  resolveLink: (target: string) => string | null;
  onOpenLink: (target: string) => void;
  onCreateLink: (target: string) => void;
  onOpenNote: (noteId: string) => void;
  onSaved: (
    noteId: string,
    patch: { content: string; wordCount: number; updatedAt: string },
  ) => void;
  onRename: (noteId: string, title: string) => Promise<boolean>;
  onPin: (note: SerializedNote) => void;
  onMove: (note: SerializedNote) => void;
  onAttach: (note: SerializedNote) => void;
  onDetach: (note: SerializedNote) => void;
  onTrash: (note: SerializedNote) => void;
  onShare: (note: SerializedNote) => void;
  onExport: (note: SerializedNote, format: "md" | "pdf") => void;
  onCardsChanged: () => void;
  /** Narrow screens: back to the list. */
  onBack?: (() => void) | undefined;
  /** "Mode large": the tree and the list folded away. */
  wide?: boolean | undefined;
  onToggleWide?: (() => void) | undefined;
  /** Gives the workspace the editor, for "Ajouter à mes notes" and the like. */
  editorRef?: React.Ref<NoteEditorHandle> | undefined;
}

/**
 * The note open in the workspace: its title (edited in place), where it sits
 * (folders, lesson), its actions, and the editor. The text saves itself a
 * moment after each pause, and right away when another note is opened or the
 * pane goes; leaving the page with a save pending asks first.
 */
export function NotePane({
  note,
  folders,
  linkTargets,
  backlinks,
  resolveLink,
  onOpenLink,
  onCreateLink,
  onOpenNote,
  onSaved,
  onRename,
  onPin,
  onMove,
  onAttach,
  onDetach,
  onTrash,
  onShare,
  onExport,
  onCardsChanged,
  onBack,
  wide = false,
  onToggleWide,
  editorRef,
}: NotePaneProps): React.JSX.Element {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [wordCount, setWordCount] = useState(note.wordCount);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const pending = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const noteId = note.id;
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });

  useEffect(() => {
    setTitle(note.title);
  }, [note.title]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (inflight.current) await inflight.current;
    const text = pending.current;
    if (text === null) return true;
    pending.current = null;
    setStatus("saving");
    const run = updateNoteContentAction({ noteId, content: text })
      .then((res) => {
        if (!res.ok) {
          pending.current ??= text;
          setStatus("error");
          setError(res.error ?? "Enregistrement impossible.");
          return false;
        }
        setStatus(pending.current === null ? "saved" : "dirty");
        setError(null);
        setWordCount(res.wordCount ?? 0);
        onSavedRef.current(noteId, {
          content: text,
          wordCount: res.wordCount ?? 0,
          updatedAt: res.savedAt ?? new Date().toISOString(),
        });
        return true;
      })
      .catch(() => {
        pending.current ??= text;
        setStatus("error");
        setError("Enregistrement impossible. Vérifie ta connexion.");
        return false;
      })
      .finally(() => {
        inflight.current = null;
      });
    inflight.current = run;
    return run;
  }, [noteId]);

  // Save what is pending when the pane goes (another note opened, view changed).
  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  // A save still pending when the tab closes: the browser asks first.
  useEffect(() => {
    if (status === "saved") return;
    const onUnload = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [status]);

  const onChange = (text: string): void => {
    setContent(text);
    pending.current = text;
    setStatus("dirty");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void flush();
    }, SAVE_DELAY);
  };

  const commitTitle = (): void => {
    const next = title.trim();
    if (!next) {
      setTitle(note.title);
      return;
    }
    if (next === note.title) return;
    void onRename(note.id, next).then((ok) => {
      if (!ok) {
        setTitle(note.title);
        toast.error("Renommage impossible.");
      }
    });
  };

  const cards = useMemo(() => extractFlashcards(content).length, [content]);
  const crumbs = breadcrumbOf(folders, note.folderId);
  const cat = note.lessonCategory ? CAT[note.lessonCategory] : null;

  const syncCards = async (): Promise<void> => {
    setSyncing(true);
    const saved = await flush();
    if (!saved) {
      setSyncing(false);
      return;
    }
    const res = await syncNoteCardsAction({ noteId: note.id });
    setSyncing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const parts = [
      res.added > 0 ? `${String(res.added)} ajoutée${res.added > 1 ? "s" : ""}` : null,
      res.updated > 0 ? `${String(res.updated)} mise${res.updated > 1 ? "s" : ""} à jour` : null,
      res.removed > 0 ? `${String(res.removed)} retirée${res.removed > 1 ? "s" : ""}` : null,
    ].filter(Boolean);
    toast.success(
      parts.length > 0
        ? `Cartes : ${parts.join(", ")}.`
        : `Les ${String(res.total)} carte${res.total > 1 ? "s" : ""} de cette note sont à jour.`,
    );
    onCardsChanged();
  };

  const statusLabel =
    status === "saving"
      ? "Enregistrement…"
      : status === "dirty"
        ? "Modifications en attente"
        : status === "error"
          ? (error ?? "Erreur")
          : "Enregistré";

  return (
    <article className="nw-pane" aria-label={`Note : ${note.title}`}>
      <header className="nw-pane__head">
        {onBack ? (
          <button type="button" className="nw-pane__back" onClick={onBack}>
            ← Notes
          </button>
        ) : null}
        <div className="nw-pane__bar">
          <nav className="nw-pane__crumbs" aria-label="Emplacement">
            <button
              type="button"
              className="nw-crumb"
              onClick={() => {
                onMove(note);
              }}
              title="Déplacer la note"
            >
              {crumbs.length === 0 ? (
                <span>Racine</span>
              ) : (
                crumbs.map((f, i) => (
                  <span key={f.id} className="nw-crumb__part">
                    {i > 0 ? <span aria-hidden="true"> / </span> : null}
                    <FolderGlyph name={f.icon} color={f.color ?? FOLDER_DEFAULT_COLOR} size={13} />
                    {f.name}
                  </span>
                ))
              )}
            </button>
          </nav>
          <div className="nw-pane__actions">
            <Btn
              variant="quiet"
              aria-pressed={note.pinned}
              onClick={() => {
                onPin(note);
              }}
            >
              {note.pinned ? "◆ Épinglée" : "◇ Épingler"}
            </Btn>
            <Btn
              variant="quiet"
              onClick={() => {
                onMove(note);
              }}
            >
              Déplacer
            </Btn>
            <Btn
              variant="quiet"
              onClick={() => {
                void flush().then(() => {
                  onShare(note);
                });
              }}
            >
              Partager
            </Btn>
            <Btn
              variant="quiet"
              onClick={() => {
                void flush().then(() => {
                  onExport(note, "pdf");
                });
              }}
            >
              PDF
            </Btn>
            <Btn
              variant="quiet"
              onClick={() => {
                void flush().then(() => {
                  onExport(note, "md");
                });
              }}
            >
              .md
            </Btn>
            <Btn
              variant="quiet"
              className="nw-btn nw-btn--quiet nw-btn--danger-text"
              onClick={() => {
                void flush().then(() => {
                  onTrash(note);
                });
              }}
            >
              Corbeille
            </Btn>
            {onToggleWide ? (
              <Btn
                variant="quiet"
                className="nw-btn nw-btn--quiet nw-wide-toggle"
                aria-pressed={wide}
                title={
                  wide
                    ? "Revenir à trois colonnes (Échap)"
                    : "Agrandir la note sur toute la largeur"
                }
                onClick={onToggleWide}
              >
                {wide ? "⤡ Réduire" : "⤢ Mode large"}
              </Btn>
            ) : null}
          </div>
        </div>
        <input
          className="nw-pane__title"
          aria-label="Titre de la note"
          value={title}
          maxLength={NOTE_TITLE_MAX}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === "Escape") setTitle(note.title);
          }}
        />
        <div className="nw-pane__chips">
          {note.lessonId && note.lessonSlug ? (
            <span
              className="nw-chip nw-chip--lesson"
              style={cat ? { borderColor: cat.color } : undefined}
            >
              <span
                className="nw-dot"
                style={{ background: cat?.color ?? "#888" }}
                aria-hidden="true"
              />
              <Link href={`/lessons/${note.lessonSlug}`}>{note.lessonTitle}</Link>
              <button
                type="button"
                className="nw-chip__x"
                aria-label="Détacher de la leçon"
                title="Détacher de la leçon"
                onClick={() => {
                  onDetach(note);
                }}
              >
                ×
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="nw-chip nw-chip--add"
              onClick={() => {
                onAttach(note);
              }}
            >
              + Rattacher à une leçon
            </button>
          )}
          {note.pathTitle ? <span className="nw-chip nw-chip--muted">{note.pathTitle}</span> : null}
        </div>
      </header>

      <div className="nw-pane__editor">
        <NoteEditor
          key={note.id}
          ref={editorRef}
          initialValue={note.content}
          onChange={onChange}
          linkTargets={linkTargets}
          resolveLink={resolveLink}
          onOpenLink={onOpenLink}
          onCreateLink={onCreateLink}
          maxLength={NOTE_CONTENT_MAX}
          onLimit={() => {
            toast.error(
              `Note trop longue : ${NOTE_CONTENT_MAX.toLocaleString("fr-FR")} caractères au plus.`,
            );
          }}
          ariaLabel="Contenu de la note"
          footer={
            <>
              <span className="nw-save" data-status={status} role="status" aria-live="polite">
                {statusLabel}
              </span>
              <span>
                {wordCount} mot{wordCount > 1 ? "s" : ""}
              </span>
              {content.length >= COUNT_FROM ? (
                <span className="nw-warn">
                  {(NOTE_CONTENT_MAX - content.length).toLocaleString("fr-FR")} caractères restants
                </span>
              ) : null}
              <span className="nw-footer__spacer" />
              {cards > 0 ? (
                <button
                  type="button"
                  className="nw-footer__btn"
                  disabled={syncing}
                  onClick={() => {
                    void syncCards();
                  }}
                >
                  {syncing ? "Cartes…" : `Mettre à jour les cartes (${String(cards)})`}
                </button>
              ) : null}
            </>
          }
        />
      </div>

      {backlinks.length > 0 ? (
        <aside className="nw-backlinks" aria-label="Notes qui mènent ici">
          <span className="nw-backlinks__label">Mentionnée dans</span>
          {backlinks.map((b) => (
            <button
              key={b.id}
              type="button"
              className="nw-chip"
              onClick={() => {
                onOpenNote(b.id);
              }}
            >
              ↖ {b.title}
            </button>
          ))}
        </aside>
      ) : null}
    </article>
  );
}
