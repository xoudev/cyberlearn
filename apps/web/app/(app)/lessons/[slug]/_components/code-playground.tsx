"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { default as MonacoEditorComp, BeforeMount } from "@monaco-editor/react";
import { useLessonCompletion } from "./lesson-completion-context";

const WORKER_TIMEOUT_MS = 10_000;

interface RunResult {
  output: string;
  error: string | null;
}

// ── Worker singleton cache per language ────────────────────────────────────────

let pyWorker: Worker | null = null;
let jsWorker: Worker | null = null;
let cWorker: Worker | null = null;
let asmWorker: Worker | null = null;

type Language = "python" | "javascript" | "c" | "asm";

function getWorker(language: Language): Worker {
  if (language === "python") {
    pyWorker ??= new Worker("/workers/py-runner.js");
    return pyWorker;
  }
  if (language === "javascript") {
    jsWorker ??= new Worker("/workers/js-runner.js");
    return jsWorker;
  }
  if (language === "c") {
    cWorker ??= new Worker("/workers/cpp-runner.js");
    return cWorker;
  }
  // SAFETY: new URL() is resolved by webpack at build time for worker bundling
  asmWorker ??= new Worker(new URL("../_workers/asm.worker.ts", import.meta.url));
  return asmWorker;
}

// ── Execution ──────────────────────────────────────────────────────────────────

function runInWorker(language: Language, code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    const worker = getWorker(language);

    const timer = setTimeout(() => {
      resolve({ output: "", error: "Timeout : exécution interrompue après 10 secondes." });
    }, WORKER_TIMEOUT_MS);

    const handler = (e: MessageEvent<{ id: string; output: string; error: string | null }>) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      worker.removeEventListener("message", handler);
      resolve({ output: e.data.output, error: e.data.error });
    };

    worker.addEventListener("message", handler);
    worker.postMessage({ id, code });
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

