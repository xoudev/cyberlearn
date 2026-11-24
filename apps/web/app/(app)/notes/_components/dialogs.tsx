"use client";

// Client boundary: dialogs hold form state and call server actions.

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ModalShell } from "@cyberlearn/ui";
import { toast } from "sonner";
import {
  folderAncestors,
  folderDescendants,
  NOTE_FOLDER_NAME_MAX,
  NOTE_IMPORT_LIMITS,
  parentMap,
} from "@cyberlearn/lib/notes/workspace";
import { CATEGORY_META, isContentCategory } from "@cyberlearn/lib/content/vocabulary";
import { RichNote } from "@/lib/markdown/render-rich-note";
import {
  importBatches,
  ImportError,
  readImportFile,
  type ImportReading,
} from "@/lib/notes/import-file";
import { searchLessonsForNoteAction } from "../_actions/note-actions";
import { importNotesAction } from "../_actions/import-actions";
import {
  answerNoteCardAction,
  loadDueNoteCardsAction,
  type DueNoteCard,
} from "../_actions/card-actions";
import { ReportNoteForm } from "./report-note-form";
import { FolderGlyph } from "./folder-icons";
import {
  FOLDER_DEFAULT_COLOR,
  FOLDER_DEFAULT_ICON,
  FOLDER_ICON_LABELS,
  FOLDER_ICON_NAMES,
  FOLDER_PALETTE,
  type FolderIconName,
  type SerializedFolder,
  type SerializedIncomingNote,
} from "./notes-shared";
import type { NoteReportReasonKey } from "@cyberlearn/lib/notes/report-reasons";

