"use client";

import React, { useState, useTransition, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ImportValidationResult,
  ImportValidationError,
  LessonUpdatePreview,
} from "@cyberlearn/types";
import { offsetOfLine } from "@/lib/text-position";
import {
  validateImportBatchAction,
  importLessonBatchAction,
  updateLessonFromImportAction,
} from "../actions";
import {
  changedLines,
  DiffHunks,
  FieldChanges,
  LessonUpdateNotes,
  lineCounts,
} from "../../_components/lesson-diff";

const EXAMPLE_MDX = `---
refCode: CL-LSN-001-V01
slug: introduction-example
title: Exemple de leçon
description: Une leçon d'exemple pour tester l'import.
category: DEV
difficulty: BEGINNER
estimatedMinutes: 10
xpReward: 50
prerequisites: []
---

# Introduction

Contenu de la leçon en Markdown/MDX...

\`\`\`javascript
console.log("Hello, CyberLearn!");
\`\`\`
`;

const MAX_FILES = 30;
// Mirror of the server-side aggregate cap (BATCH_MAX_TOTAL_BYTES).
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "publiée",
  DRAFT: "brouillon",
  ARCHIVED: "archivée",
};

/** Shown once a lesson that had a studio draft open is updated from its file. */
const DRAFT_KEPT_WARNING =
  "Le brouillon ouvert dans le studio est gardé tel quel : le studio signale que la leçon a changé depuis, et sa publication remplacerait ce contenu.";

interface BatchFile {
  name: string;
  content: string;
  validation: ImportValidationResult | null;
  /** Written: imported as a new DRAFT, or an existing lesson updated from it. */
  imported: { lessonId: string; warnings: string[]; updated: boolean } | null;
}

/** Where the update of the selected file stands, once its differences are shown. */
type UpdateStep =
  | { step: "confirm" }
  | { step: "running" }
  | { step: "failed"; message: string; details: string[] };

function readAsBatchFile(file: File): Promise<BatchFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      // SAFETY: readAsText guarantees a string result (or null), never ArrayBuffer.
      const content = (ev.target?.result as string | null) ?? "";
      resolve({ name: file.name.trim(), content, validation: null, imported: null });
    };
    reader.onerror = () => {
      reject(new Error(file.name));
    };
    reader.readAsText(file, "utf-8");
  });
}

/** The update states without those of these files: theirs start over. */
function withoutKeys(
  states: Record<string, UpdateStep>,
  names: readonly string[],
): Record<string, UpdateStep> {
  return Object.fromEntries(Object.entries(states).filter(([name]) => !names.includes(name)));
}

/** A file validated as an update of a lesson already in the database. */
function updateOf(file: BatchFile | undefined): LessonUpdatePreview | null {
  if (!file || file.imported || file.validation?.valid !== true) return null;
  return file.validation.update ?? null;
}

function isUnchanged(update: LessonUpdatePreview): boolean {
  // The counts, not the passages: a content too changed to compare has none.
  return update.fields.length === 0 && update.added + update.removed === 0;
}

