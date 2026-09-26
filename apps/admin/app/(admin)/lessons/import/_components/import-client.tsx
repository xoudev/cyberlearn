"use client";

import React, { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ImportValidationResult, ImportValidationError } from "@cyberlearn/types";
import { validateImportBatchAction, importLessonBatchAction } from "../actions";

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

interface BatchFile {
  name: string;
  content: string;
  validation: ImportValidationResult | null;
  imported: { lessonId: string; warnings: string[] } | null;
}

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

export function ImportClient(): React.ReactElement {
  const router = useRouter();
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [selected, setSelected] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [isValidating, startValidation] = useTransition();
  const [isImporting, startImport] = useTransition();

  const current: BatchFile | undefined = files[selected];
  const busy = isValidating || isImporting;
  const validCount = files.filter(
    (f) => f.validation?.valid === true && f.imported === null,
  ).length;
  const importedCount = files.filter((f) => f.imported !== null).length;

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
        problems.push("lot trop volumineux (max 4 Mo au total), retirez des fichiers");
      }

      setFiles(kept);
      setFileError(problems.length > 0 ? `Attention : ${problems.join(" · ")}` : null);

      // Select the first newly added file; otherwise keep a valid selection.
      const firstNew = loaded.length > 0 ? kept.findIndex((f) => f.name === loaded[0]?.name) : -1;
      setSelected(firstNew >= 0 ? firstNew : Math.min(selected, Math.max(0, kept.length - 1)));
    },
    [files, selected],
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
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

  function handleValidate() {
    const toValidate = files.filter((f) => f.imported === null);
    if (toValidate.length === 0) return;
    setFileError(null);
    setBatchSummary(null);
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
    const toImport = files.filter((f) => f.validation?.valid === true && f.imported === null);
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
      const skipped = res.outcomes.filter((o) => o.status === "skipped").length;
      const byName = new Map(res.outcomes.map((o) => [o.name, o]));
      setFiles((prev) =>
        prev.map((f) => {
          const outcome = byName.get(f.name);
          if (!outcome) return f;
          if (outcome.status === "success") {
            return { ...f, imported: { lessonId: outcome.lessonId, warnings: outcome.warnings } };
          }
          if (outcome.status === "validation_error") {
            return { ...f, validation: outcome.result, imported: null };
          }
          return f; // skipped: untouched, retry later
        }),
      );
      setBatchSummary(
        `${String(ok)} leçon${ok > 1 ? "s" : ""} importée${ok > 1 ? "s" : ""} en DRAFT` +
          (ko > 0 ? ` · ${String(ko)} refusée${ko > 1 ? "s" : ""}` : "") +
          (skipped > 0
            ? ` · ${String(skipped)} non traitée${skipped > 1 ? "s" : ""} (limite)`
            : ""),
      );
    });
  }

  function handleEditorChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const content = e.target.value;
    setFiles((prev) =>
      prev.map((f, i) => (i === selected ? { ...f, content, validation: null } : f)),
    );
    setBatchSummary(null);
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    setSelected((s) => Math.max(0, Math.min(index < s ? s - 1 : s, next.length - 1)));
  }

  function newFile(name: string, content: string) {
    if (files.some((f) => f.name === name) || files.length >= MAX_FILES) return;
    setFiles((prev) => [...prev, { name, content, validation: null, imported: null }]);
    setSelected(files.length);
  }

  return (
    <div className="import-grid">
      {/* Panel 1 - Drop zone + file list + validation results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={handleFileDrop}
          style={{
            border: "2px dashed #2A2560",
            padding: "24px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: "rgba(5,4,26,0.4)",
            transition: "border-color 150ms ease",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2A2560"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ marginBottom: 10 }}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 12 15 15" />
          </svg>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#7F7BA9",
              margin: "0 0 10px",
            }}
          >
            {files.length === 0
              ? "Glissez un ou plusieurs fichiers .mdx ici"
              : `${String(files.length)} fichier${files.length > 1 ? "s" : ""} dans le lot`}
          </p>
          <label
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#4D8BFF",
              border: "1px solid #2A2560",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Parcourir
            <input
              type="file"
              accept=".mdx"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
        </div>

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
                        router.push(`/lessons/${f.imported?.lessonId ?? ""}/edit`);
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
              background: "rgba(77,139,255,0.06)",
              border: "1px solid rgba(77,139,255,0.2)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#4D8BFF",
            }}
          >
            Validation du lot en cours…
          </div>
        )}

        {current?.validation && !current.imported && !isValidating && (
          <ValidationPanel result={current.validation} />
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
              ✓ Leçon importée en DRAFT
            </div>
            {current.imported.warnings.map((w, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#FFB020",
                  marginTop: 4,
                }}
              >
                ⚠ {w}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                router.push(`/lessons/${current.imported?.lessonId ?? ""}/edit`);
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
                ? `${String(importedCount)} importée${importedCount > 1 ? "s" : ""} ✓`
                : `Importer ${String(validCount)} leçon${validCount > 1 ? "s" : ""} en DRAFT`}
          </button>
        </div>
      </div>

      {/* Panel 2 - MDX editor (selected file) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
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
            ÉDITEUR MDX
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#7F7BA9" }}>
            {current?.name ?? "aucun fichier"}
            {current?.imported ? " · importée (lecture seule)" : ""}
          </span>
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
                  color: "#4D8BFF",
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
                  color: "#4D8BFF",
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
        <textarea
          value={current?.content ?? ""}
          onChange={handleEditorChange}
          disabled={current?.imported !== null || busy}
          spellCheck={false}
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
              Validez le lot pour voir l&apos;aperçu…
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
  const status = file.imported
    ? { color: "#0AFFD4", label: "importée" }
    : file.validation === null
      ? { color: "#7F7BA9", label: "à valider" }
      : file.validation.valid
        ? {
            color: "#0AFFD4",
            label:
              file.validation.warnings.length > 0
                ? `valide · ${String(file.validation.warnings.length)} ⚠`
                : "valide",
          }
        : {
            color: "#FF4757",
            label: `${String(file.validation.errors.length)} erreur${file.validation.errors.length > 1 ? "s" : ""}`,
          };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderBottom: "1px solid rgba(26,22,64,0.7)",
        background: active ? "rgba(77,139,255,0.07)" : "transparent",
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
            boxShadow: `0 0 5px ${status.color}80`,
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
        background: "rgba(255,71,87,0.06)",
        border: "1px solid rgba(255,71,87,0.3)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "#FF4757",
      }}
    >
      {message}
    </div>
  );
}

function ValidationPanel({ result }: { result: ImportValidationResult }) {
  return (
    <div
      style={{
        background: "rgba(5,4,26,0.6)",
        border: `1px solid ${result.valid ? "rgba(10,255,212,0.25)" : "rgba(255,71,87,0.3)"}`,
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
            background: result.valid ? "#0AFFD4" : "#FF4757",
            display: "inline-block",
            boxShadow: result.valid
              ? "0 0 6px rgba(10,255,212,0.6)"
              : "0 0 6px rgba(255,71,87,0.6)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: result.valid ? "#0AFFD4" : "#FF4757",
          }}
        >
          {result.valid
            ? "VALIDE"
            : `${String(result.errors.length)} ERREUR${result.errors.length > 1 ? "S" : ""}`}
        </span>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div style={{ padding: "8px 0" }}>
          {result.errors.map((e, i) => (
            <ErrorItem key={i} error={e} />
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
                color: "#FFB020",
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

function ErrorItem({ error }: { error: ImportValidationError }) {
  return (
    <div style={{ padding: "6px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#FF4757", marginTop: 1 }}
      >
        ✕
      </span>
      <div>
        {error.field && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "#FF8090",
              marginBottom: 2,
              display: "block",
            }}
          >
            {error.field}
            {error.line ? `:${String(error.line)}` : ""}
          </span>
        )}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#B8B5D1" }}>
          {error.message}
        </span>
      </div>
    </div>
  );
}

function MetadataPreview({
  metadata,
}: { metadata: NonNullable<ImportValidationResult["metadata"]> }) {
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
