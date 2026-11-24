"use client";

// Client boundary: the workspace holds the notes, the folders and the
// selection, and every action updates them in place before the server answers.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@cyberlearn/ui";
import { toast } from "sonner";
import type { Category } from "@cyberlearn/db";
import { extractWikiLinks, normalizeNoteTitle } from "@cyberlearn/lib/notes/rich-markdown";
import { folderDescendants, NOTE_TRASH_DAYS, parentMap } from "@cyberlearn/lib/notes/workspace";
import { CATEGORY_META } from "@cyberlearn/lib/content/vocabulary";
import { useMediaQuery } from "@/hooks/use-media-query";
import { RichNote } from "@/lib/markdown/render-rich-note";
import { useSlashFocus } from "@/hooks/use-slash-focus";
import {
  ALL_NOTES_ROOT,
  buildNotesZip,
  downloadBytes,
  noteFileContent,
  safeFileName,
  type ArchiveNote,
} from "@/lib/notes/archive";
import {
  attachNoteAction,
  createNoteAction,
  detachNoteAction,
  emptyTrashAction,
  moveNotesAction,
  pinNoteAction,
  purgeNotesAction,
  renameNoteAction,
  restoreNotesAction,
  trashNotesAction,
} from "../_actions/note-actions";
import {
  createFolderAction,
  deleteFolderAction,
  moveFolderAction,
  recolorFolderAction,
  reiconFolderAction,
  renameFolderAction,
} from "../_actions/folder-actions";
import { noteCardCountsAction } from "../_actions/card-actions";
import { dismissSharedNoteAction, reportSharedNoteAction } from "../_actions/share-actions";
import { NOTE_REPORT_SENT } from "@cyberlearn/lib/notes/report-reasons";
import {
  ContextMenu,
  useContextMenu,
  type MenuEntry,
} from "@/components/context-menu/context-menu";
import {
  Btn,
  CardsReviewDialog,
  ConfirmDialog,
  EMPTY_FOLDER_DRAFT,
  FolderDialog,
  FolderPickerDialog,
  ImportDialog,
  LessonPickerDialog,
  ReceivedNoteDialog,
  type FolderDraft,
  type LessonChoice,
} from "./dialogs";
import { FolderTree, type WorkspaceView } from "./folder-tree";
import { NoteList } from "./note-list";
import { NotePane } from "./note-pane";
import { ShareDialog } from "./share-dialog";
import {
  FOLDER_DEFAULT_ICON,
  FOLDER_ICON_NAMES,
  type FolderIconName,
  type SerializedFolder,
  type SerializedIncomingNote,
  type SerializedNote,
} from "./notes-shared";
import "@/components/notes/rich-note.css";
import "./workspace.css";

type Sort = "updated" | "created" | "title";
type Kind = "any" | "lesson" | "free";

const SORTS: readonly Sort[] = ["updated", "created", "title"];
const KINDS: readonly Kind[] = ["any", "lesson", "free"];
const CATEGORIES: readonly ("ALL" | Category)[] = ["ALL", "CYBERSEC", "DEV", "NETWORK"];

/** The member of `options` equal to `value`, or `fallback`. */
function pick<T extends string>(options: readonly T[], value: string, fallback: T): T {
  return options.find((o) => o === value) ?? fallback;
}

const EXPANDED_KEY = "notes.expanded-folders";
const WIDE_KEY = "notes.wide";