/** Folders in tree order with their depth, for a picker. */
export function flattenFolders(
  folders: readonly SerializedFolder[],
): { folder: SerializedFolder; depth: number }[] {
  const parents = parentMap(folders);
  const childrenOf = new Map<string | null, SerializedFolder[]>();
  for (const f of folders) {
    const p = parents.get(f.id) ?? null;
    childrenOf.set(p, [...(childrenOf.get(p) ?? []), f]);
  }
  const out: { folder: SerializedFolder; depth: number }[] = [];
  const walk = (parent: string | null, depth: number): void => {
    const list = (childrenOf.get(parent) ?? []).sort((a, b) => a.position - b.position);
    for (const f of list) {
      out.push({ folder: f, depth });
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function Btn({
  variant = "ghost",
  children,
  ...rest
}: React.ComponentProps<"button"> & {
  variant?: "primary" | "ghost" | "danger" | "quiet";
}): React.JSX.Element {
  return (
    <button type="button" className={`nw-btn nw-btn--${variant}`} {...rest}>
      {children}
    </button>
  );
}

// ── Confirmation ──────────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={520}
      className="notes-workspace nw-dialog"
      actions={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <div className="nw-dialog__body">{children}</div>
    </ModalShell>
  );
}

// ── Folder: create / edit ──────────────────────────────────────────────────

export interface FolderDraft {
  name: string;
  color: string | null;
  icon: FolderIconName;
  parentId: string | null;
}

export function FolderDialog({
  open,
  mode,
  initial,
  folders,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: FolderDraft;
  folders: readonly SerializedFolder[];
  onSubmit: (draft: FolderDraft) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<FolderDraft>(initial);
  const nameId = useId();
  const parentId = useId();
  useEffect(() => {
    if (open) setDraft(initial);
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const flat = useMemo(() => flattenFolders(folders), [folders]);
  const submit = (): void => {
    const name = draft.name.trim();
    if (!name) return;
    onSubmit({ ...draft, name });
    onClose();
  };
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Dossier"
      title={mode === "create" ? "Nouveau dossier" : "Modifier le dossier"}
      maxWidth={560}
      className="notes-workspace nw-dialog"
      actions={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" onClick={submit} disabled={!draft.name.trim()}>
            {mode === "create" ? "Créer" : "Enregistrer"}
          </Btn>
        </>
      }
    >
      <form
        className="nw-dialog__body nw-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={nameId}>Nom</label>
        <input
          id={nameId}
          // The dialog's one field: it takes the focus when the dialog opens.
          autoFocus
          maxLength={NOTE_FOLDER_NAME_MAX}
          value={draft.name}
          onChange={(e) => {
            setDraft({ ...draft, name: e.target.value });
          }}
          placeholder="Réseau, Pentest web, Révisions…"
        />
        {mode === "create" ? (
          <>
            <label htmlFor={parentId}>Dans</label>
            <select
              id={parentId}
              value={draft.parentId ?? ""}
              onChange={(e) => {
                setDraft({ ...draft, parentId: e.target.value || null });
              }}
            >
              <option value="">Racine du bloc-notes</option>
              {flat.map(({ folder, depth }) => (
                <option key={folder.id} value={folder.id}>
                  {`${"   ".repeat(depth)}${depth > 0 ? "└ " : ""}${folder.name}`}
                </option>
              ))}
            </select>
          </>
        ) : null}
        <span className="nw-form__label">Couleur</span>
        <div className="nw-swatches" role="radiogroup" aria-label="Couleur du dossier">
          {[null, ...FOLDER_PALETTE].map((c) => (
            <button
              key={c ?? "none"}
              type="button"
              role="radio"
              aria-checked={draft.color === c}
              aria-label={c ?? "Sans couleur"}
              className="nw-swatch"
              style={{ background: c ?? "transparent" }}
              onClick={() => {
                setDraft({ ...draft, color: c });
              }}
            >
              {c === null ? "∅" : null}
            </button>
          ))}
        </div>
        <span className="nw-form__label">Icône</span>
        <div className="nw-swatches" role="radiogroup" aria-label="Icône du dossier">
          {FOLDER_ICON_NAMES.map((icon) => (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={draft.icon === icon}
              aria-label={FOLDER_ICON_LABELS[icon]}
              title={FOLDER_ICON_LABELS[icon]}
              className="nw-swatch"
              onClick={() => {
                setDraft({ ...draft, icon });
              }}
            >
              <FolderGlyph name={icon} color={draft.color ?? FOLDER_DEFAULT_COLOR} size={20} />
            </button>
          ))}
        </div>
      </form>
    </ModalShell>
  );
}

export const EMPTY_FOLDER_DRAFT: FolderDraft = {
  name: "",
  color: FOLDER_PALETTE[0] ?? null,
  icon: FOLDER_DEFAULT_ICON,
  parentId: null,
};

// ── Folder picker: "Déplacer vers…" ───────────────────────────────────────

export function FolderPickerDialog({
  open,
  title,
  folders,
  movingFolderId = null,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  folders: readonly SerializedFolder[];
  /** When a folder is moved: it and its subtree cannot be its own target. */
  movingFolderId?: string | null;
  /** Where the thing sits now (marked, not pickable). */
  current: string | null;
  onPick: (folderId: string | null) => void;
  onClose: () => void;
}): React.JSX.Element {
  const flat = useMemo(() => flattenFolders(folders), [folders]);
  const blocked = useMemo(() => {
    if (!movingFolderId) return new Set<string>();
    return new Set([movingFolderId, ...folderDescendants(parentMap(folders), movingFolderId)]);
  }, [folders, movingFolderId]);
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Ranger"
      title={title}
      maxWidth={520}
      className="notes-workspace nw-dialog"
    >
      <ul className="nw-picker" role="listbox" aria-label="Destination">
        <li>
          <button
            type="button"
            role="option"
            aria-selected={current === null}
            disabled={current === null}
            onClick={() => {
              onPick(null);
              onClose();
            }}
          >
            <span className="nw-picker__root">⌂</span> Racine du bloc-notes
          </button>
        </li>
        {flat.map(({ folder, depth }) => (
          <li key={folder.id}>
            <button
              type="button"
              role="option"
              aria-selected={current === folder.id}
              disabled={current === folder.id || blocked.has(folder.id)}
              style={{ paddingLeft: 14 + depth * 18 }}
              onClick={() => {
                onPick(folder.id);
                onClose();
              }}
            >
              <FolderGlyph
                name={folder.icon}
                color={folder.color ?? FOLDER_DEFAULT_COLOR}
                size={16}
              />
              {folder.name}
            </button>
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

// ── Lesson picker: "Rattacher à une leçon" ────────────────────────────────

export interface LessonChoice {
  id: string;
  slug: string;
  title: string;
  category: string;
}

export function LessonPickerDialog({
  open,
  onPick,
  onClose,
}: {
  open: boolean;
  onPick: (lesson: LessonChoice) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LessonChoice[] | null>(null);
  const [searching, setSearching] = useState(false);
  const inputId = useId();
  useEffect(() => {
    if (!open) return;
    let live = true;
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchLessonsForNoteAction({ q })
        .then((rows) => {
          if (live) setResults(rows);
        })
        .finally(() => {
          if (live) setSearching(false);
        });
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [q, open]);
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow="Rattacher"
      title="Rattacher à une leçon"
      maxWidth={600}
      className="notes-workspace nw-dialog"
    >
      <div className="nw-dialog__body nw-form">
        <label htmlFor={inputId}>Chercher une leçon</label>
        <input
          id={inputId}
          type="search"
          // The dialog is a search: typing is the first thing to do.
          autoFocus
          value={q}
          maxLength={100}
          onChange={(e) => {
            setQ(e.target.value);
          }}
          placeholder="Injection SQL, modèle OSI…"
        />
        <ul className="nw-picker" aria-live="polite" aria-busy={searching}>
          {results === null || (searching && results.length === 0) ? (
            <li className="nw-muted">Recherche…</li>
          ) : null}
          {!searching && results?.length === 0 ? (
            <li className="nw-muted">Aucune leçon trouvée.</li>
          ) : null}
          {results?.map((lesson) => {
            const meta = isContentCategory(lesson.category) ? CATEGORY_META[lesson.category] : null;
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(lesson);
                  }}
                >
                  <span
                    className="nw-dot"
                    style={{ background: meta?.color ?? "#888" }}
                    aria-hidden="true"
                  />
                  {lesson.title}
                  <span className="nw-muted nw-picker__meta">{meta?.short ?? ""}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </ModalShell>
  );
}

// ── Import ─────────────────────────────────────────────────────────────────

export function ImportDialog({
  open,
  folders,
  defaultFolderId,
  onDone,
  onClose,
}: {
  open: boolean;
  folders: readonly SerializedFolder[];
  defaultFolderId: string | null;
  onDone: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const [reading, setReading] = useState<ImportReading | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(defaultFolderId);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileId = useId();
  const targetId = useId();
  const flat = useMemo(() => flattenFolders(folders), [folders]);

  useEffect(() => {
    if (open) {
      setReading(null);
      setError(null);
      setFileName("");
      setTarget(defaultFolderId);
      setProgress(0);
    }
  }, [open, defaultFolderId]);

  const pick = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setError(null);
    setReading(null);
    setFileName(file.name);
    try {
      setReading(await readImportFile(file));
    } catch (err) {
      setError(err instanceof ImportError ? err.message : "Fichier illisible.");
    }
  };

  const folderCount = useMemo(() => {
    const set = new Set<string>();
    for (const n of reading?.notes ?? []) {
      n.folders.forEach((_, i) => set.add(n.folders.slice(0, i + 1).join("/")));
    }
    return set.size;
  }, [reading]);

  const run = async (): Promise<void> => {
    if (!reading || reading.notes.length === 0) return;
    setBusy(true);
    const batches = importBatches(reading.notes);
    let created = 0;
    let flattened = 0;
    for (const [i, batch] of batches.entries()) {
      const res = await importNotesAction({ targetFolderId: target, notes: batch, first: i === 0 });
      if (!res.ok) {
        setBusy(false);
        setError(
          created > 0 ? `${res.error} (${String(created)} notes déjà importées.)` : res.error,
        );
        if (created > 0) onDone();
        return;
      }
      created += res.created;
      flattened += res.flattened;
      setProgress(Math.round(((i + 1) / batches.length) * 100));
    }
    setBusy(false);
    toast.success(
      `${String(created)} note${created > 1 ? "s" : ""} importée${created > 1 ? "s" : ""}` +
        (flattened > 0
          ? ` (${String(flattened)} rangée${flattened > 1 ? "s" : ""} plus haut : dossiers trop profonds)`
          : ""),
    );
    onDone();
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={busy ? () => undefined : onClose}
      dismissable={!busy}
      eyebrow="Importer"
      title="Importer des notes"
      maxWidth={620}
      className="notes-workspace nw-dialog"
      actions={
        <>
          <Btn onClick={onClose} disabled={busy}>
            Annuler
          </Btn>
          <Btn
            variant="primary"
            disabled={busy || !reading || reading.notes.length === 0}
            onClick={() => {
              void run();
            }}
          >
            {busy ? `Import… ${String(progress)} %` : "Importer"}
          </Btn>
        </>
      }
    >
      <div className="nw-dialog__body nw-form">
        <p className="nw-help">
          Un fichier <code>.md</code> ou <code>.txt</code>, ou un <code>.zip</code> de notes : ses
          dossiers deviennent des dossiers. {String(NOTE_IMPORT_LIMITS.notes)} notes et 5 Mo au
          plus, texte UTF-8 uniquement. Rien n&apos;est exécuté : seules les notes en texte sont
          lues.
        </p>
        <label htmlFor={fileId} className="nw-drop">
          <input
            id={fileId}
            type="file"
            accept=".md,.markdown,.txt,.zip,text/markdown,text/plain,application/zip"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
            }}
            disabled={busy}
          />
          <span>{fileName || "Choisir un fichier…"}</span>
        </label>
        {error ? (
          <p className="nw-error" role="alert">
            {error}
          </p>
        ) : null}
        {reading ? (
          <div className="nw-import-summary" aria-live="polite">
            <p>
              <strong>{reading.notes.length}</strong> note{reading.notes.length > 1 ? "s" : ""}
              {folderCount > 0 ? (
                <>
                  {" "}
                  dans <strong>{folderCount}</strong> dossier{folderCount > 1 ? "s" : ""}
                </>
              ) : null}
              {reading.skipped.length > 0
                ? `, ${String(reading.skipped.length)} fichier(s) ignoré(s)`
                : ""}
              .
            </p>
            {reading.skipped.length > 0 ? (
              <details>
                <summary>Fichiers ignorés</summary>
                <ul>
                  {reading.skipped.slice(0, 50).map((s) => (
                    <li key={s.name}>
                      <code>{s.name}</code> : {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <label htmlFor={targetId}>Importer dans</label>
            <select
              id={targetId}
              value={target ?? ""}
              onChange={(e) => {
                setTarget(e.target.value || null);
              }}
              disabled={busy}
            >
              <option value="">Racine du bloc-notes</option>
              {flat.map(({ folder, depth }) => (
                <option key={folder.id} value={folder.id}>
                  {`${"   ".repeat(depth)}${depth > 0 ? "└ " : ""}${folder.name}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

// ── Note cards review ────────────────────────────────────────────────────────

export function CardsReviewDialog({
  open,
  scopeLabel,
  noteIds,
  onClose,
  onAnswered,
}: {
  open: boolean;
  /** What is being reviewed: "toutes tes notes", a folder's name. */
  scopeLabel: string;
  noteIds?: string[] | undefined;
  onClose: () => void;
  onAnswered: () => void;
}): React.JSX.Element {
  const [cards, setCards] = useState<DueNoteCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ knew: 0, again: 0 });
  const [sending, setSending] = useState(false);
  const revealRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setCards(null);
    setIndex(0);
    setRevealed(false);
    setTally({ knew: 0, again: 0 });
    let live = true;
    void loadDueNoteCardsAction({ noteIds }).then((rows) => {
      if (live) setCards(rows);
    });
    return () => {
      live = false;
    };
    // noteIds is read when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const card = cards?.[index];
  const done = cards !== null && index >= cards.length;

  const answer = (knew: boolean): void => {
    if (!card || sending) return;
    setSending(true);
    void answerNoteCardAction({ cardId: card.id, knew }).then((res) => {
      setSending(false);
      if (!res.ok) {
        toast.error("Réponse non enregistrée.");
        return;
      }
      setTally((t) => (knew ? { ...t, knew: t.knew + 1 } : { ...t, again: t.again + 1 }));
      setRevealed(false);
      setIndex((i) => i + 1);
      onAnswered();
      window.setTimeout(() => revealRef.current?.focus(), 0);
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      eyebrow={`Cartes · ${scopeLabel}`}
      title="Réviser mes cartes"
      meta={cards && !done ? `${String(index + 1)} / ${String(cards.length)}` : undefined}
      maxWidth={680}
      className="notes-workspace nw-dialog nw-review"
    >
      <div className="nw-dialog__body">
        {cards === null ? <p className="nw-muted">Chargement…</p> : null}
        {cards?.length === 0 ? (
          <div className="nw-review__empty">
            <p>Aucune carte à revoir aujourd&apos;hui.</p>
            <p className="nw-muted">
              Écris une ligne <code>question :: réponse</code> dans une note, puis « Mettre à jour
              les cartes ». Elles reviennent après 1, 3, 7 puis 21 jours.
            </p>
          </div>
        ) : null}
        {card ? (
          <div className="nw-review__card">
            <div className="nw-review__progress" aria-hidden="true">
              <span
                style={{
                  width: `${String(Math.round((index / Math.max(1, cards.length)) * 100))}%`,
                }}
              />
            </div>
            <p className="nw-review__source">
              {card.noteTitle} · boîte {card.box}/4
            </p>
            <RichNote markdown={card.front} className="nw-review__front" />
            {revealed ? (
              <>
                <RichNote markdown={card.back} className="nw-review__back" />
                <div className="nw-review__actions">
                  <Btn
                    variant="ghost"
                    disabled={sending}
                    onClick={() => {
                      answer(false);
                    }}
                  >
                    À revoir
                  </Btn>
                  <Btn
                    variant="primary"
                    disabled={sending}
                    onClick={() => {
                      answer(true);
                    }}
                  >
                    Je savais
                  </Btn>
                </div>
              </>
            ) : (
              <div className="nw-review__actions">
                <Btn
                  variant="primary"
                  onClick={() => {
                    setRevealed(true);
                  }}
                  ref={revealRef}
                >
                  Afficher la réponse
                </Btn>
              </div>
            )}
          </div>
        ) : null}
        {done && cards.length > 0 ? (
          <div className="nw-review__empty">
            <p className="nw-review__score">
              {tally.knew} / {cards.length}
            </p>
            <p>
              Session terminée.{" "}
              {tally.again > 0
                ? `${String(tally.again)} carte${tally.again > 1 ? "s" : ""} reviendr${tally.again > 1 ? "ont" : "a"} demain.`
                : "Tout est su : les cartes montent d'une boîte."}
            </p>
            <Btn variant="primary" onClick={onClose}>
              Fermer
            </Btn>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

// ── A note somebody shared ──────────────────────────────────────────────────

export function ReceivedNoteDialog({
  note,
  onClose,
  onDismiss,
  onReport,
}: {
  note: SerializedIncomingNote;
  onClose: () => void;
  onDismiss: () => Promise<boolean>;
  onReport: (input: {
    reason: NoteReportReasonKey;
    comment: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}): React.JSX.Element {
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const date = new Date(note.sharedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <ModalShell
      open
      onClose={onClose}
      eyebrow={<span className="nw-accent">Partagée par {note.authorName}</span>}
      title={note.title}
      meta={`le ${date} · ${String(note.wordCount)} mot${note.wordCount > 1 ? "s" : ""}${note.lessonTitle ? ` · ${note.lessonTitle}` : ""}`}
      maxWidth={860}
      className="notes-workspace nw-dialog"
      actions={
        reporting ? undefined : (
          <>
            <Btn
              variant="quiet"
              onClick={() => {
                setReporting(true);
              }}
            >
              Signaler
            </Btn>
            <Btn
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void onDismiss().then((ok) => {
                  setBusy(false);
                  if (ok) onClose();
                  else toast.error("Impossible de retirer cette note.");
                });
              }}
            >
              Retirer de mes notes reçues
            </Btn>
          </>
        )
      }
    >
      <div className="nw-dialog__body">
        {reporting ? (
          <ReportNoteForm
            onSubmit={async (input) => {
              const res = await onReport(input);
              if (res.ok) onClose();
              return res;
            }}
            onCancel={() => {
              setReporting(false);
            }}
          />
        ) : (
          <RichNote markdown={note.content} />
        )}
      </div>
    </ModalShell>
  );
}

/** The folder names above a folder, for a breadcrumb. */
export function breadcrumbOf(
  folders: readonly SerializedFolder[],
  folderId: string | null,
): SerializedFolder[] {
  if (folderId === null) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const self = byId.get(folderId);
  if (!self) return [];
  return [...folderAncestors(parentMap(folders), folderId).map((id) => byId.get(id)), self].filter(
    (f): f is SerializedFolder => f !== undefined,
  );
}
