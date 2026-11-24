"use client";

// Client boundary: drag-and-drop, folding and inline renaming are local state.

import React, { useMemo, useState } from "react";
import { folderDescendants, parentMap } from "@cyberlearn/lib/notes/workspace";
import { keepsNativeMenu, menuPoint } from "@/components/context-menu/context-menu";
import { FolderGlyph, AllNotesGlyph } from "./folder-icons";
import { FOLDER_DEFAULT_COLOR, type SerializedFolder, type SerializedNote } from "./notes-shared";

/** What the workspace is showing: a smart view, a folder, the received notes or the trash. */
export type WorkspaceView =
  | { kind: "all" }
  | { kind: "pinned" }
  | { kind: "free" }
  | { kind: "unfiled" }
  | { kind: "folder"; id: string }
  | { kind: "received" }
  | { kind: "trash" };

/** Drag payload between the list and the tree. */
export const DND_TYPE = "application/x-cyberlearn-notes";
export type DragPayload = { kind: "notes"; ids: string[] } | { kind: "folder"; id: string };

export function readDrag(e: React.DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData(DND_TYPE);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const v = value as Record<string, unknown>; // narrowed field by field below
    if (v.kind === "notes" && Array.isArray(v.ids) && v.ids.every((x) => typeof x === "string")) {
      return { kind: "notes", ids: v.ids }; // checked by the every() above
    }
    if (v.kind === "folder" && typeof v.id === "string") return { kind: "folder", id: v.id };
    return null;
  } catch {
    return null;
  }
}

