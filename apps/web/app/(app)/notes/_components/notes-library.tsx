"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Category } from "@cyberlearn/db";
import { noteExcerpt as excerpt, timeAgo } from "@cyberlearn/lib/notes/preview";
import {
  createFolderAction,
  deleteFolderAction,
  moveNoteAction,
  recolorFolderAction,
  reiconFolderAction,
  renameFolderAction,
} from "../_actions/folder-actions";
import { saveNoteAction } from "../_actions/note-actions";
import { dismissSharedNoteAction, reportSharedNoteAction } from "../_actions/share-actions";
import { NOTE_REPORT_SENT } from "@cyberlearn/lib/notes/report-reasons";
import {
  CAT,
  FOLDER_DEFAULT_COLOR,
  FOLDER_DEFAULT_ICON,
  FOLDER_ICON_NAMES,
  FOLDER_PALETTE,
  type FolderIconName,
  type SerializedFolder,
  type SerializedIncomingNote,
  type SerializedNote,
} from "./notes-shared";
import { AllNotesGlyph, FolderGlyph } from "./folder-icons";
import { NoteReader } from "./note-reader";
import styles from "./notes-library.module.css";
import { downloadMarkdown, notesToMarkdown } from "@/lib/notes/export";

// Payload key for the native drag-and-drop of note cards onto folders.
const DND_MIME = "application/x-cyberlearn-note";

export type { SerializedNote } from "./notes-shared";

const FILTERS: { key: "ALL" | Category; label: string }[] = [
  { key: "ALL", label: "Toutes" },
  { key: "CYBERSEC", label: "Cybersec" },
  { key: "DEV", label: "Dev" },
  { key: "NETWORK", label: "Réseau" },
];

const ALL = "__all__";
const NONE = "__none__";

