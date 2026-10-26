"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DataGrid,
  type GridColumn,
  type GridRowBase,
  type ServerGrid,
  type ServerGridFacet,
} from "../../_components/data-grid";
import type { ContentStatus } from "../../_components/content-status";
import { notifyResult } from "@/lib/notify";
import { bulkUpdateLessonStatusAction } from "../_actions/lesson-actions";

/** What a bulk change did, in a toast: "3 leçons publiées". */
function bulkNotice(count: number, status: ContentStatus): string {
  const s = count > 1 ? "s" : "";
  const what = `${String(count)} leçon${s}`;
  switch (status) {
    case "PUBLISHED":
      return `${what} publiée${s}.`;
    case "DRAFT":
      return `${what} remise${s} en brouillon.`;
    case "ARCHIVED":
      return `${what} archivée${s}.`;
  }
}

/**
 * A lesson folder's grid: the console's DataGrid, server-driven, with a box
 * on every row and the bulk status bar above the table.
 *
 * The selection is this component's. It survives a page change, so lessons
 * can be gathered across pages; the bar says how many of them are out of
 * sight before anything is changed.
 */
export function LessonsGrid({
  folder,
  columns,
  rows,
  server,
  facets,
}: {
  folder: "active" | "archives";
  columns: readonly GridColumn[];
  rows: GridRowBase[];
  server: ServerGrid;
  facets: ServerGridFacet[];
}): React.JSX.Element {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [isPending, startTransition] = useTransition();

  const offPage = [...selected].filter((id) => !rows.some((row) => row.id === id)).length;

  function clear(): void {
    setSelected(new Set());
    setConfirmArchive(false);
  }

  function runBulk(next: ContentStatus): void {
    const ids = [...selected];
    if (ids.length === 0) return;
    setConfirmArchive(false);
    startTransition(async () => {
      const res = await bulkUpdateLessonStatusAction(ids, next);
      const ok = notifyResult(res, {
        success: bulkNotice(res.count ?? ids.length, next),
        error: "Les statuts n'ont pas pu être changés.",
      });
      if (ok) {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  const banner =
    selected.size === 0 ? null : (
      <div className="a-bulk" role="region" aria-label="Actions sur la sélection">
        <span className="a-bulk-count">
          {String(selected.size)} sélectionnée{selected.size > 1 ? "s" : ""}
          {offPage > 0 && `, dont ${String(offPage)} sur d'autres pages`}
        </span>

        <div className="a-bulk-actions">
          {folder === "archives" ? (
            <button
              type="button"
              className="a-btn a-btn--ghost a-btn--sm"
              disabled={isPending}
              onClick={() => {
                runBulk("DRAFT");
              }}
            >
              Remettre en brouillon
            </button>
          ) : confirmArchive ? (
            <>
              <span className="a-bulk-warning">
                {selected.size > 1
                  ? `${String(selected.size)} leçons quitteront le site et l'app, et rejoindront les archives.`
                  : "Cette leçon quittera le site et l'app, et rejoindra les archives."}
              </span>
              <button
                type="button"
                className="a-btn a-btn--danger a-btn--sm"
                disabled={isPending}
                onClick={() => {
                  runBulk("ARCHIVED");
                }}
              >
                Confirmer l&apos;archivage
              </button>
              <button
                type="button"
                className="a-btn a-btn--ghost a-btn--sm"
                disabled={isPending}
                onClick={() => {
                  setConfirmArchive(false);
                }}
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="a-btn a-btn--primary a-btn--sm"
                disabled={isPending}
                onClick={() => {
                  runBulk("PUBLISHED");
                }}
              >
                Publier
              </button>
              <button
                type="button"
                className="a-btn a-btn--ghost a-btn--sm"
                disabled={isPending}
                onClick={() => {
                  runBulk("DRAFT");
                }}
              >
                Brouillon
              </button>
              <button
                type="button"
                className="a-btn a-btn--danger a-btn--sm"
                disabled={isPending}
                onClick={() => {
                  setConfirmArchive(true);
                }}
              >
                Archiver
              </button>
            </>
          )}
        </div>

        {isPending && <span aria-live="polite">En cours…</span>}

        <button type="button" className="a-bulk-clear" onClick={clear}>
          Tout désélectionner
        </button>
      </div>
    );

  return (
    <DataGrid
      columns={columns}
      rows={rows}
      server={server}
      facets={facets}
      selection={{ selected, onChange: setSelected }}
      banner={banner}
      searchPlaceholder="Rechercher (titre, ref, slug)…"
      emptyTitle={folder === "archives" ? "Aucune leçon archivée" : "Aucune leçon"}
      emptyText={
        folder === "archives"
          ? "Une leçon archivée depuis la liste des leçons arrive ici."
          : "Importe un premier fichier MDX, ou crée une leçon."
      }
    />
  );
}
