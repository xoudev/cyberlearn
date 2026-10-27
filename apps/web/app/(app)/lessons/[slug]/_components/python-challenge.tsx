"use client";

import "./lesson-practice.css";

import React, { useEffect, useRef, useState } from "react";
import type { default as MonacoEditorComp, BeforeMount } from "@monaco-editor/react";
import { parseChallengeTests, type ChallengeTestCase } from "@cyberlearn/types";
import { getPythonRuntime, type PythonTestResult } from "@/lib/python/runtime";
import { useCodeDraft } from "@/lib/lessons/code-draft";
import { useLessonCompletion } from "./lesson-completion-context";
import { defineLessonEditorTheme, LESSON_EDITOR_THEME } from "./lesson-editor-theme";
import { useExerciseRecord } from "./use-exercise-record";
import {
  DraftControls,
  ErrorHint,
  PythonStatusNotice,
  usePythonRuntimeState,
} from "./python-status";
import { LAB_LABEL_SIZE, LAB_MONO_SIZE } from "./lab-text";

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
        borderLeft: "3px solid var(--color-warning)",
        background: "rgba(255,176,32,0.06)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: LAB_LABEL_SIZE,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--color-warning)",
          marginBottom: 8,
        }}
      >
        Défi indisponible{title !== undefined ? ` · ${title}` : ""}
      </div>
      <p
        style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1.55 }}
      >
        Ce défi est mal configuré et ne peut pas être lancé. Tu peux continuer la leçon.
      </p>
      <p
        style={{
          margin: "10px 0 0",
          color: "var(--color-text-muted)",
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
  const frameRef = useRef<HTMLDivElement>(null);

  const completion = useLessonCompletion();
  const recordExercise = useExerciseRecord();
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
    if (allPassed) {
      completionRef.current?.markDone(itemId);
      // Done, for the teacher's class view, and a little XP the first time.
      recordExercise(itemId, "PYTHON");
    }
  }, [allPassed, itemId, recordExercise]);

  // The lesson editors' theme, its accent read under this card (lesson-editor-theme.ts)
  const handleBeforeMount: BeforeMount = (monaco) => {
    defineLessonEditorTheme(monaco, frameRef.current);
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
      ref={frameRef}
      className="card card--sunken lesson-practice"
      style={{
        margin: "32px 0",
        position: "relative",
      }}
    >
      {/* Header: the title and the badge share a line where they fit. */}
      <div
        className="lesson-practice__head"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border-subtle)",
          background: "var(--color-bg-elevated)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: LAB_LABEL_SIZE,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
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
              background: allPassed ? "var(--color-success)" : "var(--cosmetic-accent)",
            }}
          />
          {title ?? "Python Challenge"}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: LAB_LABEL_SIZE,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
            padding: "4px 8px",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-base)",
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
            borderBottom: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-base)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: 14,
              color: "var(--color-text-secondary)",
              lineHeight: 1.65,
            }}
          >
            {description}
          </p>
        </div>
      )}

      {/* Monaco editor or textarea fallback, in a box whose height follows
          the block's width (globals.css, .python-challenge__editor). The
          editor fills it and scrolls inside it, with its own scrollbar. */}
      <div className="python-challenge__editor">
        {editorLoaded && MonacoEditor ? (
          <MonacoEditor
            // Remounted when a draft is restored or reset: the editor is
            // uncontrolled, and only reads its value when it mounts.
            key={revision}
            height="100%"
            language="python"
            defaultValue={code}
            onChange={(v) => {
              setCode(v ?? "");
            }}
            theme={LESSON_EDITOR_THEME}
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
                vertical: "auto",
                horizontal: "auto",
                useShadows: false,
                verticalScrollbarSize: 10,
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
              height: "100%",
              background: "var(--color-bg-elevated)",
              border: "none",
              color: "var(--color-text-secondary)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 13,
              lineHeight: 1.7,
              padding: "12px 20px",
              resize: "none",
              outline: "none",
            }}
            spellCheck={false}
          />
        )}
      </div>

      {/* Action bar */}
      <div
        className="lesson-practice__actions"
        style={{
          display: "flex",
          alignItems: "stretch",
          flexWrap: "wrap",
          borderTop: "1px solid var(--color-border-subtle)",
          background: "var(--color-bg-elevated)",
        }}
      >
        <button
          className="lesson-run-button"
          type="button"
          onClick={() => {
            void handleRunTests();
          }}
          disabled={running}
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
            // The glyph is drawn at three quarters of the label it leads, as
            // it was: an icon, not text to read.
            <span aria-hidden="true" style={{ fontSize: "0.75em", lineHeight: 1 }}>
              ▶
            </span>
          )}
          {running
            ? runtimeState === "loading"
              ? "Démarrage…"
              : "Tests en cours…"
            : "Lancer les tests"}
        </button>

        {/* Beside the button where there is room, under it on a phone. */}
        <div
          style={{
            flex: "1 1 240px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "6px 14px",
            padding: "6px 16px",
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
                    background: allPassed
                      ? "var(--cosmetic-accent)"
                      : "var(--color-category-cybersec)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: LAB_LABEL_SIZE,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: allPassed ? "var(--cosmetic-accent)" : "var(--color-category-cybersec)",
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
                  fontSize: LAB_LABEL_SIZE,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--color-text-faint)",
                }}
              >
                EN ATTENTE
              </span>
            )}
            {running && (
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: LAB_LABEL_SIZE,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--cosmetic-accent)",
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
                fontSize: LAB_LABEL_SIZE,
                letterSpacing: "0.1em",
                color: "var(--color-text-faint)",
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
            borderTop: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-base)",
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
                  // The test's line takes what the row leaves, even less than
                  // its longest word, and the expected value at most 40%: past
                  // that both wrap, rather than push the row out of the panel
                  // or leave the test's line no room at all.
                  gridTemplateColumns: "20px minmax(0, 1fr) fit-content(40%)",
                  alignItems: "start",
                  gap: 12,
                  padding: "10px 18px",
                  borderBottom:
                    i < testResults.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                  background: result.passed
                    ? "color-mix(in srgb, var(--cosmetic-accent) 2%, transparent)"
                    : "rgba(255,71,87,0.02)",
                }}
              >
                {/* Status icon */}
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: LAB_LABEL_SIZE,
                    fontWeight: 700,
                    color: result.passed
                      ? "var(--cosmetic-accent)"
                      : "var(--color-category-cybersec)",
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
                      fontSize: LAB_MONO_SIZE,
                      marginBottom: !result.passed ? 4 : 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    <span style={{ color: "var(--color-text-faint)" }}>{label} · </span>
                    <span style={{ color: "var(--color-text-secondary)" }}>{result.input}</span>
                  </div>
                  {!result.passed && (
                    <div
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: LAB_MONO_SIZE,
                        lineHeight: 1.5,
                        color: "var(--color-category-cybersec)",
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
                        fontSize: LAB_MONO_SIZE,
                        lineHeight: 1.5,
                        color: "var(--color-text-muted)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        marginTop: 4,
                      }}
                    >
                      <span style={{ color: "var(--color-text-faint)" }}>affiché : </span>
                      {result.output.trimEnd()}
                    </div>
                  )}
                </div>

                {/* Expected / actual value */}
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: LAB_MONO_SIZE,
                    textAlign: "right",
                    overflowWrap: "anywhere",
                  }}
                >
                  {result.passed ? (
                    <span style={{ color: "var(--cosmetic-accent)" }}>{result.actual}</span>
                  ) : (
                    <span>
                      <span style={{ color: "var(--color-text-faint)" }}>attendu : </span>
                      <span style={{ color: "var(--color-text-muted)" }}>{result.expected}</span>
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
                fontSize: LAB_LABEL_SIZE,
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