/** What the batch has written so far: new lessons, and lessons brought up to date. */
function writtenSummary(files: readonly BatchFile[]): string {
  const created = files.filter((f) => f.imported && !f.imported.updated).length;
  const updated = files.filter((f) => f.imported?.updated === true).length;
  return [
    created > 0 ? `${String(created)} importée${created > 1 ? "s" : ""}` : null,
    updated > 0 ? `${String(updated)} mise${updated > 1 ? "s" : ""} à jour` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

export function ImportClient(): React.ReactElement {
  const router = useRouter();
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [selected, setSelected] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [isValidating, startValidation] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [dragging, setDragging] = useState(false);
  // dragenter and dragleave fire for every child the pointer crosses: the
  // zone is left when as many leaves as enters have been seen.
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<"editor" | "diff">("editor");
  const [updates, setUpdates] = useState<Record<string, UpdateStep>>({});

  const current: BatchFile | undefined = files[selected];
  const currentUpdate = updateOf(current);
  const updating = Object.values(updates).some((u) => u.step === "running");
  const busy = isValidating || isImporting || updating;
  // New lessons only: a file that matches a lesson in the database is
  // updated from its own panel, once its differences are read.
  const validCount = files.filter(
    (f) => f.validation?.valid === true && !f.validation.update && f.imported === null,
  ).length;
  const importedCount = files.filter((f) => f.imported !== null).length;
  const showDiff = currentUpdate !== null && view === "diff";

  const addFiles = useCallback(
    async (incoming: FileList) => {
      setBatchSummary(null);

      const list = Array.from(incoming);
      const problems: string[] = [];
      const accepted = list.filter((f) => {
        if (!f.name.endsWith(".mdx")) {
          problems.push(`${f.name} (seuls les .mdx sont acceptés)`);
          return false;
        }
        if (f.size > 512 * 1024) {
          problems.push(`${f.name} (max 500 Ko)`);
          return false;
        }
        return true;
      });

      const settled = await Promise.allSettled(accepted.map(readAsBatchFile));
      const loaded: BatchFile[] = [];
      for (const s of settled) {
        if (s.status === "fulfilled") loaded.push(s.value);
        else
          problems.push(
            `${s.reason instanceof Error ? s.reason.message : "fichier"} (lecture impossible)`,
          );
      }

      // Same name = replace (re-drop of a corrected file), otherwise append.
      const merged = [...files];
      for (const nf of loaded) {
        const at = merged.findIndex((f) => f.name === nf.name);
        if (at >= 0) merged[at] = nf;
        else merged.push(nf);
      }
      const kept = merged.slice(0, MAX_FILES);
      const dropped = merged.slice(MAX_FILES);
      if (dropped.length > 0) {
        problems.push(
          `lot plein (max ${String(MAX_FILES)}), non ajoutés: ${dropped.map((f) => f.name).join(", ")}`,
        );
      }
      const totalBytes = kept.reduce((sum, f) => sum + f.content.length, 0);
      if (totalBytes > MAX_TOTAL_BYTES) {
        problems.push("lot trop volumineux (max 4 Mo au total), retire des fichiers");
      }

      setFiles(kept);
      setUpdates((prev) =>
        withoutKeys(
          prev,
          loaded.map((nf) => nf.name),
        ),
      );
      setFileError(problems.length > 0 ? `Attention : ${problems.join(" · ")}` : null);

      // Select the first newly added file; otherwise keep a valid selection.
      const firstNew = loaded.length > 0 ? kept.findIndex((f) => f.name === loaded[0]?.name) : -1;
      setSelected(firstNew >= 0 ? firstNew : Math.min(selected, Math.max(0, kept.length - 1)));
      setView("editor");
    },
    [files, selected],
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (e.dataTransfer.files.length > 0) void addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) void addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles],
  );

  /** Puts the editor's cursor on the line an error names, and scrolls it into view. */
  const goToLine = useCallback((line: number, column?: number) => {
    setView("editor");
    // After the render that brings the editor back, if the diff was showing.
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      const offset = offsetOfLine(el.value, line, column);
      el.focus();
      el.setSelectionRange(offset, offset);
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
      el.scrollTop = Math.max(0, (line - 3) * lineHeight);
    });
  }, []);

  function handleValidate() {
    const toValidate = files.filter((f) => f.imported === null);
    if (toValidate.length === 0) return;
    setFileError(null);
    setBatchSummary(null);
    setUpdates({});
    startValidation(async () => {
      const res = await validateImportBatchAction(
        toValidate.map((f) => ({ name: f.name, content: f.content })),
      );
      if (!Array.isArray(res)) {
        setFileError(res.message);
        return;
      }
      const byName = new Map(res.map((r) => [r.name, r.result]));
      setFiles((prev) =>
        prev.map((f) => {
          const result = byName.get(f.name);
          return result && f.imported === null ? { ...f, validation: result } : f;
        }),
      );
    });
  }

  function handleImport() {
    const toImport = files.filter(
      (f) => f.validation?.valid === true && !f.validation.update && f.imported === null,
    );
    if (toImport.length === 0) return;
    setFileError(null);
    setBatchSummary(null);
    startImport(async () => {
      const res = await importLessonBatchAction(
        toImport.map((f) => ({ name: f.name, content: f.content })),
      );
      if (res.status === "invalid_input") {
        setFileError(res.message);
        return;
      }
      if (res.status === "rate_limited") {
        setFileError(
          `Limite d'import atteinte: ${String(res.remaining)} import${res.remaining > 1 ? "s" : ""} encore possible${res.remaining > 1 ? "s" : ""} cette heure.`,
        );
        return;
      }
      const ok = res.outcomes.filter((o) => o.status === "success").length;
      const ko = res.outcomes.filter((o) => o.status === "validation_error").length;
      const exists = res.outcomes.filter((o) => o.status === "exists").length;
      const skipped = res.outcomes.filter((o) => o.status === "skipped").length;
      const byName = new Map(res.outcomes.map((o) => [o.name, o]));
      setFiles((prev) =>
        prev.map((f) => {
          const outcome = byName.get(f.name);
          if (!outcome) return f;
          if (outcome.status === "success") {
            return {
              ...f,
              imported: { lessonId: outcome.lessonId, warnings: outcome.warnings, updated: false },
            };
          }
          if (outcome.status === "validation_error" || outcome.status === "exists") {
            return { ...f, validation: outcome.result, imported: null };
          }
          return f; // skipped: untouched, retry later
        }),
      );
      setBatchSummary(
        `${String(ok)} leçon${ok > 1 ? "s" : ""} importée${ok > 1 ? "s" : ""} en DRAFT` +
          (ko > 0 ? ` · ${String(ko)} refusée${ko > 1 ? "s" : ""}` : "") +
          (exists > 0 ? ` · ${String(exists)} déjà en base entre-temps (à mettre à jour)` : "") +
          (skipped > 0
            ? ` · ${String(skipped)} non traitée${skipped > 1 ? "s" : ""} (limite)`
            : ""),
      );
    });
  }

  async function confirmUpdate(file: BatchFile, update: LessonUpdatePreview): Promise<void> {
    setUpdates((prev) => ({ ...prev, [file.name]: { step: "running" } }));
    let res: Awaited<ReturnType<typeof updateLessonFromImportAction>>;
    try {
      res = await updateLessonFromImportAction({
        name: file.name,
        content: file.content,
        hash: update.hash,
      });
    } catch {
      setUpdates((prev) => ({
        ...prev,
        [file.name]: { step: "failed", message: "La requête a échoué. Réessaie.", details: [] },
      }));
      return;
    }
    if (res.status === "success") {
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name
            ? {
                ...f,
                imported: {
                  lessonId: res.lessonId,
                  warnings: [
                    ...(f.validation?.warnings ?? []),
                    ...(res.draftKept ? [DRAFT_KEPT_WARNING] : []),
                  ],
                  updated: true,
                },
              }
            : f,
        ),
      );
      setUpdates((prev) => withoutKeys(prev, [file.name]));
      setView("editor");
      return;
    }
    const failure =
      res.status === "rate_limited"
        ? {
            message: "Limite d'import atteinte pour cette heure : réessaie plus tard.",
            details: [],
          }
        : res.status === "invalid_input"
          ? { message: res.message, details: [] }
          : {
              message: res.message,
              details: res.errors.map((e) =>
                e.line === undefined && e.field ? `${e.field} : ${e.message}` : e.message,
              ),
            };
    setUpdates((prev) => ({ ...prev, [file.name]: { step: "failed", ...failure } }));
  }

  function handleEditorChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const content = e.target.value;
    const name = current?.name;
    setFiles((prev) =>
      prev.map((f, i) => (i === selected ? { ...f, content, validation: null } : f)),
    );
    if (name !== undefined) {
      setUpdates((prev) => withoutKeys(prev, [name]));
    }
    setBatchSummary(null);
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    setSelected((s) => Math.max(0, Math.min(index < s ? s - 1 : s, next.length - 1)));
    setView("editor");
  }

  function newFile(name: string, content: string) {
    if (files.some((f) => f.name === name) || files.length >= MAX_FILES) return;
    setFiles((prev) => [...prev, { name, content, validation: null, imported: null }]);
    setSelected(files.length);
    setView("editor");
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className="import-grid">
      {/* Panel 1 - Drop zone + file list + validation results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Drop zone: the whole of it opens the picker, by pointer or keyboard. */}
        <div
          role="button"
          tabIndex={0}
          className="import-dropzone"
          data-dragging={dragging ? "true" : undefined}
          aria-label="Ajouter des fichiers .mdx : dépose-les ici, ou appuie sur Entrée pour les choisir"
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={handleFileDrop}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="import-dropzone-icon"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 12 15 15" />
          </svg>
          <p className="import-dropzone-text">
            {dragging
              ? "Dépose les fichiers .mdx"
              : files.length === 0
                ? "Glisse un ou plusieurs fichiers .mdx ici"
                : `${String(files.length)} fichier${files.length > 1 ? "s" : ""} dans le lot`}
          </p>
          <span className="import-dropzone-browse" aria-hidden="true">
            Parcourir
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".mdx"
          multiple
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
          style={{ display: "none" }}
        />

        {fileError && <ErrorBanner message={fileError} />}
        {batchSummary && (
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(10,255,212,0.06)",
              border: "1px solid rgba(10,255,212,0.3)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#0AFFD4",
            }}
          >
            ✓ {batchSummary}
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div style={{ border: "1px solid #1F1B47", background: "rgba(5,4,26,0.6)" }}>
            <div
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #1A1640",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#7F7BA9",
              }}
            >
              Lot · {files.length} fichier{files.length > 1 ? "s" : ""}
            </div>
            {files.map((f, i) => (
              <FileRow
                key={f.name}
                file={f}
                active={i === selected}
                onSelect={() => {
                  setSelected(i);
                  setView(updateOf(f) ? "diff" : "editor");
                }}
                onRemove={
                  busy
                    ? undefined
                    : () => {
                        removeFile(i);
                      }
                }
                onOpenEditor={
                  f.imported
                    ? () => {
                        router.push(`/lessons/${f.imported?.lessonId ?? ""}`);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {/* Validation status of the SELECTED file */}
        {isValidating && (
          <div
            style={{
              padding: "12px 14px",
              background: "color-mix(in srgb, var(--a-info) 6%, transparent)",
              border: "1px solid color-mix(in srgb, var(--a-info) 20%, transparent)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--a-info)",
            }}
          >
            Validation du lot en cours…
          </div>
        )}

        {current?.validation && !current.imported && !isValidating && (
          <ValidationPanel
            result={current.validation}
            onGoTo={goToLine}
            onShowDiff={() => {
              setView("diff");
            }}
          />
        )}

        {current?.imported && (
          <div
            style={{
              padding: "14px 16px",
              background: "rgba(10,255,212,0.06)",
              border: "1px solid rgba(10,255,212,0.3)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#0AFFD4",
                marginBottom: 6,
              }}
            >
              {current.imported.updated ? "✓ Leçon mise à jour" : "✓ Leçon importée en DRAFT"}
            </div>
            {current.imported.warnings.map((w, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--a-warning)",
                  marginTop: 4,
                }}
              >
                ⚠ {w}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                router.push(`/lessons/${current.imported?.lessonId ?? ""}`);
              }}
              style={{
                marginTop: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#0AFFD4",
                background: "none",
                border: "1px solid rgba(10,255,212,0.3)",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Ouvrir l&apos;éditeur →
            </button>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={handleValidate}
            disabled={files.length === importedCount || busy}
            style={{
              padding: "10px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid #2A2560",
              color: files.length > importedCount ? "#B8B5D1" : "#44406B",
              cursor: files.length > importedCount ? "pointer" : "not-allowed",
            }}
          >
            {isValidating
              ? "Validation…"
              : `Valider le lot${files.length - importedCount > 1 ? ` (${String(files.length - importedCount)})` : ""}`}
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={validCount === 0 || busy}
            style={{
              padding: "10px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: validCount > 0 ? "#0024FF" : "transparent",
              border: `1px solid ${validCount > 0 ? "#0024FF" : "#2A2560"}`,
              color: validCount > 0 ? "#fff" : "#44406B",
              cursor: validCount > 0 ? "pointer" : "not-allowed",
              transition: "all 150ms ease",
            }}
          >
            {isImporting
              ? "Import…"
              : importedCount > 0 && validCount === 0
                ? `${writtenSummary(files)} ✓`
                : `Importer ${String(validCount)} leçon${validCount > 1 ? "s" : ""} en DRAFT`}
          </button>
        </div>
      </div>

      {/* Panel 2 - MDX editor, or the differences with the lesson in the database */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: "rgba(5,4,26,0.6)",
          border: "1px solid #1F1B47",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #1F1B47",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#7F7BA9",
            }}
          >
            {showDiff ? "DIFFÉRENCES AVEC LA BASE" : "ÉDITEUR MDX"}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#7F7BA9" }}>
            {current?.name ?? "aucun fichier"}
            {current?.imported ? " · écrite (lecture seule)" : ""}
          </span>
          {currentUpdate && (
            <span className="import-view-toggle">
              <button
                type="button"
                aria-pressed={view === "editor"}
                onClick={() => {
                  setView("editor");
                }}
              >
                Fichier
              </button>
              <button
                type="button"
                aria-pressed={view === "diff"}
                onClick={() => {
                  setView("diff");
                }}
              >
                Différences
              </button>
            </span>
          )}
          {files.length === 0 && (
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  newFile("nouvelle-lecon.mdx", "");
                }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: "var(--a-info)",
                  background: "none",
                  border: "1px solid #2A2560",
                  padding: "3px 8px",
                  cursor: "pointer",
                }}
              >
                Nouveau fichier
              </button>
              <button
                type="button"
                onClick={() => {
                  newFile("example.mdx", EXAMPLE_MDX);
                }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: "var(--a-info)",
                  background: "none",
                  border: "1px solid #2A2560",
                  padding: "3px 8px",
                  cursor: "pointer",
                }}
              >
                Charger exemple
              </button>
            </span>
          )}
        </div>
        {showDiff && current ? (
          <UpdatePanel
            update={currentUpdate}
            state={updates[current.name] ?? null}
            busy={busy}
            onAsk={() => {
              setUpdates((prev) => ({ ...prev, [current.name]: { step: "confirm" } }));
            }}
            onCancel={() => {
              setUpdates((prev) => withoutKeys(prev, [current.name]));
            }}
            onConfirm={() => void confirmUpdate(current, currentUpdate)}
          />
        ) : (
          <textarea
            ref={editorRef}
            value={current?.content ?? ""}
            onChange={handleEditorChange}
            disabled={current?.imported !== null || busy}
            spellCheck={false}
            aria-label="Contenu du fichier MDX"
            placeholder={`---\nrefCode: CL-LSN-001-V01\nslug: ma-lecon\ntitle: Ma Leçon\n...\n---\n\n# Contenu MDX`}
            style={{
              flex: 1,
              resize: "none",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "16px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#B8B5D1",
              lineHeight: 1.7,
            }}
          />
        )}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #1F1B47",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "#7F7BA9",
            display: "flex",
            gap: 16,
          }}
        >
          <span>{(current?.content ?? "").split("\n").length} lignes</span>
          <span>{(current?.content ?? "").length} caractères</span>
          <span>{Math.round(((current?.content ?? "").length / 1024) * 10) / 10} Ko</span>
        </div>
      </div>

      {/* Panel 3 - Preview (selected file) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "rgba(5,4,26,0.4)",
          border: "1px solid #1F1B47",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #1F1B47" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#7F7BA9",
            }}
          >
            APERÇU MÉTADONNÉES
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {current?.validation?.metadata ? (
            <MetadataPreview metadata={current.validation.metadata} />
          ) : (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#7F7BA9",
                paddingTop: 20,
              }}
            >
              Valide le lot pour voir l&apos;aperçu…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FileRow({
  file,
  active,
  onSelect,
  onRemove,
  onOpenEditor,
}: {
  file: BatchFile;
  active: boolean;
  onSelect: () => void;
  onRemove?: (() => void) | undefined;
  onOpenEditor?: (() => void) | undefined;
}) {
  const update = updateOf(file);
  const status = file.imported
    ? { color: "#0AFFD4", label: file.imported.updated ? "mise à jour" : "importée" }
    : file.validation === null
      ? { color: "#7F7BA9", label: "à valider" }
      : update
        ? isUnchanged(update)
          ? { color: "#7F7BA9", label: "identique" }
          : { color: "var(--a-warning)", label: "à mettre à jour" }
        : file.validation.valid
          ? {
              color: "#0AFFD4",
              label:
                file.validation.warnings.length > 0
                  ? `valide · ${String(file.validation.warnings.length)} ⚠`
                  : "valide",
            }
          : {
              color: "var(--a-danger)",
              label: `${String(file.validation.errors.length)} erreur${file.validation.errors.length > 1 ? "s" : ""}`,
            };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderBottom: "1px solid rgba(26,22,64,0.7)",
        background: active ? "color-mix(in srgb, var(--a-info) 7%, transparent)" : "transparent",
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 4px 8px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: status.color,
            boxShadow: `0 0 5px color-mix(in srgb, ${status.color} 50%, transparent)`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: active ? "#F5F5FA" : "#B8B5D1",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {file.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: status.color,
            whiteSpace: "nowrap",
          }}
        >
          {status.label}
        </span>
      </button>
      {onOpenEditor && (
        <button
          type="button"
          onClick={onOpenEditor}
          title="Ouvrir dans l'éditeur de leçon"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#0AFFD4",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px 4px",
            flexShrink: 0,
          }}
        >
          →
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Retirer du lot"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#7F7BA9",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px 10px 8px 4px",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "color-mix(in srgb, var(--a-danger) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--a-danger) 30%, transparent)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--a-danger)",
      }}
    >
      {message}
    </div>
  );
}

function ValidationPanel({
  result,
  onGoTo,
  onShowDiff,
}: {
  result: ImportValidationResult;
  onGoTo: (line: number, column?: number) => void;
  onShowDiff: () => void;
}) {
  const update = result.valid ? (result.update ?? null) : null;
  const tone = !result.valid
    ? "var(--a-danger)"
    : update && !isUnchanged(update)
      ? "var(--a-warning)"
      : "#0AFFD4";
  const label = !result.valid
    ? `${String(result.errors.length)} ERREUR${result.errors.length > 1 ? "S" : ""}`
    : update
      ? isUnchanged(update)
        ? "IDENTIQUE À LA BASE"
        : "LEÇON EXISTANTE · À METTRE À JOUR"
      : "VALIDE";
  return (
    <div
      style={{
        background: "rgba(5,4,26,0.6)",
        border: `1px solid color-mix(in srgb, ${tone} 30%, transparent)`,
      }}
    >
      {/* Status */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #1A1640",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: tone,
            display: "inline-block",
            boxShadow: `0 0 6px color-mix(in srgb, ${tone} 60%, transparent)`,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: tone,
          }}
        >
          {label}
        </span>
      </div>

      {/* An existing lesson: what the file would change is in the middle panel. */}
      {update && (
        <div className="import-update-summary">
          <p>
            {update.refCode} est déjà en base (« {update.title} »,{" "}
            {STATUS_LABEL[update.status] ?? update.status}).{" "}
            {isUnchanged(update)
              ? "Le fichier ne change rien."
              : `Le fichier change ${String(update.fields.length)} champ${update.fields.length > 1 ? "s" : ""} et ${changedLines(update)} du contenu.`}
          </p>
          {!isUnchanged(update) && (
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={onShowDiff}>
              Voir les différences
            </button>
          )}
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div style={{ padding: "8px 0" }}>
          {result.errors.map((e, i) => (
            <ErrorItem key={i} error={e} onGoTo={onGoTo} />
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div style={{ padding: "8px 0", borderTop: "1px solid #1A1640" }}>
          {result.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                padding: "5px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--a-warning)",
                display: "flex",
                gap: 6,
              }}
            >
              <span>⚠</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorItem({
  error,
  onGoTo,
}: {
  error: ImportValidationError;
  onGoTo: (line: number, column?: number) => void;
}) {
  const { line, column } = error;
  return (
    <div style={{ padding: "6px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--a-danger)",
          marginTop: 1,
        }}
      >
        ✕
      </span>
      <div>
        {(error.field !== undefined || line !== undefined) && (
          <span className="import-error-place">
            {error.field}
            {line !== undefined ? (
              <button
                type="button"
                onClick={() => {
                  onGoTo(line, column);
                }}
                title="Placer le curseur de l'éditeur sur cette ligne"
              >
                ligne {line}
              </button>
            ) : null}
          </span>
        )}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#B8B5D1" }}>
          {error.message}
        </span>
      </div>
    </div>
  );
}

/**
 * What the file would write over the lesson that holds its refCode, with the
 * button that does it: a confirmation first, which says what stays as it is.
 */
function UpdatePanel({
  update,
  state,
  busy,
  onAsk,
  onCancel,
  onConfirm,
}: {
  update: LessonUpdatePreview;
  state: UpdateStep | null;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const unchanged = isUnchanged(update);
  return (
    <div className="import-update">
      <div className="a-sync-card-title">
        <div className="a-sync-meta">
          <span className="a-sync-ref">{update.refCode}</span>
          <span className="a-sync-ref">{STATUS_LABEL[update.status] ?? update.status}</span>
        </div>
        <Link href={`/lessons/${update.lessonId}`} className="a-sync-name">
          {update.title}
        </Link>
        <div className="a-sync-file">Leçon en base · {lineCounts(update)}</div>
      </div>

      {unchanged ? (
        <p className="a-sync-warn" data-tone="info">
          Le fichier est identique à la leçon en base : rien à mettre à jour.
        </p>
      ) : (
        <>
          <LessonUpdateNotes update={update} />
          <FieldChanges fields={update.fields} />

          {state?.step === "confirm" ? (
            <div className="a-sync-confirm">
              <p>
                « {update.title} » sera réécrite avec ce fichier : {update.fields.length} champ
                {update.fields.length > 1 ? "s" : ""} et {changedLines(update)} du contenu changent.{" "}
                {update.status === "PUBLISHED"
                  ? "Elle est publiée : le site et l'app afficheront ce contenu dès la mise à jour."
                  : "Son statut ne change pas."}{" "}
                Le slug et l&apos;image de couverture restent ceux de la leçon.
              </p>
              <div className="a-head-actions">
                <button type="button" className="a-btn a-btn--primary" onClick={onConfirm}>
                  Confirmer la mise à jour
                </button>
                <button type="button" className="a-btn a-btn--ghost" onClick={onCancel}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="a-btn a-btn--primary"
                disabled={busy}
                onClick={onAsk}
              >
                {state?.step === "running" ? "Mise à jour…" : "Mettre à jour"}
              </button>
            </div>
          )}
          {state?.step === "failed" ? (
            <ul className="a-sync-failures" role="alert">
              <li>
                {state.message}
                {state.details.length > 0 ? (
                  <ul>
                    {state.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            </ul>
          ) : null}

          {update.hunks.length > 0 ? <DiffHunks hunks={update.hunks} /> : null}
        </>
      )}
    </div>
  );
}

function MetadataPreview({
  metadata,
}: {
  metadata: NonNullable<ImportValidationResult["metadata"]>;
}) {
  const rows: [string, string][] = [
    ["refCode", metadata.refCode],
    ["slug", metadata.slug],
    ["title", metadata.title],
    ["description", metadata.description],
    ["category", metadata.category],
    ["difficulty", metadata.difficulty],
    ["estimatedMinutes", `${String(metadata.estimatedMinutes)} min`],
    ["xpReward", `${String(metadata.xpReward)} XP`],
    ["coverImageUrl", metadata.coverImageUrl ?? "null"],
    ["prerequisites", metadata.prerequisites.length > 0 ? metadata.prerequisites.join(", ") : "-"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#0AFFD4",
          marginBottom: 4,
        }}
      >
        {"// Métadonnées extraites"}
      </div>
      {rows.map(([key, value]) => (
        <div key={key}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "#7F7BA9",
              marginBottom: 2,
            }}
          >
            {key}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#B8B5D1",
              background: "#05041A",
              border: "1px solid #1F1B47",
              padding: "5px 10px",
              wordBreak: "break-word",
            }}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