function readExpanded(): Set<string> {
  try {
    const raw = window.localStorage.getItem(EXPANDED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function saveExpanded(set: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(EXPANDED_KEY, JSON.stringify([...set]));
  } catch {
    // Storage blocked: folding is only remembered for the visit.
  }
}

const fold = (s: string): string => normalizeNoteTitle(s);

function toArchive(n: SerializedNote): ArchiveNote {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    folderId: n.folderId,
    lessonTitle: n.lessonTitle,
    lessonSlug: n.lessonSlug,
    pathTitle: n.pathTitle,
    categoryLabel: n.lessonCategory ? CATEGORY_META[n.lessonCategory].short : null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

const today = (): string => new Date().toISOString().slice(0, 10);

/** Fetch a PDF from the export route and save it, with a toast while it renders. */
async function downloadPdf(query: string, name: string): Promise<void> {
  const id = toast.loading("Préparation du PDF…");
  try {
    const res = await fetch(`/api/notes/pdf?${query}`, { credentials: "same-origin" });
    if (!res.ok) {
      let message = "Export PDF impossible.";
      try {
        const body: unknown = await res.json();
        if (
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
        ) {
          message = body.error;
        }
      } catch {
        // Not JSON: keep the generic message.
      }
      toast.error(message, { id });
      return;
    }
    downloadBytes(await res.blob(), `${safeFileName(name, "notes")}.pdf`, "application/pdf");
    toast.success("PDF prêt.", { id });
  } catch {
    toast.error("Export PDF impossible. Vérifie ta connexion.", { id });
  }
}

interface Props {
  notes: SerializedNote[];
  folders: SerializedFolder[];
  incoming: SerializedIncomingNote[];
  openNoteId: string | null;
  cardCounts: { due: number; total: number };
}

export function NotesWorkspace({
  notes: initialNotes,
  folders: initialFolders,
  incoming: initialIncoming,
  openNoteId,
  cardCounts: initialCounts,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [folders, setFolders] = useState(initialFolders);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [cardCounts, setCardCounts] = useState(initialCounts);
  // A fresh payload from the server (an import, a navigation) replaces the local copy.
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);
  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);
  useEffect(() => {
    setIncoming(initialIncoming);
  }, [initialIncoming]);

  const [view, setView] = useState<WorkspaceView>({ kind: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(openNoteId);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const lastChecked = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"ALL" | Category>("ALL");
  const [kind, setKind] = useState<Kind>("any");
  const [sort, setSort] = useState<Sort>("updated");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useSlashFocus(searchRef);
  const narrow = useMediaQuery("(max-width: 1099px)");
  const gridRef = useRef<HTMLDivElement>(null);
  // "Mode large": the tree and the list fold away, the note takes the width.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    try {
      setWide(window.localStorage.getItem(WIDE_KEY) === "1");
    } catch {
      // Storage blocked: the mode is only kept for the visit.
    }
  }, []);
  /**
   * Bring the workspace up under the navbar: the open note gets the whole
   * screen. After the address is updated (selectedId's effect), which would
   * otherwise put the page back where it was.
   */
  const focusGrid = useCallback(() => {
    window.setTimeout(() => {
      const grid = gridRef.current;
      if (grid && grid.getBoundingClientRect().top > 80) {
        grid.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }, 120);
  }, []);
  const toggleWide = useCallback(
    (next: boolean) => {
      setWide(next);
      if (next) focusGrid();
      try {
        window.localStorage.setItem(WIDE_KEY, next ? "1" : "0");
      } catch {
        // Storage blocked: the mode is only kept for the visit.
      }
    },
    [focusGrid],
  );
  useEffect(() => {
    if (!wide) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Escape in the editor or a field is theirs (closing a completion…).
      if (e.target instanceof Element && e.target.closest(".cm-editor, input, textarea, select"))
        return;
      if (!document.querySelector('[role="dialog"]')) toggleWide(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [wide, toggleWide]);

  // Dialogs.
  const [folderDialog, setFolderDialog] = useState<
    | { mode: "create"; draft: FolderDraft }
    | { mode: "edit"; folderId: string; draft: FolderDraft }
    | null
  >(null);
  const [movePicker, setMovePicker] = useState<
    | { kind: "notes"; ids: string[]; current: string | null }
    | { kind: "folder"; id: string; current: string | null }
    | null
  >(null);
  const [lessonPicker, setLessonPicker] = useState<SerializedNote | null>(null);
  const [mergeAsk, setMergeAsk] = useState<{ note: SerializedNote; lesson: LessonChoice } | null>(
    null,
  );
  const [folderDelete, setFolderDelete] = useState<SerializedFolder | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    body: React.ReactNode;
    label: string;
    run: () => void;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [review, setReview] = useState<{ label: string; noteIds?: string[] } | null>(null);
  const [sharing, setSharing] = useState<SerializedNote | null>(null);
  const [reading, setReading] = useState<SerializedIncomingNote | null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const { menu, open: openMenu, close: closeMenu } = useContextMenu();

  useEffect(() => {
    setNow(Date.now());
    setExpanded(readExpanded());
    const t = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => {
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (openNoteId) setSelectedId(openNoteId);
  }, [openNoteId]);

  // The open note is in the address, so a reload or a shared link lands on it.
  useEffect(() => {
    const url = selectedId ? `/notes?note=${encodeURIComponent(selectedId)}` : "/notes";
    if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [selectedId]);

  const live = useMemo(() => notes.filter((n) => n.deletedAt === null), [notes]);
  const trash = useMemo(
    () =>
      notes
        .filter((n) => n.deletedAt !== null)
        .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")),
    [notes],
  );
  const parents = useMemo(() => parentMap(folders), [folders]);

  const byTitle = useMemo(() => {
    const map = new Map<string, SerializedNote>();
    for (const n of [...live].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
      const key = fold(n.title);
      if (!map.has(key)) map.set(key, n);
    }
    return map;
  }, [live]);
  const linksOf = useMemo(
    () => new Map(live.map((n) => [n.id, extractWikiLinks(n.content)])),
    [live],
  );
  const linkTargets = useMemo(() => [...new Set(live.map((n) => n.title))], [live]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;
  const backlinks = useMemo(() => {
    if (!selected) return [];
    const key = fold(selected.title);
    return live.filter((n) => n.id !== selected.id && (linksOf.get(n.id) ?? []).includes(key));
  }, [selected, live, linksOf]);

  // ── The list of the current view ─────────────────────────────────────────
  const visible = useMemo(() => {
    let list: SerializedNote[];
    switch (view.kind) {
      case "trash":
        list = trash;
        break;
      case "received":
        list = [];
        break;
      case "pinned":
        list = live.filter((n) => n.pinned);
        break;
      case "free":
        list = live.filter((n) => n.lessonId === null);
        break;
      case "unfiled":
        list = live.filter((n) => n.folderId === null);
        break;
      case "folder": {
        const scope = new Set([view.id, ...folderDescendants(parents, view.id)]);
        list = live.filter((n) => n.folderId !== null && scope.has(n.folderId));
        break;
      }
      case "all":
        list = live;
    }
    const q = fold(query);
    if (q) {
      list = list.filter((n) => fold(`${n.title} ${n.lessonTitle ?? ""} ${n.content}`).includes(q));
    }
    if (category !== "ALL") list = list.filter((n) => n.lessonCategory === category);
    if (kind === "lesson") list = list.filter((n) => n.lessonId !== null);
    if (kind === "free") list = list.filter((n) => n.lessonId === null);
    const sorted = [...list].sort((a, b) => {
      if (view.kind !== "trash" && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sort === "title") return a.title.localeCompare(b.title, "fr");
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return sorted;
  }, [view, live, trash, parents, query, category, kind, sort]);

  const currentFolder =
    view.kind === "folder" ? (folders.find((f) => f.id === view.id) ?? null) : null;

  // ── Helpers to patch the local copy ──────────────────────────────────────
  const patchNote = useCallback((id: string, patch: Partial<SerializedNote>) => {
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);
  const refreshCards = useCallback(() => {
    void noteCardCountsAction().then(setCardCounts);
  }, []);

  const openNote = useCallback(
    (id: string) => {
      const target = notes.find((n) => n.id === id);
      if (target?.deletedAt && view.kind !== "trash") setView({ kind: "trash" });
      setSelectedId(id);
      setTreeOpen(false);
      focusGrid();
    },
    [notes, view.kind, focusGrid],
  );

  // ── Notes ─────────────────────────────────────────────────────────────────
  const createNote = async (title = "Nouvelle note", folderId?: string | null): Promise<void> => {
    const target = folderId !== undefined ? folderId : currentFolder ? currentFolder.id : null;
    const res = await createNoteAction({ title, folderId: target });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setNotes((list) => [res.note, ...list]);
    if (view.kind === "trash" || view.kind === "received") setView({ kind: "all" });
    setSelectedId(res.note.id);
    focusGrid();
    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(".nw-pane__title");
      input?.focus();
      input?.select();
    }, 50);
  };

  const moveNotes = async (ids: string[], folderId: string | null): Promise<void> => {
    const before = new Map(notes.filter((n) => ids.includes(n.id)).map((n) => [n.id, n.folderId]));
    setNotes((list) => list.map((n) => (ids.includes(n.id) ? { ...n, folderId } : n)));
    const res = await moveNotesAction({ noteIds: ids, folderId });
    if (!res.ok) {
      setNotes((list) =>
        list.map((n) => (before.has(n.id) ? { ...n, folderId: before.get(n.id) ?? null } : n)),
      );
      toast.error("Déplacement impossible.");
      return;
    }
    const where = folderId
      ? (folders.find((f) => f.id === folderId)?.name ?? "le dossier")
      : "la racine";
    toast.success(
      `${String(res.moved)} note${res.moved > 1 ? "s" : ""} déplacée${res.moved > 1 ? "s" : ""} vers ${where}.`,
    );
  };

  const trashNotes = async (ids: string[]): Promise<void> => {
    const stamp = new Date().toISOString();
    const before = notes.filter((n) => ids.includes(n.id));
    setNotes((list) =>
      list.map((n) =>
        ids.includes(n.id)
          ? { ...n, deletedAt: stamp, pinned: false, lessonId: null, lessonSlug: null }
          : n,
      ),
    );
    if (selectedId && ids.includes(selectedId)) setSelectedId(null);
    setChecked(new Set());
    const res = await trashNotesAction({ noteIds: ids });
    if (!res.ok) {
      setNotes((list) => list.map((n) => before.find((b) => b.id === n.id) ?? n));
      toast.error("Impossible de mettre à la corbeille.");
      return;
    }
    refreshCards();
    toast(`${String(res.count)} note${res.count > 1 ? "s" : ""} dans la corbeille.`, {
      action: {
        label: "Annuler",
        onClick: () => {
          void restoreNotes(ids);
        },
      },
    });
  };

  const restoreNotes = async (ids: string[]): Promise<void> => {
    const res = await restoreNotesAction({ noteIds: ids });
    if (!res.ok) {
      toast.error("Restauration impossible.");
      return;
    }
    const back = new Map(res.notes.map((n) => [n.id, n]));
    setNotes((list) => list.map((n) => back.get(n.id) ?? n));
    setChecked(new Set());
    refreshCards();
    toast.success(
      res.freed.length > 0
        ? `Restaurée${res.notes.length > 1 ? "s" : ""}. ${String(res.freed.length)} note${res.freed.length > 1 ? "s reviennent" : " revient"} sans sa leçon (déjà prise ou retirée).`
        : `${String(res.notes.length)} note${res.notes.length > 1 ? "s" : ""} restaurée${res.notes.length > 1 ? "s" : ""}.`,
    );
  };

  const purgeNotes = (ids: string[]): void => {
    setConfirm({
      title: "Supprimer définitivement ?",
      body: (
        <p>
          {ids.length > 1 ? `Ces ${String(ids.length)} notes` : "Cette note"} et leurs cartes de
          révision seront effacées pour de bon. Impossible de revenir en arrière.
        </p>
      ),
      label: "Supprimer définitivement",
      run: () => {
        void purgeNotesAction({ noteIds: ids }).then((res) => {
          if (!res.ok) {
            toast.error("Suppression impossible.");
            return;
          }
          setNotes((list) => list.filter((n) => !ids.includes(n.id)));
          if (selectedId && ids.includes(selectedId)) setSelectedId(null);
          setChecked(new Set());
          toast.success("Supprimé définitivement.");
        });
      },
    });
  };

  const emptyTrash = (): void => {
    setConfirm({
      title: "Vider la corbeille ?",
      body: (
        <p>
          Les {trash.length} notes de la corbeille et leurs cartes seront effacées pour de bon.
          Impossible de revenir en arrière.
        </p>
      ),
      label: "Vider la corbeille",
      run: () => {
        void emptyTrashAction().then((res) => {
          if (!res.ok) return;
          setNotes((list) => list.filter((n) => n.deletedAt === null));
          if (selected?.deletedAt) setSelectedId(null);
          toast.success("Corbeille vidée.");
        });
      },
    });
  };

  const renameNote = async (id: string, title: string): Promise<boolean> => {
    const res = await renameNoteAction({ noteId: id, title });
    if (res.ok && res.title) patchNote(id, { title: res.title });
    return res.ok;
  };

  const togglePin = (note: SerializedNote): void => {
    patchNote(note.id, { pinned: !note.pinned });
    void pinNoteAction({ noteId: note.id, pinned: !note.pinned }).then((res) => {
      if (!res.ok) {
        patchNote(note.id, { pinned: note.pinned });
        toast.error("Impossible d'épingler.");
      }
    });
  };

  const attach = async (
    note: SerializedNote,
    lesson: LessonChoice,
    mode: "attach" | "merge",
  ): Promise<void> => {
    const res = await attachNoteAction({ noteId: note.id, lessonId: lesson.id, mode });
    if (!res.ok) {
      if (res.status === "conflict") {
        setMergeAsk({ note, lesson });
        return;
      }
      toast.error(res.error);
      return;
    }
    if (res.status === "merged") {
      const stamp = new Date().toISOString();
      setNotes((list) => {
        const rest = list
          .filter((n) => n.id !== res.note.id)
          .map((n) => (n.id === note.id ? { ...n, deletedAt: stamp, lessonId: null } : n));
        return [res.note, ...rest];
      });
      setSelectedId(res.note.id);
      toast.success(
        `Fusionnée dans ta note sur « ${lesson.title} ». L'ancienne est dans la corbeille.`,
      );
    } else {
      setNotes((list) => list.map((n) => (n.id === note.id ? res.note : n)));
      toast.success(`Rattachée à « ${lesson.title} ».`);
    }
  };

  const detach = (note: SerializedNote): void => {
    const before = { ...note };
    patchNote(note.id, {
      lessonId: null,
      lessonSlug: null,
      lessonTitle: null,
      lessonCategory: null,
      pathTitle: null,
      pathSlug: null,
    });
    void detachNoteAction({ noteId: note.id }).then((res) => {
      if (!res.ok) {
        patchNote(note.id, before);
        toast.error("Impossible de détacher la note.");
      } else {
        toast.success("Note détachée : elle devient une note libre.");
      }
    });
  };

  const exportNote = (note: SerializedNote, format: "md" | "pdf"): void => {
    if (format === "pdf") {
      void downloadPdf(`note=${encodeURIComponent(note.id)}`, note.title);
      return;
    }
    const content = noteFileContent(toArchive(note), window.location.origin);
    downloadBytes(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
      `${safeFileName(note.title)}.md`,
      "text/markdown",
    );
  };

  const exportZip = (
    rootFolderId: string | null,
    list: readonly SerializedNote[],
    name: string,
  ): void => {
    if (list.length === 0 && rootFolderId === null) {
      toast.error("Aucune note à exporter.");
      return;
    }
    const bytes = buildNotesZip({
      notes: list.map(toArchive),
      folders,
      rootFolderId,
      rootName: name,
      siteUrl: window.location.origin,
    });
    downloadBytes(bytes, `${safeFileName(name, "notes")} - ${today()}.zip`, "application/zip");
    toast.success(
      `${String(list.length)} note${list.length > 1 ? "s" : ""} exportée${list.length > 1 ? "s" : ""} en .zip.`,
    );
  };

  // ── Folders ──────────────────────────────────────────────────────────────
  const submitFolder = (draft: FolderDraft): void => {
    if (!folderDialog) return;
    if (folderDialog.mode === "create") {
      void createFolderAction({
        name: draft.name,
        color: draft.color,
        icon: draft.icon,
        parentId: draft.parentId,
      }).then((res) => {
        if (!res.ok || !res.folder) {
          toast.error(res.error ?? "Création impossible.");
          return;
        }
        const folder = res.folder;
        setFolders((list) => [...list, folder]);
        if (draft.parentId) {
          setExpanded((set) => {
            const next = new Set(set).add(draft.parentId ?? "");
            saveExpanded(next);
            return next;
          });
        }
        setView({ kind: "folder", id: folder.id });
      });
      return;
    }
    const id = folderDialog.folderId;
    const old = folders.find((f) => f.id === id);
    if (!old) return;
    setFolders((list) =>
      list.map((f) =>
        f.id === id ? { ...f, name: draft.name, color: draft.color, icon: draft.icon } : f,
      ),
    );
    void Promise.all([
      draft.name !== old.name
        ? renameFolderAction({ folderId: id, name: draft.name })
        : Promise.resolve({ ok: true }),
      draft.color !== old.color
        ? recolorFolderAction({ folderId: id, color: draft.color })
        : Promise.resolve({ ok: true }),
      draft.icon !== (old.icon ?? FOLDER_DEFAULT_ICON)
        ? reiconFolderAction({ folderId: id, icon: draft.icon })
        : Promise.resolve({ ok: true }),
    ]).then((results) => {
      if (results.some((r) => !r.ok)) {
        setFolders((list) => list.map((f) => (f.id === id ? old : f)));
        toast.error("Modification impossible.");
      }
    });
  };

  const renameFolderInline = (id: string, name: string | null): void => {
    setRenamingFolder(null);
    const old = folders.find((f) => f.id === id);
    const next = name?.trim();
    if (!old || !next || next === old.name) return;
    setFolders((list) => list.map((f) => (f.id === id ? { ...f, name: next } : f)));
    void renameFolderAction({ folderId: id, name: next }).then((res) => {
      if (!res.ok) {
        setFolders((list) => list.map((f) => (f.id === id ? old : f)));
        toast.error("Renommage impossible.");
      }
    });
  };

  const moveFolder = (id: string, parentId: string | null): void => {
    const old = folders.find((f) => f.id === id);
    if (!old || old.parentId === parentId) return;
    setFolders((list) => list.map((f) => (f.id === id ? { ...f, parentId } : f)));
    void moveFolderAction({ folderId: id, parentId }).then((res) => {
      if (!res.ok) {
        setFolders((list) => list.map((f) => (f.id === id ? old : f)));
        toast.error(res.error);
        return;
      }
      if (parentId) {
        setExpanded((set) => {
          const next = new Set(set).add(parentId);
          saveExpanded(next);
          return next;
        });
      }
    });
  };

  const deleteFolder = (folder: SerializedFolder, mode: "lift" | "trash"): void => {
    setFolderDelete(null);
    void deleteFolderAction({ folderId: folder.id, mode }).then((res) => {
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      const subtree = new Set([folder.id, ...folderDescendants(parents, folder.id)]);
      const parentId = parents.get(folder.id) ?? null;
      if (mode === "lift") {
        setFolders((list) =>
          list
            .filter((f) => f.id !== folder.id)
            .map((f) => (f.parentId === folder.id ? { ...f, parentId } : f)),
        );
        setNotes((list) =>
          list.map((n) => (n.folderId === folder.id ? { ...n, folderId: parentId } : n)),
        );
      } else {
        const stamp = new Date().toISOString();
        setFolders((list) => list.filter((f) => !subtree.has(f.id)));
        setNotes((list) =>
          list.map((n) =>
            n.folderId !== null && subtree.has(n.folderId)
              ? { ...n, folderId: null, deletedAt: n.deletedAt ?? stamp, lessonId: null }
              : n,
          ),
        );
        refreshCards();
      }
      if (view.kind === "folder" && subtree.has(view.id)) setView({ kind: "all" });
      toast.success(
        mode === "trash" && res.trashed > 0
          ? `Dossier supprimé, ${String(res.trashed)} note${res.trashed > 1 ? "s" : ""} dans la corbeille.`
          : "Dossier supprimé.",
      );
    });
  };

  const toggleFolder = (id: string): void => {
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveExpanded(next);
      return next;
    });
  };

  // ── Selection ────────────────────────────────────────────────────────────
  const check = (id: string, mode: "toggle" | "range"): void => {
    setChecked((set) => {
      const next = new Set(set);
      if (mode === "range" && lastChecked.current) {
        const ids = visible.map((n) => n.id);
        const a = ids.indexOf(lastChecked.current);
        const b = ids.indexOf(id);
        if (a >= 0 && b >= 0) {
          for (const x of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(x);
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    lastChecked.current = id;
  };
  useEffect(() => {
    setChecked(new Set());
  }, [view]);

  // ── Menus ────────────────────────────────────────────────────────────────
  const noteMenu = (
    point: { x: number; y: number },
    anchor: HTMLElement,
    note: SerializedNote,
  ): void => {
    const entries: MenuEntry[] = note.deletedAt
      ? [
          {
            kind: "item",
            id: "restore",
            label: "Restaurer",
            onSelect: () => void restoreNotes([note.id]),
          },
          { kind: "separator", id: "s1" },
          {
            kind: "item",
            id: "purge",
            label: "Supprimer définitivement",
            danger: true,
            onSelect: () => {
              purgeNotes([note.id]);
            },
          },
        ]
      : [
          {
            kind: "item",
            id: "open",
            label: "Ouvrir",
            onSelect: () => {
              openNote(note.id);
            },
          },
          {
            kind: "item",
            id: "pin",
            label: note.pinned ? "Désépingler" : "Épingler",
            onSelect: () => {
              togglePin(note);
            },
          },
          {
            kind: "item",
            id: "move",
            label: "Déplacer vers…",
            onSelect: () => {
              setMovePicker({ kind: "notes", ids: [note.id], current: note.folderId });
            },
          },
          note.lessonId
            ? {
                kind: "item",
                id: "detach",
                label: "Détacher de la leçon",
                onSelect: () => {
                  detach(note);
                },
              }
            : {
                kind: "item",
                id: "attach",
                label: "Rattacher à une leçon…",
                onSelect: () => {
                  setLessonPicker(note);
                },
              },
          { kind: "separator", id: "s1" },
          {
            kind: "item",
            id: "md",
            label: "Exporter en .md",
            onSelect: () => {
              exportNote(note, "md");
            },
          },
          {
            kind: "item",
            id: "pdf",
            label: "Exporter en PDF",
            onSelect: () => {
              exportNote(note, "pdf");
            },
          },
          {
            kind: "item",
            id: "share",
            label: "Partager…",
            onSelect: () => {
              setSharing(note);
            },
          },
          { kind: "separator", id: "s2" },
          {
            kind: "item",
            id: "trash",
            label: "Mettre à la corbeille",
            danger: true,
            onSelect: () => void trashNotes([note.id]),
          },
        ];
    openMenu({ x: point.x, y: point.y, label: note.title, entries, returnFocus: anchor });
  };

  const folderMenu = (
    point: { x: number; y: number },
    anchor: HTMLElement,
    folder: SerializedFolder,
  ): void => {
    const scope = new Set([folder.id, ...folderDescendants(parents, folder.id)]);
    const inside = live.filter((n) => n.folderId !== null && scope.has(n.folderId));
    const entries: MenuEntry[] = [
      {
        kind: "item",
        id: "new-note",
        label: "Nouvelle note ici",
        onSelect: () => void createNote("Nouvelle note", folder.id),
      },
      {
        kind: "item",
        id: "new-sub",
        label: "Nouveau sous-dossier",
        onSelect: () => {
          setFolderDialog({
            mode: "create",
            draft: { ...EMPTY_FOLDER_DRAFT, parentId: folder.id },
          });
        },
      },
      { kind: "separator", id: "s1" },
      {
        kind: "item",
        id: "rename",
        label: "Renommer",
        onSelect: () => {
          setRenamingFolder(folder.id);
        },
      },
      {
        kind: "item",
        id: "edit",
        label: "Couleur et icône…",
        onSelect: () => {
          setFolderDialog({
            mode: "edit",
            folderId: folder.id,
            draft: {
              name: folder.name,
              color: folder.color,
              icon: (FOLDER_ICON_NAMES as readonly string[]).includes(folder.icon ?? "")
                ? (folder.icon as FolderIconName) // checked against FOLDER_ICON_NAMES above
                : FOLDER_DEFAULT_ICON,
              parentId: folder.parentId,
            },
          });
        },
      },
      {
        kind: "item",
        id: "move",
        label: "Déplacer vers…",
        onSelect: () => {
          setMovePicker({ kind: "folder", id: folder.id, current: parents.get(folder.id) ?? null });
        },
      },
      { kind: "separator", id: "s2" },
      {
        kind: "item",
        id: "review",
        label: "Réviser les cartes du dossier",
        disabled: inside.length === 0,
        onSelect: () => {
          setReview({ label: folder.name, noteIds: inside.map((n) => n.id) });
        },
      },
      {
        kind: "item",
        id: "zip",
        label: "Exporter le dossier (.zip)",
        onSelect: () => {
          exportZip(folder.id, live, folder.name);
        },
      },
      {
        kind: "item",
        id: "pdf",
        label: "Exporter le dossier (PDF)",
        disabled: inside.length === 0,
        onSelect: () => void downloadPdf(`folder=${encodeURIComponent(folder.id)}`, folder.name),
      },
      { kind: "separator", id: "s3" },
      {
        kind: "item",
        id: "delete",
        label: "Supprimer le dossier…",
        danger: true,
        onSelect: () => {
          setFolderDelete(folder);
        },
      },
    ];
    openMenu({ x: point.x, y: point.y, label: folder.name, entries, returnFocus: anchor });
  };

  // ── Links between notes ──────────────────────────────────────────────────
  const resolveLink = useCallback(
    (target: string): string | null => {
      const n = byTitle.get(fold(target));
      return n ? `/notes?note=${encodeURIComponent(n.id)}` : null;
    },
    [byTitle],
  );
  const openLink = useCallback(
    (target: string): void => {
      const n = byTitle.get(fold(target));
      if (n) openNote(n.id);
    },
    [byTitle, openNote],
  );
  const createLinked = useCallback(
    (target: string): void => {
      void createNote(target, selected?.folderId ?? null);
    },
    // createNote reads the latest state on each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.folderId],
  );

  // ── Rendering ────────────────────────────────────────────────────────────
  const viewTitle =
    view.kind === "folder"
      ? (currentFolder?.name ?? "Dossier")
      : {
          all: "Toutes les notes",
          pinned: "Épinglées",
          free: "Notes libres",
          unfiled: "Sans dossier",
          received: "Reçues",
          trash: "Corbeille",
        }[view.kind];

  const showPane = !narrow || selected !== null;
  const showList = !narrow || selected === null;
  const checkedIds = [...checked];

  const listEmpty =
    view.kind === "trash" ? (
      <p>
        La corbeille est vide. Une note supprimée y reste {NOTE_TRASH_DAYS} jours avant d&apos;être
        effacée.
      </p>
    ) : query || category !== "ALL" || kind !== "any" ? (
      <p>Aucune note ne correspond à ta recherche.</p>
    ) : (
      <div>
        <p>
          {view.kind === "folder"
            ? "Ce dossier est vide. Glisse des notes dessus, ou crées-en une ici."
            : "Aucune note ici pour l'instant."}
        </p>
        <Btn variant="primary" onClick={() => void createNote()}>
          + Nouvelle note
        </Btn>
      </div>
    );

  return (
    <div
      className="page-container learning-catalogue learning-workspace notes-workspace nw"
      data-wide={wide && selected?.deletedAt === null ? "true" : undefined}
    >
      <header className="catalogue-masthead">
        <div className="catalogue-masthead__title">
          <p className="catalogue-masthead__eyebrow">Conserver / Ton savoir, avec tes mots</p>
          <h1>
            Bloc-notes<span>.</span>
          </h1>
          <p>Tes notes, libres ou liées aux leçons, rangées à ta façon.</p>
        </div>
        <div className="nw-head__actions">
          <Btn variant="primary" onClick={() => void createNote()}>
            + Nouvelle note
          </Btn>
          <Btn
            onClick={() => {
              setFolderDialog({
                mode: "create",
                draft: { ...EMPTY_FOLDER_DRAFT, parentId: currentFolder?.id ?? null },
              });
            }}
          >
            Nouveau dossier
          </Btn>
          <Btn
            onClick={() => {
              setImportOpen(true);
            }}
          >
            Importer
          </Btn>
          <div className="nw-menu">
            <Btn
              aria-haspopup="menu"
              aria-expanded={exportMenu}
              onClick={() => {
                setExportMenu((o) => !o);
              }}
            >
              Exporter ▾
            </Btn>
            {exportMenu ? (
              <div
                className="nw-menu__pop"
                role="menu"
                onMouseLeave={() => {
                  setExportMenu(false);
                }}
              >
                {currentFolder ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenu(false);
                        exportZip(currentFolder.id, live, currentFolder.name);
                      }}
                    >
                      « {currentFolder.name} » en .zip
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenu(false);
                        void downloadPdf(
                          `folder=${encodeURIComponent(currentFolder.id)}`,
                          currentFolder.name,
                        );
                      }}
                    >
                      « {currentFolder.name} » en PDF
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setExportMenu(false);
                    exportZip(null, live, ALL_NOTES_ROOT);
                  }}
                >
                  Toutes les notes en .zip
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setExportMenu(false);
                    void downloadPdf("scope=all", "Toutes mes notes");
                  }}
                >
                  Toutes les notes en PDF
                </button>
              </div>
            ) : null}
          </div>
          <Btn
            variant={cardCounts.due > 0 ? "primary" : "ghost"}
            className={`nw-btn nw-btn--${cardCounts.due > 0 ? "primary" : "ghost"} nw-review-btn`}
            onClick={() => {
              setReview({ label: "toutes tes notes" });
            }}
          >
            Réviser mes cartes{cardCounts.due > 0 ? ` (${String(cardCounts.due)})` : ""}
          </Btn>
        </div>
      </header>
      <div className="catalogue-ledger">
        <span>
          <b>{live.length}</b> note{live.length > 1 ? "s" : ""}
        </span>
        <span>
          <b>{folders.length}</b> dossier{folders.length > 1 ? "s" : ""}
        </span>
        <span>
          <b>{cardCounts.total}</b> carte{cardCounts.total > 1 ? "s" : ""}
        </span>
        <span className="catalogue-ledger__total">Ton carnet personnel</span>
      </div>

      <div className="nw-grid" ref={gridRef} data-narrow={narrow ? "true" : undefined}>
        {narrow ? (
          <button
            type="button"
            className="nw-tree-toggle"
            aria-expanded={treeOpen}
            onClick={() => {
              setTreeOpen((o) => !o);
            }}
          >
            ☰ {viewTitle}
          </button>
        ) : null}
        <aside className="nw-col nw-col--tree" hidden={narrow && !treeOpen}>
          <FolderTree
            folders={folders}
            notes={live}
            incomingCount={incoming.length}
            trashCount={trash.length}
            view={view}
            onView={(v) => {
              setView(v);
              setTreeOpen(false);
              if (narrow) setSelectedId(null);
            }}
            expanded={expanded}
            onToggle={toggleFolder}
            onDropNotes={(ids, folderId) => void moveNotes(ids, folderId)}
            onDropFolder={moveFolder}
            onFolderMenu={folderMenu}
            onNewFolder={(parentId) => {
              setFolderDialog({ mode: "create", draft: { ...EMPTY_FOLDER_DRAFT, parentId } });
            }}
            renamingId={renamingFolder}
            onRename={renameFolderInline}
            onStartRename={setRenamingFolder}
          />
        </aside>

        {showList ? (
          <section className="nw-col nw-col--list" aria-label={viewTitle}>
            <div className="nw-list__head">
              <h2>{viewTitle}</h2>
              {view.kind === "trash" && trash.length > 0 ? (
                <Btn
                  variant="quiet"
                  className="nw-btn nw-btn--quiet nw-btn--danger-text"
                  onClick={emptyTrash}
                >
                  Vider
                </Btn>
              ) : null}
            </div>
            {view.kind !== "received" ? (
              <div className="nw-filters">
                <input
                  ref={searchRef}
                  type="search"
                  className="nw-search"
                  placeholder="Chercher dans mes notes… ( / )"
                  aria-label="Chercher dans mes notes"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                />
                <div className="nw-filters__row">
                  <select
                    aria-label="Catégorie"
                    value={category}
                    onChange={(e) => {
                      setCategory(pick(CATEGORIES, e.target.value, "ALL"));
                    }}
                  >
                    <option value="ALL">Toutes catégories</option>
                    <option value="CYBERSEC">Cybersec</option>
                    <option value="DEV">Dev</option>
                    <option value="NETWORK">Réseau</option>
                  </select>
                  <select
                    aria-label="Type de note"
                    value={kind}
                    onChange={(e) => {
                      setKind(pick(KINDS, e.target.value, "any"));
                    }}
                  >
                    <option value="any">Toutes</option>
                    <option value="lesson">Liées à une leçon</option>
                    <option value="free">Libres</option>
                  </select>
                  <select
                    aria-label="Trier"
                    value={sort}
                    onChange={(e) => {
                      setSort(pick(SORTS, e.target.value, "updated"));
                    }}
                  >
                    <option value="updated">Modifiées récemment</option>
                    <option value="created">Créées récemment</option>
                    <option value="title">Titre (A→Z)</option>
                  </select>
                </div>
              </div>
            ) : null}

            {checked.size > 0 ? (
              <div className="nw-bulk" role="toolbar" aria-label="Notes sélectionnées">
                <span>
                  {checked.size} sélectionnée{checked.size > 1 ? "s" : ""}
                </span>
                {view.kind === "trash" ? (
                  <>
                    <Btn variant="quiet" onClick={() => void restoreNotes(checkedIds)}>
                      Restaurer
                    </Btn>
                    <Btn
                      variant="quiet"
                      className="nw-btn nw-btn--quiet nw-btn--danger-text"
                      onClick={() => {
                        purgeNotes(checkedIds);
                      }}
                    >
                      Supprimer
                    </Btn>
                  </>
                ) : (
                  <>
                    <Btn
                      variant="quiet"
                      onClick={() => {
                        setMovePicker({ kind: "notes", ids: checkedIds, current: null });
                      }}
                    >
                      Déplacer
                    </Btn>
                    <Btn
                      variant="quiet"
                      onClick={() => {
                        exportZip(
                          null,
                          live.filter((n) => checked.has(n.id)),
                          "Sélection",
                        );
                      }}
                    >
                      .zip
                    </Btn>
                    <Btn
                      variant="quiet"
                      className="nw-btn nw-btn--quiet nw-btn--danger-text"
                      onClick={() => void trashNotes(checkedIds)}
                    >
                      Corbeille
                    </Btn>
                  </>
                )}
                <Btn
                  variant="quiet"
                  onClick={() => {
                    setChecked(new Set());
                  }}
                  aria-label="Tout désélectionner"
                >
                  ×
                </Btn>
              </div>
            ) : visible.length > 1 && view.kind !== "received" ? (
              <button
                type="button"
                className="nw-select-all"
                onClick={() => {
                  setChecked(new Set(visible.map((n) => n.id)));
                }}
              >
                Tout sélectionner
              </button>
            ) : null}

            {view.kind === "received" ? (
              incoming.length === 0 ? (
                <div className="nw-list__empty">
                  <p>Personne ne t&apos;a encore partagé de note.</p>
                </div>
              ) : (
                <ul className="nw-list" aria-label="Notes reçues">
                  {incoming.map((n) => (
                    <li key={n.id} className="nw-row">
                      <button
                        type="button"
                        className="nw-row__open"
                        onClick={() => {
                          setReading(n);
                        }}
                      >
                        <span className="nw-row__top">
                          <span className="nw-row__title">{n.title}</span>
                        </span>
                        <span className="nw-row__meta">
                          <span className="nw-accent">de {n.authorName}</span>
                          {n.lessonTitle ? (
                            <span className="nw-row__path">{n.lessonTitle}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <NoteList
                notes={visible}
                folders={folders}
                selectedId={selectedId}
                checked={checked}
                now={now}
                trash={view.kind === "trash"}
                trashDays={NOTE_TRASH_DAYS}
                onOpen={openNote}
                onCheck={check}
                onMenu={noteMenu}
                empty={listEmpty}
              />
            )}
          </section>
        ) : null}

        {showPane ? (
          <section className="nw-col nw-col--pane">
            {selected?.deletedAt === null ? (
              <NotePane
                key={selected.id}
                note={selected}
                folders={folders}
                linkTargets={linkTargets}
                backlinks={backlinks}
                resolveLink={resolveLink}
                onOpenLink={openLink}
                onCreateLink={createLinked}
                onOpenNote={openNote}
                onSaved={(id, patch) => {
                  patchNote(id, patch);
                }}
                onRename={renameNote}
                onPin={togglePin}
                onMove={(note) => {
                  setMovePicker({ kind: "notes", ids: [note.id], current: note.folderId });
                }}
                onAttach={setLessonPicker}
                onDetach={detach}
                onTrash={(note) => void trashNotes([note.id])}
                onShare={setSharing}
                onExport={exportNote}
                onCardsChanged={refreshCards}
                onBack={
                  narrow
                    ? () => {
                        setSelectedId(null);
                      }
                    : undefined
                }
                wide={wide}
                onToggleWide={
                  narrow
                    ? undefined
                    : () => {
                        toggleWide(!wide);
                      }
                }
              />
            ) : selected?.deletedAt ? (
              <article className="nw-pane nw-pane--trash">
                {narrow ? (
                  <button
                    type="button"
                    className="nw-pane__back"
                    onClick={() => {
                      setSelectedId(null);
                    }}
                  >
                    ← Corbeille
                  </button>
                ) : null}
                <p className="nw-kicker">Dans la corbeille</p>
                <h2 className="nw-pane__title nw-pane__title--static">{selected.title}</h2>
                <div className="nw-pane__actions">
                  <Btn variant="primary" onClick={() => void restoreNotes([selected.id])}>
                    Restaurer
                  </Btn>
                  <Btn
                    variant="danger"
                    onClick={() => {
                      purgeNotes([selected.id]);
                    }}
                  >
                    Supprimer définitivement
                  </Btn>
                </div>
                <div className="nw-pane__readonly">
                  {/* Read only: a note in the trash is restored before it is edited. */}
                  <RichNote markdown={selected.content} />
                </div>
              </article>
            ) : (
              <div className="nw-pane nw-pane--empty">
                <p className="nw-kicker">Bloc-notes</p>
                <h2>Ouvre une note, ou commence-en une.</h2>
                <ul className="nw-tips">
                  <li>
                    <code>[[Titre]]</code> relie deux notes ; la note citée liste celles qui mènent
                    à elle.
                  </li>
                  <li>
                    <code>question :: réponse</code> devient une carte de révision.
                  </li>
                  <li>
                    <code>[texte]{"{rouge}"}</code> colore, <code>==texte==</code> surligne,{" "}
                    <code>&gt; [!astuce]</code> encadre.
                  </li>
                  <li>
                    Glisse une note sur un dossier pour la ranger ; clic droit pour tout le reste.
                  </li>
                </ul>
                <Btn variant="primary" onClick={() => void createNote()}>
                  + Nouvelle note
                </Btn>
              </div>
            )}
          </section>
        ) : null}
      </div>

      {menu ? <ContextMenu menu={menu} onClose={closeMenu} /> : null}

      <FolderDialog
        open={folderDialog !== null}
        mode={folderDialog?.mode ?? "create"}
        initial={folderDialog?.draft ?? EMPTY_FOLDER_DRAFT}
        folders={folders}
        onSubmit={submitFolder}
        onClose={() => {
          setFolderDialog(null);
        }}
      />
      <FolderPickerDialog
        open={movePicker !== null}
        title={movePicker?.kind === "folder" ? "Déplacer le dossier vers…" : "Déplacer vers…"}
        folders={folders}
        movingFolderId={movePicker?.kind === "folder" ? movePicker.id : null}
        current={movePicker?.current ?? null}
        onPick={(target) => {
          if (!movePicker) return;
          if (movePicker.kind === "folder") moveFolder(movePicker.id, target);
          else void moveNotes(movePicker.ids, target);
          setChecked(new Set());
        }}
        onClose={() => {
          setMovePicker(null);
        }}
      />
      <LessonPickerDialog
        open={lessonPicker !== null}
        onPick={(lesson) => {
          const note = lessonPicker;
          setLessonPicker(null);
          if (note) void attach(note, lesson, "attach");
        }}
        onClose={() => {
          setLessonPicker(null);
        }}
      />
      <ConfirmDialog
        open={mergeAsk !== null}
        title="Fusionner les deux notes ?"
        confirmLabel="Fusionner"
        onConfirm={() => {
          if (mergeAsk) void attach(mergeAsk.note, mergeAsk.lesson, "merge");
        }}
        onClose={() => {
          setMergeAsk(null);
        }}
      >
        <p>
          Tu as déjà une note sur « {mergeAsk?.lesson.title} ». Une leçon n&apos;a qu&apos;une note
          : celle-ci sera ajoutée à la suite de l&apos;autre, puis placée dans la corbeille. Rien
          n&apos;est perdu.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        confirmLabel={confirm?.label ?? "Confirmer"}
        danger
        onConfirm={() => confirm?.run()}
        onClose={() => {
          setConfirm(null);
        }}
      >
        {confirm?.body}
      </ConfirmDialog>
      <ModalShell
        open={folderDelete !== null}
        onClose={() => {
          setFolderDelete(null);
        }}
        title={`Supprimer « ${folderDelete?.name ?? ""} » ?`}
        maxWidth={560}
        className="notes-workspace nw-dialog"
        actions={
          folderDelete ? (
            <>
              <Btn
                onClick={() => {
                  setFolderDelete(null);
                }}
              >
                Annuler
              </Btn>
              <Btn
                variant="danger"
                onClick={() => {
                  deleteFolder(folderDelete, "trash");
                }}
              >
                Notes à la corbeille
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  deleteFolder(folderDelete, "lift");
                }}
              >
                Garder les notes
              </Btn>
            </>
          ) : undefined
        }
      >
        <div className="nw-dialog__body">
          <p>
            <strong>Garder les notes</strong> : ses notes et sous-dossiers remontent d&apos;un
            niveau.
          </p>
          <p>
            <strong>Notes à la corbeille</strong> : ses notes, sous-dossiers compris, partent dans
            la corbeille ({NOTE_TRASH_DAYS} jours pour les récupérer) et ses sous-dossiers sont
            supprimés.
          </p>
        </div>
      </ModalShell>
      <ImportDialog
        open={importOpen}
        folders={folders}
        defaultFolderId={currentFolder?.id ?? null}
        onDone={() => {
          router.refresh();
        }}
        onClose={() => {
          setImportOpen(false);
        }}
      />
      <CardsReviewDialog
        open={review !== null}
        scopeLabel={review?.label ?? ""}
        noteIds={review?.noteIds}
        onClose={() => {
          setReview(null);
          refreshCards();
        }}
        onAnswered={() => undefined}
      />
      {sharing ? (
        <ModalShell
          open
          onClose={() => {
            setSharing(null);
          }}
          eyebrow="Partager"
          title={sharing.title}
          maxWidth={640}
          className="notes-workspace nw-dialog"
        >
          <div className="nw-dialog__body">
            <ShareDialog
              noteId={sharing.id}
              lessonTitle={sharing.title}
              onClose={() => {
                setSharing(null);
              }}
            />
          </div>
        </ModalShell>
      ) : null}
      {reading ? (
        <ReceivedNoteDialog
          note={reading}
          onClose={() => {
            setReading(null);
          }}
          onDismiss={async () => {
            const res = await dismissSharedNoteAction(reading.id);
            if (res.ok) setIncoming((list) => list.filter((n) => n.id !== reading.id));
            return res.ok;
          }}
          onReport={async (input) => {
            const res = await reportSharedNoteAction({ noteId: reading.id, ...input });
            if (res.ok) {
              setIncoming((list) => list.filter((n) => n.id !== reading.id));
              toast.success(NOTE_REPORT_SENT);
              return { ok: true };
            }
            return { ok: false, error: res.error };
          }}
        />
      ) : null}
    </div>
  );
}
