"use client";

import React, { useEffect, useRef, useState } from "react";
import type { default as MonacoEditorComp, BeforeMount } from "@monaco-editor/react";
import { parseChallengeTests, type ChallengeTestCase } from "@cyberlearn/types";
import { getPythonRuntime, type PythonTestResult } from "@/lib/python/runtime";
import { useCodeDraft } from "@/lib/lessons/code-draft";
import { useLessonCompletion } from "./lesson-completion-context";
import {
  DraftControls,
  ErrorHint,
  PythonStatusNotice,
  usePythonRuntimeState,
} from "./python-status";

/** A test once it has been through parseChallengeTests: both fields are text. */
export type TestCase = ChallengeTestCase;

export interface PythonChallengeProps {
  id: string;
  title?: string;
  description?: string;
  starterCode?: string;
  /**
   * Whatever the author wrote. An MDX attribute is code nobody type-checks,
   * so this is read, not trusted: see parseChallengeTests.
   */
  tests: unknown;
}

/**
 * The challenge, once its tests have been read.
 *
 * A misconfigured challenge used to take the whole lesson down: a dictionary
 * in `expected` reached React as an object to render as text, and nobody could
 * read the lesson at all (Sentry JAVASCRIPT-NEXTJS-15). Now it renders a notice
 * where the challenge would be, and the rest of the lesson stands.
 *
 * The notice does not register with the section's completion gate. A student
 * cannot pass a challenge that cannot be passed, and holding them in the
 * section for it would turn the author's mistake into theirs.
 */
export function PythonChallenge(props: PythonChallengeProps): React.ReactElement {
  const parsed = parseChallengeTests(props.tests);
  if (!parsed.ok) {
    return <ChallengeMisconfigured title={props.title} problem={parsed.problem} />;
  }
  return <PythonChallengeBody {...props} tests={parsed.tests} />;
}

function ChallengeMisconfigured({
  title,
  problem,
}: {
  title: string | undefined;
  problem: string;
}): React.ReactElement {
  return (
    <div
      role="note"
      style={{
        margin: "32px 0",
        padding: "18px 20px",
        border: "1px solid rgba(255,176,32,0.45)",
        borderLeft: "3px solid #FFB020",
        background: "rgba(255,176,32,0.06)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#FFB020",
          marginBottom: 8,
        }}
      >
        Défi indisponible{title !== undefined ? ` · ${title}` : ""}
      </div>
      <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14, lineHeight: 1.55 }}>
        Ce défi est mal configuré et ne peut pas être lancé. Tu peux continuer la leçon.
      </p>
      <p
        style={{
          margin: "10px 0 0",
          color: "#7F7BA9",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        Pour l&apos;auteur : {problem}
      </p>
    </div>
  );
}

function PythonChallengeBody({
  id,
  title,
  description,
  starterCode = "",
  tests,
}: Omit<PythonChallengeProps, "tests"> & { tests: TestCase[] }): React.ReactElement {
  const itemId = id;
  const initialCode = starterCode.trim();
  const { code, setCode, reset, restored, revision } = useCodeDraft(itemId, initialCode);
  const runtimeState = usePythonRuntimeState();
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<PythonTestResult[] | null>(null);
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
        { token: "comment", foreground: "7F7BA9", fontStyle: "italic" },
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
        "editorLineNumber.activeForeground": "var(--cosmetic-accent)",
        "editor.selectionBackground": "#2A2560",
        "editorCursor.foreground": "var(--cosmetic-accent)",
        "editor.inactiveSelectionBackground": "#1F1B47",
        "editorIndentGuide.background1": "#1F1B47",
        "editorWhitespace.foreground": "#2A2560",
      },
    });
  };

  async function handleRunTests() {
    setRunning(true);
    setTestResults(null);
    const results = await getPythonRuntime().runTests(code, tests);
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
              background: allPassed ? "var(--cosmetic-accent)" : "#B14DFF",
              boxShadow: allPassed ? "0 0 8px var(--cosmetic-accent)99" : "0 0 8px #B14DFF99",
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
          // Remounted when a draft is restored or reset: the editor is
          // uncontrolled, and only reads its value when it mounts.
          key={revision}
          height="240px"
          language="python"
          defaultValue={code}
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
          {running
            ? runtimeState === "loading"
              ? "DÉMARRAGE..."
              : "TESTS EN COURS..."
            : "LANCER LES TESTS"}
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
                    background: allPassed ? "var(--cosmetic-accent)" : "#FF4757",
                    boxShadow: `0 0 6px ${allPassed ? "var(--cosmetic-accent)" : "#FF4757"}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: allPassed ? "var(--cosmetic-accent)" : "#FF4757",
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <DraftControls
              restored={restored}
              onReset={() => {
                reset();
                setTestResults(null);
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "#44406B",
              }}
            >
              challenge.py · python 3.12
            </span>
          </span>
        </div>
      </div>

      <PythonStatusNotice state={runtimeState} busy={running} />

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
            // Three tests failing on the same line would say the same hint
            // three times: it is given once, under the first.
            const firstWithHint =
              result.hint != null &&
              testResults.findIndex((r) => !r.passed && r.hint === result.hint) === i;
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
                  background: result.passed
                    ? "color-mix(in srgb, var(--cosmetic-accent) 2%, transparent)"
                    : "rgba(255,71,87,0.02)",
                }}
              >
                {/* Status icon */}
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: result.passed ? "var(--cosmetic-accent)" : "#FF4757",
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
                  {!result.passed && firstWithHint && <ErrorHint hint={result.hint} />}
                  {result.output !== undefined && result.output.trim() !== "" && (
                    <div
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: "#7F7BA9",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        marginTop: 4,
                      }}
                    >
                      <span style={{ color: "#44406B" }}>affiché : </span>
                      {result.output.trimEnd()}
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
                    <span style={{ color: "var(--cosmetic-accent)" }}>{result.actual}</span>
                  ) : (
                    <span>
                      <span style={{ color: "#44406B" }}>attendu : </span>
                      <span style={{ color: "#7F7BA9" }}>{result.expected}</span>
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
                background: "color-mix(in srgb, var(--cosmetic-accent) 4%, transparent)",
                borderTop: "1px solid color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "var(--cosmetic-accent)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg viewBox="0 0 12 12" width={10} height={10} fill="none">
                <path
                  d="M2 6 L5 9 L10 3"
                  stroke="var(--cosmetic-accent)"
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