export function NotesLibrary({
  notes: initialNotes,
  folders: initialFolders,
  incoming: receivedNotes,
  openNoteId = null,
}: {
  notes: SerializedNote[];
  folders: SerializedFolder[];
  /** Notes classmates have handed over. Read-only, and not filed anywhere. */
  incoming: SerializedIncomingNote[];
  /**
   * A note to open on arrival, from ?note= - the navbar search links straight
   * at the note it matched. An id that is not in this library opens nothing,
   * which is the whole of the check that is needed: the library only ever holds
   * the reader's own notes.
   */
  openNoteId?: string | null;
}): React.JSX.Element {
  const [notes, setNotes] = useState<SerializedNote[]>(initialNotes);
  const [folders, setFolders] = useState<SerializedFolder[]>(initialFolders);
  const [incomingId, setIncomingId] = useState<string | null>(null);
  // Local, as notes and folders are: a received note the reader masks leaves
  // the list at once rather than on the next visit.
  const [incoming, setIncoming] = useState<SerializedIncomingNote[]>(receivedNotes);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | Category>("ALL");
  const [selectedFolder, setSelectedFolder] = useState<string>(ALL);
  const [focusedFolder, setFocusedFolder] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [readerId, setReaderId] = useState<string | null>(openNoteId);
  const [now, setNow] = useState<number | null>(null);

  // Folder create form + rename drafts.
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(FOLDER_PALETTE[0] ?? null);
  const [newIcon, setNewIcon] = useState<FolderIconName>(FOLDER_DEFAULT_ICON);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});

  // Drag-and-drop of note cards onto folders.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  // NB: local state is authoritative once mounted. Every mutation updates it
  // optimistically and reverts on failure, so we deliberately do NOT re-absorb
  // revalidated props - doing so would clobber a still-pending optimistic update
  // (e.g. a concurrent move) with a stale server snapshot and flicker.

  const countFor = useCallback(
    (folderId: string | null): number =>
      notes.filter((n) => (n.folderId ?? null) === folderId).length,
    [notes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (filter !== "ALL" && n.lessonCategory !== filter) return false;
      if (selectedFolder === NONE && n.folderId !== null) return false;
      if (selectedFolder !== ALL && selectedFolder !== NONE && n.folderId !== selectedFolder) {
        return false;
      }
      if (!q) return true;
      return (
        n.lessonTitle.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.pathTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [notes, query, filter, selectedFolder]);

  // At the root, folders contain their notes. Search spans all folders.
  const groups = useMemo(() => {
    const knownIds = new Set(folders.map((folder) => folder.id));
    const visible =
      selectedFolder !== ALL || query.trim()
        ? filtered
        : filtered.filter((note) => note.folderId === null || !knownIds.has(note.folderId));
    return visible.length ? [{ id: selectedFolder, title: null, notes: visible }] : [];
  }, [filtered, folders, query, selectedFolder]);

  const visibleFolders =
    selectedFolder === ALL
      ? folders.filter((folder) => {
          const matchingNotes = filtered.some((note) => note.folderId === folder.id);
          const matchesName = folder.name.toLowerCase().includes(query.trim().toLowerCase());
          return (filter === "ALL" && matchesName) || matchingNotes;
        })
      : [];

  const openFolder = (id: string): void => {
    setSelectedFolder(id);
    setFocusedFolder(null);
  };

  const readerNote = readerId ? (notes.find((n) => n.id === readerId) ?? null) : null;
  const incomingNote = incomingId ? (incoming.find((n) => n.id === incomingId) ?? null) : null;
  // Notes from classmates belong to the library's front page, not to a folder
  // view or a search over the author's own notes.
  const showIncoming = incoming.length > 0 && selectedFolder === ALL && query.trim() === "";

  // ── Folder mutations (optimistic, revert on failure) ──────────────────────

  const handleCreateFolder = (): void => {
    const name = newName.trim();
    if (!name) return;
    void createFolderAction({ name, color: newColor, icon: newIcon }).then((res) => {
      if (res.ok && res.folder) {
        const created = res.folder;
        setFolders((prev) => [...prev, created]);
        setNewName("");
        toast.success("Dossier créé");
      } else {
        toast.error(res.error ?? "Création impossible");
      }
    });
  };

  const handleReicon = (folder: SerializedFolder, icon: FolderIconName): void => {
    const prevIcon = folder.icon;
    setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, icon } : f)));
    void reiconFolderAction({ folderId: folder.id, icon }).then((res) => {
      if (!res.ok) {
        setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, icon: prevIcon } : f)));
        toast.error("Changement d'icône impossible");
      }
    });
  };

  const handleRename = (folder: SerializedFolder): void => {
    const draft = (renameDrafts[folder.id] ?? folder.name).trim();
    if (!draft || draft === folder.name) {
      // Normalize the draft back to the canonical name (empty or unchanged).
      setRenameDrafts((prev) => ({ ...prev, [folder.id]: folder.name }));
      return;
    }
    const prevName = folder.name;
    setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, name: draft } : f)));
    setRenameDrafts((prev) => ({ ...prev, [folder.id]: draft }));
    void renameFolderAction({ folderId: folder.id, name: draft }).then((res) => {
      if (!res.ok) {
        setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, name: prevName } : f)));
        setRenameDrafts((prev) => ({ ...prev, [folder.id]: prevName }));
        toast.error("Renommage impossible");
      }
    });
  };

  const handleRecolor = (folder: SerializedFolder, color: string | null): void => {
    const prevColor = folder.color;
    setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, color } : f)));
    void recolorFolderAction({ folderId: folder.id, color }).then((res) => {
      if (!res.ok) {
        setFolders((prev) =>
          prev.map((f) => (f.id === folder.id ? { ...f, color: prevColor } : f)),
        );
        toast.error("Changement de couleur impossible");
      }
    });
  };

  const handleDeleteFolder = (folder: SerializedFolder): void => {
    if (
      !window.confirm(
        `Supprimer le dossier « ${folder.name} » ? Les notes iront dans Sans dossier.`,
      )
    ) {
      return;
    }
    const prevFolders = folders;
    const affected = notes.filter((n) => n.folderId === folder.id).map((n) => n.id);
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setNotes((prev) => prev.map((n) => (n.folderId === folder.id ? { ...n, folderId: null } : n)));
    if (selectedFolder === folder.id) setSelectedFolder(ALL);
    void deleteFolderAction({ folderId: folder.id }).then((res) => {
      if (!res.ok) {
        setFolders(prevFolders);
        setNotes((prev) =>
          prev.map((n) => (affected.includes(n.id) ? { ...n, folderId: folder.id } : n)),
        );
        toast.error("Suppression impossible");
      }
    });
  };

  const handleMove = (noteId: string, folderId: string | null): void => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const prevFolder = target.folderId;
    if (prevFolder === folderId) return; // already there: no-op (avoids a wasted call)
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, folderId } : n)));
    void moveNoteAction({ noteId, folderId }).then((res) => {
      if (res.ok) {
        toast.success(folderId ? "Note déplacée" : "Note retirée du dossier");
      } else {
        setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, folderId: prevFolder } : n)));
        toast.error("Déplacement impossible");
      }
    });
  };

  // Drop-target props for a folder key (NONE = "Sans dossier", or a folder id).
  const dropProps = (key: string, folderId: string | null) => ({
    onDragOver: (e: React.DragEvent): void => {
      if (!draggingId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragOverKey !== key) setDragOverKey(key);
    },
    onDragLeave: (): void => {
      setDragOverKey((k) => (k === key ? null : k));
    },
    onDrop: (e: React.DragEvent): void => {
      e.preventDefault();
      const id = e.dataTransfer.getData(DND_MIME) || draggingId;
      setDragOverKey(null);
      setDraggingId(null);
      if (id) handleMove(id, folderId);
    },
  });

  // Drag-source props for a note card.
  const dragProps = (noteId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent): void => {
      e.dataTransfer.setData(DND_MIME, noteId);
      e.dataTransfer.effectAllowed = "move";
      setDraggingId(noteId);
    },
    onDragEnd: (): void => {
      setDraggingId(null);
      setDragOverKey(null);
    },
  });

  const handleSaveContent = async (noteId: string, content: string): Promise<boolean> => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return false;
    const res = await saveNoteAction({ lessonId: target.lessonId, content });
    if (res.ok) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? {
                ...n,
                content,
                wordCount: res.wordCount ?? n.wordCount,
                updatedAt: res.savedAt ?? n.updatedAt,
              }
            : n,
        ),
      );
      toast.success("Note enregistrée");
      return true;
    }
    toast.error(res.error ?? "Enregistrement impossible");
    return false;
  };

  const exportAll = (): void => {
    if (filtered.length === 0) {
      toast.error("Aucune note à exporter");
      return;
    }
    const heading =
      selectedFolder === ALL
        ? "Mes notes"
        : selectedFolder === NONE
          ? "Sans dossier"
          : (folders.find((f) => f.id === selectedFolder)?.name ?? "Mes notes");
    const md = notesToMarkdown(
      filtered.map((n) => ({
        lessonTitle: n.lessonTitle,
        lessonSlug: n.lessonSlug,
        pathTitle: n.pathTitle,
        categoryLabel: CAT[n.lessonCategory].label,
        content: n.content,
        updatedAt: n.updatedAt,
      })),
      heading,
    );
    downloadMarkdown(heading, md);
  };

  return (
    <div
      className="page-container"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "40px clamp(16px,4vw,48px)" }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--cosmetic-accent)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span aria-hidden="true" style={{ width: 24, height: 1, background: "#2A2560" }} />
        Cyber Learn · Apprentissage
      </div>
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 800,
          fontSize: "clamp(34px,5vw,52px)",
          letterSpacing: "-0.03em",
          color: "#F5F5FA",
          margin: "0 0 10px",
        }}
      >
        Bloc-<span style={{ color: "var(--cosmetic-accent)" }}>notes</span>
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 15,
          color: "#B8B5D1",
          maxWidth: 620,
          margin: "0 0 30px",
        }}
      >
        Relis tes notes sans rouvrir la leçon, range-les dans des dossiers, et exporte-les en
        markdown quand tu veux.
      </p>

      {/* Search + domain filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 300px", minWidth: 0 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="#7F7BA9"
            strokeWidth={1.5}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3 3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="/ chercher dans mes notes..."
            aria-label="Chercher dans mes notes"
            style={{
              width: "100%",
              height: 44,
              padding: "0 14px 0 38px",
              background: "rgba(5,4,26,0.6)",
              border: "1px solid #2A2560",
              color: "#F5F5FA",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const color = f.key === "ALL" ? "var(--cosmetic-accent)" : CAT[f.key].color;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? "#05041A" : "#B8B5D1",
                  background: active ? color : "transparent",
                  border: `1px solid ${active ? color : "#2A2560"}`,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                {f.key !== "ALL" && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: active ? "#05041A" : color,
                    }}
                  />
                )}
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Folder bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          paddingBottom: 16,
          marginBottom: 22,
          borderBottom: "1px solid #1F1B47",
        }}
      >
        <FolderPill
          label="Mes dossiers"
          count={folders.length}
          icon={
            <AllNotesGlyph color={selectedFolder === ALL ? "#05041A" : "var(--cosmetic-accent)"} />
          }
          active={selectedFolder === ALL}
          onClick={() => {
            setSelectedFolder(ALL);
          }}
        />
        <FolderPill
          label="Sans dossier"
          count={countFor(null)}
          icon={
            <FolderGlyph
              name="folder"
              color={selectedFolder === NONE ? "#05041A" : FOLDER_DEFAULT_COLOR}
            />
          }
          active={selectedFolder === NONE}
          onClick={() => {
            setSelectedFolder(NONE);
          }}
          droppable
          dragActive={draggingId !== null}
          dragOver={dragOverKey === NONE}
          dropHandlers={dropProps(NONE, null)}
        />
        {selectedFolder !== ALL && selectedFolder !== NONE ? (
          <span className={styles.breadcrumb} aria-current="page">
            / {folders.find((folder) => folder.id === selectedFolder)?.name}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setManageOpen((v) => !v);
          }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: manageOpen ? "#05041A" : "#8B88A8",
            background: manageOpen ? "var(--cosmetic-accent)" : "transparent",
            border: "1px dashed #2A2560",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          ⚙ Gérer
        </button>
        <button
          type="button"
          onClick={exportAll}
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#B8B5D1",
            background: "transparent",
            border: "1px solid #2A2560",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          ↧ Exporter tout
        </button>
      </div>

      {/* Manage folders panel */}
      {manageOpen && (
        <div
          style={{
            border: "1px solid #2A2560",
            background: "rgba(5,4,26,0.5)",
            padding: 18,
            marginBottom: 26,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Create */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
              placeholder="Nom du nouveau dossier"
              aria-label="Nom du nouveau dossier"
              maxLength={40}
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                height: 38,
                padding: "0 12px",
                background: "rgba(3,2,25,0.6)",
                border: "1px solid #2A2560",
                color: "#F5F5FA",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <PaletteDots
              value={newColor}
              onPick={(c) => {
                setNewColor(c);
              }}
            />
            <IconDots
              value={newIcon}
              color={newColor ?? FOLDER_DEFAULT_COLOR}
              onPick={(ic) => {
                setNewIcon(ic);
              }}
            />
            <button
              type="button"
              onClick={handleCreateFolder}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#05041A",
                background: "var(--cosmetic-accent)",
                border: "1px solid var(--cosmetic-accent)",
                padding: "9px 14px",
                cursor: "pointer",
              }}
            >
              Créer
            </button>
          </div>

          {folders.length === 0 ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7F7BA9" }}>
              {"Aucun dossier pour l'instant. Crée-en un ci-dessus."}
            </div>
          ) : (
            folders.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 10,
                  paddingTop: 12,
                  borderTop: "1px solid #1F1B47",
                }}
              >
                <PaletteDots
                  value={f.color}
                  onPick={(c) => {
                    handleRecolor(f, c);
                  }}
                />
                <IconDots
                  value={f.icon ?? FOLDER_DEFAULT_ICON}
                  color={f.color ?? FOLDER_DEFAULT_COLOR}
                  onPick={(ic) => {
                    handleReicon(f, ic);
                  }}
                />
                <input
                  value={renameDrafts[f.id] ?? f.name}
                  onChange={(e) => {
                    setRenameDrafts((prev) => ({ ...prev, [f.id]: e.target.value }));
                  }}
                  onBlur={() => {
                    handleRename(f);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  maxLength={40}
                  aria-label={`Renommer ${f.name}`}
                  style={{
                    flex: "1 1 160px",
                    minWidth: 0,
                    height: 34,
                    padding: "0 10px",
                    background: "rgba(3,2,25,0.6)",
                    border: "1px solid #2A2560",
                    color: "#F5F5FA",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "#7F7BA9",
                    minWidth: 54,
                  }}
                >
                  {countFor(f.id)} note{countFor(f.id) > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteFolder(f);
                  }}
                  aria-label={`Supprimer ${f.name}`}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#FF6B7A",
                    background: "transparent",
                    border: "1px solid rgba(255,71,87,0.4)",
                    padding: "7px 11px",
                    cursor: "pointer",
                  }}
                >
                  Supprimer
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes handed over by classmates. Only shown when there are any: an
          empty "reçues" block on every student's page would be furniture. */}
      {showIncoming ? (
        <section className={styles.folderSection} aria-label="Notes reçues">
          <div className={styles.folderHeading}>
            <h2>Reçues</h2>
            <span>
              {incoming.length} note{incoming.length > 1 ? "s" : ""} partagée
              {incoming.length > 1 ? "s" : ""} avec toi
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
              gap: 16,
            }}
          >
            {incoming.map((n) => {
              const cat = CAT[n.lessonCategory];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setIncomingId(n.id);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: 18,
                    textAlign: "left",
                    background: "rgba(5,4,26,0.5)",
                    border: "1px solid #1F1B47",
                    borderLeft: `3px solid ${cat.color}`,
                    cursor: "pointer",
                    minHeight: 150,
                    font: "inherit",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
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
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#F5F5FA",
                      lineHeight: 1.25,
                    }}
                  >
                    {n.lessonTitle}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      color: "#8B88A8",
                      lineHeight: 1.5,
                    }}
                  >
                    {excerpt(n.content) || "Note vide"}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "#7F7BA9",
                      borderTop: "1px solid #1F1B47",
                      paddingTop: 10,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--cosmetic-accent)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.authorName}
                    </span>
                    <span suppressHydrationWarning style={{ flexShrink: 0 }}>
                      {timeAgo(n.sharedAt, now)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {selectedFolder === ALL && visibleFolders.length > 0 ? (
        <section className={styles.folderSection} aria-label="Dossiers">
          <div className={styles.folderHeading}>
            <h2>Dossiers</h2>
            <span>Double-clique pour ouvrir</span>
          </div>
          <div className={styles.folderGrid}>
            {visibleFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={styles.folderTile}
                aria-label={"Ouvrir le dossier " + folder.name}
                // Selection is only visual: aria-pressed made this a toggle, which
                // screen readers announce like a checkbox, for a button whose
                // action (Enter, a double click, a tap) is to open the folder.
                data-selected={focusedFolder === folder.id}
                data-drop-active={dragOverKey === folder.id}
                onClick={(event) => {
                  if (event.detail === 0) openFolder(folder.id);
                  else setFocusedFolder(folder.id);
                }}
                onDoubleClick={() => {
                  openFolder(folder.id);
                }}
                onPointerUp={(event) => {
                  if (event.pointerType === "touch") openFolder(folder.id);
                }}
                {...dropProps(folder.id, folder.id)}
              >
                <span
                  className={styles.folderArtwork}
                  style={{ color: folder.color ?? FOLDER_DEFAULT_COLOR }}
                >
                  <svg viewBox="0 0 100 80" width="100" height="80" fill="none" aria-hidden="true">
                    <path
                      d="M6 25V10h32l11 11h45v51H6Z"
                      fill="currentColor"
                      fillOpacity=".06"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M6 29h88M6 64v8h8M86 72h8v-8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span className={styles.folderBadge}>
                    <FolderGlyph name={folder.icon} color="currentColor" size={22} />
                  </span>
                </span>
                <strong>{folder.name}</strong>
                <span>
                  {countFor(folder.id)} note{countFor(folder.id) > 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Groups */}
      {groups.length === 0 && visibleFolders.length > 0 ? null : groups.length === 0 ? (
        <div
          style={{
            border: "1px dashed #2A2560",
            padding: "48px 24px",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "#7F7BA9",
          }}
        >
          {notes.length === 0
            ? "Aucune note pour l'instant. Ouvre une leçon et note ce qui compte, ça apparaîtra ici."
            : selectedFolder !== ALL && !query.trim() && filter === "ALL"
              ? "Ce dossier est vide. Déplace une note ici depuis son menu."
              : "Aucune note ne correspond à ta recherche."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {showIncoming && (
            <div className={styles.folderHeading} style={{ marginBottom: -12 }}>
              <h2>Mes notes</h2>
            </div>
          )}
          {groups.map((g) => {
            return (
              <section key={g.id}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                    gap: 16,
                  }}
                >
                  {g.notes.map((n) => {
                    const cat = CAT[n.lessonCategory];
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setReaderId(n.id);
                        }}
                        {...dragProps(n.id)}
                        className="note-card"
                        title="Glisse cette note vers un dossier, ou clique pour l'ouvrir"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          padding: 18,
                          textAlign: "left",
                          background: "rgba(5,4,26,0.5)",
                          border: "1px solid #1F1B47",
                          borderLeft: `3px solid ${cat.color}`,
                          cursor: draggingId === n.id ? "grabbing" : "grab",
                          opacity: draggingId === n.id ? 0.45 : 1,
                          minHeight: 150,
                          font: "inherit",
                          color: "inherit",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            fontFamily: "var(--font-mono)",
                            fontSize: 9.5,
                            fontWeight: 700,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: cat.color,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: cat.color,
                            }}
                          />
                          {cat.label}
                          {n.pathTitle ? (
                            <span style={{ color: "#7F7BA9", letterSpacing: "0.06em" }}>
                              · {n.pathTitle}
                            </span>
                          ) : null}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontWeight: 700,
                            fontSize: 15,
                            color: "#F5F5FA",
                            lineHeight: 1.25,
                          }}
                        >
                          {n.lessonTitle}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontFamily: "var(--font-body)",
                            fontSize: 13,
                            color: "#8B88A8",
                            lineHeight: 1.5,
                          }}
                        >
                          {excerpt(n.content) || "Note vide"}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                            color: "#7F7BA9",
                            borderTop: "1px solid #1F1B47",
                            paddingTop: 10,
                          }}
                        >
                          <span suppressHydrationWarning>{timeAgo(n.updatedAt, now)}</span>
                          <span>
                            {n.wordCount} mot{n.wordCount > 1 ? "s" : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {readerNote && (
        <NoteReader
          note={readerNote}
          folders={folders}
          onClose={() => {
            setReaderId(null);
          }}
          onMove={(folderId) => {
            handleMove(readerNote.id, folderId);
          }}
          onSaveContent={(content) => handleSaveContent(readerNote.id, content)}
        />
      )}

      {incomingNote && (
        <NoteReader
          note={incomingNote}
          folders={[]}
          sharedBy={incomingNote.authorName}
          onClose={() => {
            setIncomingId(null);
          }}
          onDismiss={async () => {
            const { ok } = await dismissSharedNoteAction(incomingNote.id);
            if (ok) {
              const id = incomingNote.id;
              setIncomingId(null);
              setIncoming((prev) => prev.filter((n) => n.id !== id));
              // No excerpt: the reason to mask a note can be what it says.
              toast.success("Note masquée.");
            }
            return ok;
          }}
          onReport={async (input) => {
            const result = await reportSharedNoteAction({ noteId: incomingNote.id, ...input });
            if (result.ok) {
              const id = incomingNote.id;
              setIncomingId(null);
              setIncoming((prev) => prev.filter((n) => n.id !== id));
              // No excerpt here either: the reason to report it is what it says.
              toast.success(NOTE_REPORT_SENT);
            }
            return result;
          }}
          // Neither is reachable in read-only mode; the reader asks for them
          // because an owner's copy needs them.
          onMove={() => undefined}
          onSaveContent={() => Promise.resolve(false)}
        />
      )}
    </div>
  );
}

interface DropHandlers {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function FolderPill({
  label,
  count,
  icon,
  active,
  onClick,
  droppable = false,
  dragActive = false,
  dragOver = false,
  dropHandlers,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  droppable?: boolean;
  dragActive?: boolean;
  dragOver?: boolean;
  dropHandlers?: DropHandlers;
}): React.JSX.Element {
  const borderColor = active || dragOver ? "var(--cosmetic-accent)" : "#2A2560";
  const borderStyle = droppable && dragActive && !active ? "dashed" : "solid";
  const background = active
    ? "var(--cosmetic-accent)"
    : dragOver
      ? "color-mix(in srgb, var(--cosmetic-accent) 16%, transparent)"
      : "transparent";
  return (
    <button
      type="button"
      onClick={onClick}
      {...(droppable && dropHandlers ? dropHandlers : {})}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: active ? "#05041A" : "#B8B5D1",
        background,
        border: `1px ${borderStyle} ${borderColor}`,
        padding: "8px 12px",
        cursor: "pointer",
        maxWidth: 220,
      }}
    >
      {icon}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ opacity: 0.7 }}>{count}</span>
    </button>
  );
}

