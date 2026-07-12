"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Category } from "@cyberlearn/db";
import {
  createFolderAction,
  deleteFolderAction,
  moveNoteAction,
  recolorFolderAction,
  reiconFolderAction,
  renameFolderAction,
} from "../_actions/folder-actions";
import { saveNoteAction } from "../_actions/note-actions";
import {
  CAT,
  FOLDER_DEFAULT_COLOR,
  FOLDER_DEFAULT_ICON,
  FOLDER_ICON_NAMES,
  FOLDER_PALETTE,
  type FolderIconName,
  type SerializedFolder,
  type SerializedNote,
} from "./notes-shared";
import { AllNotesGlyph, FolderGlyph } from "./folder-icons";
import { NoteReader } from "./note-reader";
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

/** Strip markdown to a short plain-text preview for the card. */
function excerpt(markdown: string): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#[\]()~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 150 ? `${text.slice(0, 149).trimEnd()}…` : text;
}

function timeAgo(iso: string, now: number | null): string {
  const then = new Date(iso).getTime();
  if (now === null) return new Date(iso).toLocaleDateString("fr-FR");
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${String(m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${String(h)} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${String(d)} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function NotesLibrary({
  notes: initialNotes,
  folders: initialFolders,
}: {
  notes: SerializedNote[];
  folders: SerializedFolder[];
}): React.JSX.Element {
  const [notes, setNotes] = useState<SerializedNote[]>(initialNotes);
  const [folders, setFolders] = useState<SerializedFolder[]>(initialFolders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | Category>("ALL");
  const [selectedFolder, setSelectedFolder] = useState<string>(ALL);
  const [manageOpen, setManageOpen] = useState(false);
  const [readerId, setReaderId] = useState<string | null>(null);
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

  // In the "Toutes" view, group by folder (folder order, then "Sans dossier").
  // In a specific-folder view, a single flat group.
  const groups = useMemo(() => {
    if (selectedFolder !== ALL) {
      return filtered.length > 0 ? [{ id: selectedFolder, title: null, notes: filtered }] : [];
    }
    const out: {
      id: string;
      title: string | null;
      color: string | null;
      notes: SerializedNote[];
    }[] = [];
    for (const f of folders) {
      const fn = filtered.filter((n) => n.folderId === f.id);
      if (fn.length > 0) out.push({ id: f.id, title: f.name, color: f.color, notes: fn });
    }
    // "Sans dossier" also catches notes whose folder is not in the loaded list
    // (e.g. the folders query fell back to [] during the pre-migration deploy
    // window) so a note is never rendered in no group at all.
    const knownIds = new Set(folders.map((f) => f.id));
    const loose = filtered.filter((n) => n.folderId === null || !knownIds.has(n.folderId));
    if (loose.length > 0) {
      out.push({ id: NONE, title: "Sans dossier", color: null, notes: loose });
    }
    return out;
  }, [filtered, folders, selectedFolder]);

  const readerNote = readerId ? (notes.find((n) => n.id === readerId) ?? null) : null;

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
            stroke="#6F6B99"
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
          label="Toutes"
          count={notes.length}
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
        {folders.map((f) => (
          <FolderPill
            key={f.id}
            label={f.name}
            count={countFor(f.id)}
            icon={
              <FolderGlyph
                name={f.icon}
                color={selectedFolder === f.id ? "#05041A" : (f.color ?? FOLDER_DEFAULT_COLOR)}
              />
            }
            active={selectedFolder === f.id}
            onClick={() => {
              setSelectedFolder(f.id);
            }}
            droppable
            dragActive={draggingId !== null}
            dragOver={dragOverKey === f.id}
            dropHandlers={dropProps(f.id, f.id)}
          />
        ))}
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
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6F6B99" }}>
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
                    color: "#6F6B99",
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

      {/* Groups */}
      {groups.length === 0 ? (
        <div
          style={{
            border: "1px dashed #2A2560",
            padding: "48px 24px",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "#6F6B99",
          }}
        >
          {notes.length === 0
            ? "Aucune note pour l'instant. Ouvre une leçon et note ce qui compte, ça apparaîtra ici."
            : "Aucune note ne correspond à ta recherche."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {groups.map((g) => {
            const gFolder = g.id === NONE ? null : folders.find((f) => f.id === g.id);
            // Distinct key from the folder pill so hovering the header highlights
            // only the header, not also the pill for the same folder.
            const headerKey = `hdr:${g.id}`;
            const headerDragOver = dragOverKey === headerKey;
            return (
              <section key={g.id}>
                {g.title !== null && (
                  <div
                    {...dropProps(headerKey, g.id === NONE ? null : g.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 14,
                      marginLeft: -8,
                      padding: "5px 8px",
                      borderRadius: 4,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#B8B5D1",
                      border: `1px ${draggingId && !headerDragOver ? "dashed" : "solid"} ${
                        headerDragOver
                          ? "var(--cosmetic-accent)"
                          : draggingId
                            ? "#3A3568"
                            : "transparent"
                      }`,
                      background: headerDragOver
                        ? "color-mix(in srgb, var(--cosmetic-accent) 12%, transparent)"
                        : "transparent",
                    }}
                  >
                    <FolderGlyph
                      name={gFolder?.icon ?? "folder"}
                      color={
                        gFolder?.color ??
                        (g.id === NONE ? FOLDER_DEFAULT_COLOR : "var(--cosmetic-accent)")
                      }
                    />
                    {g.title}
                    <span
                      style={{
                        fontSize: 10,
                        color: "#6F6B99",
                        border: "1px solid #2A2560",
                        padding: "2px 7px",
                      }}
                    >
                      {g.notes.length} note{g.notes.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
                            <span style={{ color: "#6F6B99", letterSpacing: "0.06em" }}>
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
                            color: "#6F6B99",
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
          color: "#6F6B99",
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
