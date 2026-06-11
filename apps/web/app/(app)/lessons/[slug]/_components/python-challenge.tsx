"use client";

import React, { useEffect, useRef, useState } from "react";
import type { default as MonacoEditorComp, BeforeMount } from "@monaco-editor/react";
import { useLessonCompletion } from "./lesson-completion-context";

const CHALLENGE_WORKER_TIMEOUT_MS = 15_000;

export interface TestCase {
  input: string;
  expected: string;
  label?: string;
}

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  isError?: boolean;
}

interface WorkerTestMessage {
  id: string;
  results?: TestResult[];
}

// Separate worker singleton - never shared with CodePlayground
let challengeWorker: Worker | null = null;

function runTestsInWorker(code: string, tests: TestCase[]): Promise<TestResult[]> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    challengeWorker ??= new Worker("/workers/py-runner.js");
    const worker = challengeWorker;
    let timedOut = false;

    const handler = (e: MessageEvent<WorkerTestMessage>) => {
      if (e.data.id !== id) return;
      if (timedOut) return;
      clearTimeout(timer);
      worker.removeEventListener("message", handler);
      resolve(e.data.results ?? []);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      worker.removeEventListener("message", handler);
      worker.terminate();
      challengeWorker = null;
      resolve(
        tests.map((t) => ({
          input: t.input,
          expected: t.expected,
          actual: "Timeout (>15s)",
          passed: false,
          isError: true,
        })),
      );
    }, CHALLENGE_WORKER_TIMEOUT_MS);

    worker.addEventListener("message", handler);
    worker.postMessage({ id, code, tests });
  });
}

export interface PythonChallengeProps {
  id: string;
  title?: string;
  description?: string;
  starterCode?: string;
  tests: TestCase[];
}

export function PythonChallenge({
  id,
  title,
  description,
  starterCode = "",
  tests,
}: PythonChallengeProps): React.ReactElement {
  const itemId = id;
  const initialCode = starterCode.trim();
  const [code, setCode] = useState(initialCode);
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const EditorRef = useRef<typeof MonacoEditorComp | null>(null);

  const completion = useLessonCompletion();
  const completionRef = useRef(completion);
  completionRef.current = completion;

  useEffect(() => {
    completionRef.current?.register(itemId);
    return () => {
      completionRef.current?.unregister(itemId);
    };
  }, [itemId]);

  useEffect(() => {
    void import("@monaco-editor/react").then((mod) => {
      EditorRef.current = mod.default;
      setEditorLoaded(true);
    });
  }, []);

  const allPassed =
    testResults !== null && testResults.length > 0 && testResults.every((r) => r.passed);

  useEffect(() => {
    if (allPassed) completionRef.current?.markDone(itemId);
  }, [allPassed, itemId]);

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

  async function handleRunTests() {
    setRunning(true);
    setTestResults(null);
    const results = await runTestsInWorker(code, tests);
    setTestResults(results);
    setRunning(false);
  }

  const MonacoEditor = EditorRef.current;
  const passedCount = testResults?.filter((r) => r.passed).length ?? 0;
  const totalCount = tests.length;

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
              background: allPassed ? "#0AFFD4" : "#B14DFF",
              boxShadow: allPassed ? "0 0 8px #0AFFD499" : "0 0 8px #B14DFF99",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          {title ?? "Python Challenge"}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#B14DFF",
            padding: "4px 8px",
            border: "1px solid #B14DFF59",
            background: "#B14DFF0D",
          }}
        >
          Pyodide · {totalCount} test{totalCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Description */}
      {description !== undefined && (
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #1F1B47",
            background: "rgba(5,4,26,0.3)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: 14,
              color: "#B8B5D1",
              lineHeight: 1.65,
            }}
          >
            {description}
          </p>
        </div>
      )}

      {/* Monaco editor or textarea fallback */}
      {editorLoaded && MonacoEditor ? (
        <MonacoEditor
          height="240px"
          language="python"
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
            height: 240,
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
            void handleRunTests();
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
            background: running ? "rgba(177,77,255,0.4)" : "#B14DFF",
            color: "#ffffff",
            border: 0,
            borderRight: "1px solid rgba(177,77,255,0.5)",
            cursor: running ? "wait" : "pointer",
            transition: "background 180ms ease",
            boxShadow: running ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.15)",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!running) e.currentTarget.style.background = "#C060FF";
          }}
          onMouseLeave={(e) => {
            if (!running) e.currentTarget.style.background = "#B14DFF";
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
          {running ? "TESTS EN COURS..." : "LANCER LES TESTS"}
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
            {testResults !== null && (
              <>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: allPassed ? "#0AFFD4" : "#FF4757",
                    boxShadow: `0 0 6px ${allPassed ? "#0AFFD4" : "#FF4757"}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: allPassed ? "#0AFFD4" : "#FF4757",
                  }}
                >
                  {passedCount}/{totalCount} · {allPassed ? "VALIDÉ" : "ÉCHEC"}
                </span>
              </>
            )}
            {testResults === null && !running && (
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#44406B",
                }}
              >
                EN ATTENTE
              </span>
            )}
            {running && (
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#B14DFF",
                }}
              >
                EXÉCUTION...
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
            challenge.py · python 3.11
          </span>
        </div>
      </div>

      {/* Test results panel */}
      {testResults !== null && (
        <div
          style={{
            borderTop: "1px solid #1F1B47",
            background: "#030219",
          }}
        >
          {testResults.map((result, i) => {
            const label = tests[i]?.label ?? `Test ${String(i + 1)}`;
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1fr auto",
                  alignItems: "start",
                  gap: 12,
                  padding: "10px 18px",
                  borderBottom: i < testResults.length - 1 ? "1px solid #0F0D2B" : "none",
                  background: result.passed ? "rgba(10,255,212,0.02)" : "rgba(255,71,87,0.02)",
                }}
              >
                {/* Status icon */}
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: result.passed ? "#0AFFD4" : "#FF4757",
                    paddingTop: 1,
                  }}
                >
                  {result.passed ? "✓" : "✗"}
                </span>

                {/* Test label + error detail */}
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 11,
                      marginBottom: !result.passed ? 4 : 0,
                    }}
                  >
                    <span style={{ color: "#44406B" }}>{label} · </span>
                    <span style={{ color: "#B14DFF" }}>{result.input}</span>
                  </div>
                  {!result.passed && (
                    <div
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: "#FF4757",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {result.isError ? result.actual : `obtenu : ${result.actual}`}
                    </div>
                  )}
                </div>

                {/* Expected / actual value */}
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {result.passed ? (
                    <span style={{ color: "#0AFFD4" }}>{result.actual}</span>
                  ) : (
                    <span>
                      <span style={{ color: "#44406B" }}>attendu : </span>
                      <span style={{ color: "#6B6890" }}>{result.expected}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* All-pass celebration row */}
          {allPassed && (
            <div
              style={{
                padding: "12px 18px",
                background: "rgba(10,255,212,0.04)",
                borderTop: "1px solid rgba(10,255,212,0.1)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "#0AFFD4",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg viewBox="0 0 12 12" width={10} height={10} fill="none">
                <path
                  d="M2 6 L5 9 L10 3"
                  stroke="#0AFFD4"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Tous les tests passent · Section déverrouillée
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      `}</style>
    </div>
  );
}