// MDX wraps text children in React elements (<p>, etc.) instead of passing
// raw strings. This helper extracts all text leaf nodes so both prop styles work.
function extractCodeText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractCodeText).join("\n");
  if (React.isValidElement(node)) {
    return extractCodeText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

export interface CodePlaygroundProps {
  id?: string;
  language?: Language;
  /** Starter code — either via children or the `starterCode` prop. */
  children?: React.ReactNode;
  starterCode?: string;
  expectedOutput?: string;
  validate?: boolean;
  title?: string;
}

export function CodePlayground({
  id,
  language = "python",
  children,
  starterCode,
  expectedOutput,
  validate,
  title,
}: CodePlaygroundProps): React.ReactElement {
  const autoId = useId();
  const itemId = id ?? autoId;

  const initialCode = (starterCode ?? extractCodeText(children)).trim();
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const EditorRef = useRef<typeof MonacoEditorComp | null>(null);

  const completion = useLessonCompletion();
  const completionRef = useRef(completion);
  completionRef.current = completion;

  // Register as required if validate prop is set
  useEffect(() => {
    if (!validate) return;
    completionRef.current?.register(itemId);
    return () => {
      completionRef.current?.unregister(itemId);
    };
  }, [itemId, validate]);

  // Load Monaco lazily
  useEffect(() => {
    void import("@monaco-editor/react").then((mod) => {
      EditorRef.current = mod.default;
      setEditorLoaded(true);
    });
  }, []);

  // Define the custom CyberLearn Monaco theme before mount
  const handleBeforeMount: BeforeMount = (monaco) => {
    // SAFETY: BeforeMount provides the full Monaco namespace; defineTheme is a standard API
    (
      monaco as { editor: { defineTheme: (name: string, data: unknown) => void } }
    ).editor.defineTheme("cyberlearn-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6B6890", fontStyle: "italic" },
        { token: "keyword", foreground: "4D8BFF" },
        { token: "string", foreground: "0AFFD4" },
        { token: "number", foreground: "FFB020" },
        { token: "type", foreground: "B14DFF" },
        { token: "identifier", foreground: "E0DDFF" },
      ],
      colors: {
        "editor.background": "#0A0826",
        "editor.foreground": "#E0DDFF",
        "editor.lineHighlightBackground": "#1A1838",
        "editorLineNumber.foreground": "#3F3D5C",
        "editorLineNumber.activeForeground": "#0AFFD4",
        "editor.selectionBackground": "#2A2560",
        "editorCursor.foreground": "#0AFFD4",
        "editor.inactiveSelectionBackground": "#1F1B47",
        "editorIndentGuide.background1": "#1F1B47",
        "editorWhitespace.foreground": "#2A2560",
      },
    });
  };

  const isValidated =
    validate &&
    expectedOutput !== undefined &&
    result !== null &&
    result.error === null &&
    normalizeOutput(result.output) === normalizeOutput(expectedOutput);

  // Mark done when validation passes
  useEffect(() => {
    if (isValidated) completionRef.current?.markDone(itemId);
  }, [isValidated, itemId]);

  async function handleRun() {
    setRunning(true);
    setResult(null);
    const r = await runInWorker(language, code);
    setResult(r);
    setRunning(false);
  }

  const MonacoEditor = EditorRef.current;

  const LANG_META: Record<Language, { label: string; badge: string; ext: string; color: string }> =
    {
      python: { label: "Python Sandbox", badge: "Pyodide · WASM", ext: "py", color: "#0AFFD4" },
      javascript: {
        label: "JavaScript Sandbox",
        badge: "Web Worker · ES6",
        ext: "js",
        color: "#FFB020",
      },
      c: { label: "C Sandbox", badge: "jscpp", ext: "c", color: "#4D8BFF" },
      asm: { label: "Assembly x86-64", badge: "NASM · Simulé", ext: "asm", color: "#FF4757" },
    };
  const {
    label: sandboxLabel,
    badge: sandboxBadge,
    ext: langExt,
    color: langColor,
  } = LANG_META[language];

  const runStatus: "ready" | "loading" | "success" | "error" = running
    ? "loading"
    : result === null
      ? "ready"
      : result.error
        ? "error"
        : "success";

  const STATUS_LABEL: Record<typeof runStatus, string> = {
    ready: "PRÊT",
    loading: "COMPILATION...",
    success: "OK",
    error: "ERREUR RUNTIME",
  };
  const STATUS_COLOR: Record<typeof runStatus, string> = {
    ready: "#0AFFD4",
    loading: "#FFB020",
    success: "#0AFFD4",
    error: "#FF4757",
  };
  const statusColor = STATUS_COLOR[runStatus];

  return (
    <div
      style={{
        margin: "32px 0",
        border: "1px solid #1F1B47",
        background: "#0A0826",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #1F1B47",
          background: "rgba(5,4,26,0.6)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#B8B5D1",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: langColor,
              boxShadow: `0 0 8px ${langColor}99`,
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          {title ?? sandboxLabel}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: langColor,
            padding: "4px 8px",
            border: `1px solid ${langColor}59`,
            background: `${langColor}0D`,
          }}
        >
          {sandboxBadge}
        </span>
      </div>

      {/* Monaco or textarea fallback */}
      {editorLoaded && MonacoEditor ? (
        <MonacoEditor
          height="220px"
          language={
            language === "python"
              ? "python"
              : language === "c"
                ? "c"
                : language === "asm"
                  ? "plaintext"
                  : "javascript"
          }
          defaultValue={initialCode}
          onChange={(v) => {
            setCode(v ?? "");
          }}
          theme="cyberlearn-dark"
          beforeMount={handleBeforeMount}
          options={{
            fontSize: 13,
            fontFamily: "JetBrains Mono, monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "off",
            padding: { top: 12, bottom: 12 },
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: "none",
            glyphMargin: false,
            automaticLayout: true,
            fixedOverflowWidgets: true,
            scrollbar: {
              vertical: "hidden",
              horizontal: "auto",
              useShadows: false,
              verticalScrollbarSize: 0,
              alwaysConsumeMouseWheel: false,
            },
          }}
        />
      ) : (
        <textarea
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
          }}
          style={{
            display: "block",
            width: "100%",
            height: 220,
            background: "#0A0826",
            border: "none",
            color: "#B8B5D1",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            lineHeight: 1.7,
            padding: "12px 20px",
            resize: "vertical",
            outline: "none",
          }}
          spellCheck={false}
        />
      )}

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          borderTop: "1px solid #1F1B47",
          background: "rgba(5,4,26,0.7)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            void handleRun();
          }}
          disabled={running}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "0 22px",
            minHeight: 44,
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: running ? "rgba(0,36,255,0.4)" : "#0024FF",
            color: "#ffffff",
            border: 0,
            borderRight: "1px solid rgba(0,36,255,0.5)",
            cursor: running ? "wait" : "pointer",
            transition: "background 180ms ease",
            boxShadow: running ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.15)",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!running) e.currentTarget.style.background = "#1F3BFF";
          }}
          onMouseLeave={(e) => {
            if (!running) e.currentTarget.style.background = "#0024FF";
          }}
        >
          {running ? (
            <span
              style={{
                fontSize: 14,
                animation: "spin 0.9s linear infinite",
                display: "inline-block",
              }}
            >
              ⟳
            </span>
          ) : (
            <span style={{ fontSize: 9, lineHeight: 1 }}>▶</span>
          )}
          {running ? "EXÉCUTION..." : "EXÉCUTER"}
        </button>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: statusColor,
                boxShadow: `0 0 6px ${statusColor}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: statusColor,
              }}
            >
              {STATUS_LABEL[runStatus]}
            </span>
            {isValidated && (
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#0AFFD4",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <svg viewBox="0 0 12 12" width={8} height={8} fill="none">
                  <path
                    d="M2 6 L5 9 L10 3"
                    stroke="#0AFFD4"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Validé
              </span>
            )}
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "#44406B",
            }}
          >
            main.{langExt} ·{" "}
            {language === "python"
              ? "python 3.11"
              : language === "javascript"
                ? "es2022"
                : language === "c"
                  ? "C11 · jscpp"
                  : "x86-64 · NASM"}
          </span>
        </div>
      </div>

      {/* Output area */}
      {result !== null && (
        <div
          style={{
            borderTop: "1px solid #1F1B47",
            background: "#030219",
            padding: "16px 18px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12.5,
            lineHeight: 1.7,
            minHeight: 80,
            whiteSpace: "pre-wrap",
          }}
        >
          {result.output.trim().length > 0 &&
            result.output
              .trim()
              .split("\n")
              .map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#0AFFD4", flexShrink: 0, userSelect: "none" }}>
                    &gt;&gt;&gt;
                  </span>
                  <span style={{ color: "#E0DDFF" }}>{line}</span>
                </div>
              ))}
          {result.error &&
            cleanError(result.error, language)
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#FF4757", flexShrink: 0, userSelect: "none" }}>!!!</span>
                  <span style={{ color: "#FF4757" }}>{line}</span>
                </div>
              ))}
          {!result.output.trim() && !result.error && (
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ color: "#0AFFD4", flexShrink: 0, userSelect: "none" }}>
                &gt;&gt;&gt;
              </span>
              <span style={{ color: "#3F3D5C", fontStyle: "italic" }}>(aucune sortie)</span>
            </div>
          )}
        </div>
      )}

      {validate && expectedOutput !== undefined && (
        <div
          style={{
            padding: "6px 18px",
            background: "rgba(3,2,25,0.5)",
            borderTop: "1px solid #1F1B47",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "#3F3D5C",
          }}
        >
          Sortie attendue : <b style={{ color: "#6B6890" }}>{expectedOutput}</b>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      `}</style>
    </div>
  );
}

function normalizeOutput(s: string): string {
  return s.trim().replace(/\r\n/g, "\n");
}

/**
 * Strips internal Pyodide/Node call stack frames so learners only see
 * the relevant error lines from their own code.
 *
 * Python: keeps from the last `File "<exec>"` line onwards.
 * JS: drops `at eval` / `at <anonymous>` internal frames.
 */
function cleanError(error: string, lang: Language): string {
  if (lang === "python") {
    const execIdx = error.lastIndexOf('  File "<exec>"');
    if (execIdx !== -1) return error.slice(execIdx).trim();
    // Fallback: drop lines that reference Pyodide internals
    const cleaned = error
      .split("\n")
      .filter((l) => !l.includes("/lib/python") && !l.includes("_pyodide"))
      .join("\n")
      .trim();
    return cleaned || error;
  }
  // JavaScript: drop V8 internal frames
  const cleaned = error
    .split("\n")
    .filter((l) => !/^\s+at (eval|<anonymous>|Function)/.test(l))
    .join("\n")
    .trim();
  return cleaned || error;
}