function IconDots({
  value,
  color,
  onPick,
}: {
  value: string;
  color: string;
  onPick: (icon: FolderIconName) => void;
}): React.JSX.Element {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
      {FOLDER_ICON_NAMES.map((name) => {
        const active = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => {
              onPick(name);
            }}
            aria-label={`Icône ${name}`}
            title={name}
            style={{
              display: "grid",
              placeItems: "center",
              width: 24,
              height: 24,
              borderRadius: 4,
              background: active
                ? "color-mix(in srgb, var(--cosmetic-accent) 18%, transparent)"
                : "transparent",
              border: `1px solid ${active ? "var(--cosmetic-accent)" : "#2A2560"}`,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <FolderGlyph name={name} color={color} size={14} />
          </button>
        );
      })}
    </div>
  );
}

function PaletteDots({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (color: string | null) => void;
}): React.JSX.Element {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {FOLDER_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => {
            onPick(c);
          }}
          aria-label={`Couleur ${c}`}
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: c,
            border: value === c ? "2px solid #F5F5FA" : "2px solid transparent",
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
      <button
        type="button"
        onClick={() => {
          onPick(null);
        }}
        aria-label="Aucune couleur"
        title="Aucune couleur"
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "transparent",
          border: value === null ? "2px solid #F5F5FA" : "2px solid #2A2560",
          cursor: "pointer",
          padding: 0,
          color: "#7F7BA9",
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
