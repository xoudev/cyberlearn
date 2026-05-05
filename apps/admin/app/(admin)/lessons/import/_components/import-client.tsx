"use client";

import React, { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ImportValidationResult, ImportValidationError } from "@cyberlearn/types";
import { validateImportAction, importLessonAction } from "../actions";

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

export function ImportClient(): React.ReactElement {
  const router = useRouter();
  const [mdxContent, setMdxContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [imported, setImported] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isValidating, startValidation] = useTransition();
  const [isImporting, startImport] = useTransition();

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function processFile(file: File) {
    setFileError(null);
    setValidation(null);
    setImported(false);

    if (!file.name.endsWith(".mdx")) {
      setFileError("Fichier invalide, seuls les fichiers .mdx sont acceptés.");
      return;
    }
    if (file.size > 512 * 1024) {
      setFileError("Fichier trop grand, maximum 500 Ko.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setMdxContent(content);
      triggerValidation(content);
    };
    reader.readAsText(file, "utf-8");
  }

  function triggerValidation(content: string) {
    startValidation(async () => {
      const result = await validateImportAction(content);
      setValidation(result);
    });
  }

  function handleEditorChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const content = e.target.value;
    setMdxContent(content);
    setValidation(null);
    setImported(false);
  }

  function handleValidate() {
    triggerValidation(mdxContent);
  }

  function handleImport() {
    startImport(async () => {
      const result = await importLessonAction(mdxContent);
      if (result.status === "success") {
        setImported(true);
        setImportedId(result.lessonId);
        setImportWarnings(result.warnings);
      } else if (result.status === "validation_error") {
        setValidation(result.result);
      } else if (result.status === "rate_limited") {
        setValidation({
          valid: false,
          errors: [{ message: "Limite atteinte, 10 imports maximum par heure." }],
          warnings: [],
        });
      }
    });
  }

  return (
    <div className="import-grid">
      {/* Panel 1 — Drop zone + validation results */}
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
              color: "#6B6890",
              margin: "0 0 10px",
            }}
          >
            {fileName ?? "Glissez un fichier .mdx ici"}
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
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {fileError && <ErrorBanner message={fileError} />}

        {/* Validation status */}
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
            Validation en cours…
          </div>
        )}

        {validation && !isValidating && <ValidationPanel result={validation} />}

        {imported && (
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
            {importWarnings.map((w, i) => (
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
            {importedId && (
              <button
                type="button"
                onClick={() => {
                  router.push(`/lessons/${importedId}/edit`);
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
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={handleValidate}
            disabled={!mdxContent || isValidating || isImporting}
            style={{
              padding: "10px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid #2A2560",
              color: mdxContent ? "#B8B5D1" : "#44406B",
              cursor: mdxContent ? "pointer" : "not-allowed",
            }}
          >
            {isValidating ? "Validation…" : "Valider"}
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={!validation?.valid || isImporting || imported}
            style={{
              padding: "10px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: validation?.valid && !imported ? "#0024FF" : "transparent",
              border: `1px solid ${validation?.valid && !imported ? "#0024FF" : "#2A2560"}`,
              color: validation?.valid && !imported ? "#fff" : "#44406B",
              cursor: validation?.valid && !imported ? "pointer" : "not-allowed",
              transition: "all 150ms ease",
            }}
          >
            {isImporting ? "Import…" : imported ? "Importée ✓" : "Importer en DRAFT"}
          </button>
        </div>
      </div>

      {/* Panel 2 — MDX editor */}
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
              color: "#44406B",
            }}
          >
            ÉDITEUR MDX
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#44406B" }}>
            {fileName ?? "nouveau-fichier.mdx"}
          </span>
          {!mdxContent && (
            <button
              type="button"
              onClick={() => {
                setMdxContent(EXAMPLE_MDX);
                setFileName("example.mdx");
              }}
              style={{
                marginLeft: "auto",
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
          )}
        </div>
        <textarea
          value={mdxContent}
          onChange={handleEditorChange}
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
            color: "#44406B",
            display: "flex",
            gap: 16,
          }}
        >
          <span>{mdxContent.split("\n").length} lignes</span>
          <span>{mdxContent.length} caractères</span>
          <span>{Math.round((mdxContent.length / 1024) * 10) / 10} Ko</span>
        </div>
      </div>

      {/* Panel 3 — Preview */}
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
              color: "#44406B",
            }}
          >
            APERÇU MÉTADONNÉES
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {validation?.metadata ? (
            <MetadataPreview metadata={validation.metadata} />
          ) : (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#44406B",
                paddingTop: 20,
              }}
            >
              Validez le fichier pour voir l&apos;aperçu…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
              color: "#44406B",
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