export function writeDrag(e: React.DragEvent, payload: DragPayload): void {
  e.dataTransfer.setData(DND_TYPE, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

const sameView = (a: WorkspaceView, b: WorkspaceView): boolean =>
  a.kind === b.kind && (a.kind !== "folder" || (b.kind === "folder" && a.id === b.id));

interface TreeProps {
  folders: readonly SerializedFolder[];
  notes: readonly SerializedNote[];
  incomingCount: number;
  trashCount: number;
  view: WorkspaceView;
  onView: (view: WorkspaceView) => void;
  expanded: ReadonlySet<string>;
  onToggle: (folderId: string) => void;
  onDropNotes: (noteIds: string[], folderId: string | null) => void;
  onDropFolder: (folderId: string, parentId: string | null) => void;
  /** Open a folder's menu at `point`, focus going back to `anchor` once closed. */
  onFolderMenu: (
    point: { x: number; y: number },
    anchor: HTMLElement,
    folder: SerializedFolder,
  ) => void;
  onNewFolder: (parentId: string | null) => void;
  renamingId: string | null;
  onRename: (folderId: string, name: string | null) => void;
  onStartRename: (folderId: string) => void;
}

/**
 * The workspace's left column: smart views (every note, pinned, free, outside
 * any folder), the folder tree, then the notes received and the trash. A note
 * or a folder dragged onto a folder goes into it; onto "Sans dossier" or the
 * "Dossiers" heading, to the root. Every drag has a keyboard twin in the
 * menus ("Déplacer vers…").
 */
export function FolderTree({
  folders,
  notes,
  incomingCount,
  trashCount,
  view,
  onView,
  expanded,
  onToggle,
  onDropNotes,
  onDropFolder,
  onFolderMenu,
  onNewFolder,
  renamingId,
  onRename,
  onStartRename,
}: TreeProps): React.JSX.Element {
  const [over, setOver] = useState<string | null>(null);

  const { childrenOf, totals } = useMemo(() => {
    const parents = parentMap(folders);
    const childrenOf = new Map<string | null, SerializedFolder[]>();
    for (const f of folders) {
      const p = parents.get(f.id) ?? null;
      childrenOf.set(p, [...(childrenOf.get(p) ?? []), f]);
    }
    for (const list of childrenOf.values()) list.sort((a, b) => a.position - b.position);
    const direct = new Map<string, number>();
    for (const n of notes)
      if (n.folderId) direct.set(n.folderId, (direct.get(n.folderId) ?? 0) + 1);
    const totals = new Map<string, number>();
    for (const f of folders) {
      let sum = direct.get(f.id) ?? 0;
      for (const d of folderDescendants(parents, f.id)) sum += direct.get(d) ?? 0;
      totals.set(f.id, sum);
    }
    return { childrenOf, totals };
  }, [folders, notes]);

  const dropProps = (key: string, target: string | null) => ({
    onDragOver: (e: React.DragEvent): void => {
      if (!e.dataTransfer.types.includes(DND_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (over !== key) setOver(key);
    },
    onDragLeave: (): void => {
      setOver((k) => (k === key ? null : k));
    },
    onDrop: (e: React.DragEvent): void => {
      e.preventDefault();
      setOver(null);
      const payload = readDrag(e);
      if (!payload) return;
      if (payload.kind === "notes") onDropNotes(payload.ids, target);
      else if (payload.id !== target) onDropFolder(payload.id, target);
    },
    "data-drop": over === key ? "true" : undefined,
  });

  const counts = {
    all: notes.length,
    pinned: notes.filter((n) => n.pinned).length,
    free: notes.filter((n) => n.lessonId === null).length,
    unfiled: notes.filter((n) => n.folderId === null).length,
  };

  const smart = (
    v: WorkspaceView,
    label: string,
    count: number,
    icon: React.ReactNode,
    drop?: ReturnType<typeof dropProps>,
  ): React.JSX.Element => (
    <li>
      <button
        type="button"
        className="nw-tree__row"
        aria-current={sameView(view, v) ? "true" : undefined}
        onClick={() => {
          onView(v);
        }}
        {...drop}
      >
        <span className="nw-tree__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="nw-tree__name">{label}</span>
        <span className="nw-tree__count">{count}</span>
      </button>
    </li>
  );

  const renderFolder = (folder: SerializedFolder, depth: number): React.JSX.Element => {
    const kids = childrenOf.get(folder.id) ?? [];
    const open = expanded.has(folder.id);
    const active = view.kind === "folder" && view.id === folder.id;
    return (
      <li key={folder.id}>
        <div
          className="nw-tree__row nw-tree__row--folder"
          style={{ paddingLeft: 6 + depth * 14 }}
          aria-current={active ? "true" : undefined}
          draggable={renamingId !== folder.id}
          onDragStart={(e) => {
            writeDrag(e, { kind: "folder", id: folder.id });
          }}
          onContextMenu={(e) => {
            if (keepsNativeMenu(e)) return;
            e.preventDefault();
            onFolderMenu(menuPoint(e, e.currentTarget), e.currentTarget, folder);
          }}
          {...dropProps(folder.id, folder.id)}
        >
          {kids.length > 0 ? (
            <button
              type="button"
              className="nw-tree__chevron"
              aria-label={open ? `Replier ${folder.name}` : `Déplier ${folder.name}`}
              aria-expanded={open}
              onClick={() => {
                onToggle(folder.id);
              }}
            >
              <span aria-hidden="true">{open ? "▾" : "▸"}</span>
            </button>
          ) : (
            <span className="nw-tree__chevron" aria-hidden="true" />
          )}
          {renamingId === folder.id ? (
            <input
              className="nw-tree__rename"
              aria-label="Nouveau nom du dossier"
              defaultValue={folder.name}
              maxLength={40}
              // Renaming starts from a menu or F2: the field is the point of it.
              autoFocus
              onFocus={(e) => {
                e.currentTarget.select();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRename(folder.id, e.currentTarget.value);
                if (e.key === "Escape") onRename(folder.id, null);
              }}
              onBlur={(e) => {
                onRename(folder.id, e.currentTarget.value);
              }}
            />
          ) : (
            <button
              type="button"
              className="nw-tree__open"
              onClick={() => {
                onView({ kind: "folder", id: folder.id });
                if (!open && kids.length > 0) onToggle(folder.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "F2") {
                  e.preventDefault();
                  onStartRename(folder.id);
                }
                if (e.key === "ArrowRight" && kids.length > 0 && !open) onToggle(folder.id);
                if (e.key === "ArrowLeft" && open) onToggle(folder.id);
                if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  onFolderMenu({ x: r.left + 16, y: r.bottom }, e.currentTarget, folder);
                }
              }}
            >
              <span className="nw-tree__icon" aria-hidden="true">
                <FolderGlyph
                  name={folder.icon}
                  color={folder.color ?? FOLDER_DEFAULT_COLOR}
                  size={15}
                />
              </span>
              <span className="nw-tree__name">{folder.name}</span>
              <span className="nw-tree__count">{totals.get(folder.id) ?? 0}</span>
            </button>
          )}
          <button
            type="button"
            className="nw-tree__more"
            aria-label={`Actions du dossier ${folder.name}`}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onFolderMenu({ x: r.right - 8, y: r.bottom }, e.currentTarget, folder);
            }}
          >
            <span aria-hidden="true">⋯</span>
          </button>
        </div>
        {open && kids.length > 0 ? <ul>{kids.map((k) => renderFolder(k, depth + 1))}</ul> : null}
      </li>
    );
  };

  const roots = childrenOf.get(null) ?? [];

  return (
    <nav className="nw-tree" aria-label="Organisation des notes">
      <ul className="nw-tree__group">
        {smart(
          { kind: "all" },
          "Toutes les notes",
          counts.all,
          <AllNotesGlyph color="currentColor" />,
        )}
        {smart({ kind: "pinned" }, "Épinglées", counts.pinned, <span className="nw-glyph">◆</span>)}
        {smart({ kind: "free" }, "Notes libres", counts.free, <span className="nw-glyph">✎</span>)}
        {smart(
          { kind: "unfiled" },
          "Sans dossier",
          counts.unfiled,
          <span className="nw-glyph">□</span>,
          dropProps("__root__", null),
        )}
      </ul>

      <div className="nw-tree__heading" {...dropProps("__heading__", null)}>
        <span>Dossiers</span>
        <button
          type="button"
          className="nw-tree__add"
          aria-label="Nouveau dossier"
          title="Nouveau dossier"
          onClick={() => {
            onNewFolder(null);
          }}
        >
          +
        </button>
      </div>
      {roots.length === 0 ? (
        <p className="nw-tree__empty">
          Range tes notes dans des dossiers : crée-en un, puis glisse des notes dessus.
        </p>
      ) : (
        <ul className="nw-tree__group">{roots.map((f) => renderFolder(f, 0))}</ul>
      )}

      <ul className="nw-tree__group nw-tree__group--bottom">
        {smart({ kind: "received" }, "Reçues", incomingCount, <span className="nw-glyph">⇣</span>)}
        {smart({ kind: "trash" }, "Corbeille", trashCount, <span className="nw-glyph">⌫</span>)}
      </ul>
    </nav>
  );
}
