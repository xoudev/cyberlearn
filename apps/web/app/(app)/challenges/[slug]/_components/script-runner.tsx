"use client";

// "use client" justified: Web Worker lifecycle, code editor state, Pyodide execution, flag submission

import React, { useState, useRef, useEffect, useCallback, useActionState, useMemo } from "react";
import { submitFlagAction } from "../../_actions/challenge-actions";
import type { DisplayStatus } from "../../_components/challenges-client";

interface Props {
  starterCode: string;
  challengeId: string;
  displayStatus: DisplayStatus;
  maxAttempts: number;
  userAttempts: number;
  /**
   * Where the flag goes, when not to the catalogue: a tournament counts its
   * own flags (app/(app)/tournaments), with no cap on attempts.
   */
  submitFlag?: (flag: string) => Promise<{ correct: boolean; error?: string }>;
  /** Said in place of the flag field when no flag can be given here now. */
  flagNotice?: string;
}

type RunnerState = "loading" | "ready" | "running" | "error";

interface OutputLine {
  kind: "info" | "good" | "err";
  text: string;
}

// ── Python tokenizer ──────────────────────────────────────────────────────────

type TokenType =
  | "keyword"
  | "builtin"
  | "string"
  | "comment"
  | "number"
  | "decorator"
  | "operator"
  | "text";

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const BUILTINS = new Set([
  "abs",
  "all",
  "any",
  "bin",
  "bool",
  "bytes",
  "callable",
  "chr",
  "dict",
  "dir",
  "divmod",
  "enumerate",
  "eval",
  "exec",
  "filter",
  "float",
  "format",
  "frozenset",
  "getattr",
  "globals",
  "hasattr",
  "hash",
  "help",
  "hex",
  "id",
  "input",
  "int",
  "isinstance",
  "issubclass",
  "iter",
  "len",
  "list",
  "locals",
  "map",
  "max",
  "min",
  "next",
  "object",
  "oct",
  "open",
  "ord",
  "pow",
  "print",
  "property",
  "range",
  "repr",
  "reversed",
  "round",
  "set",
  "setattr",
  "slice",
  "sorted",
  "staticmethod",
  "str",
  "sum",
  "super",
  "tuple",
  "type",
  "vars",
  "zip",
]);

// The editor's syntax colours are part of the code shown (docs/design §20),
// the same as the site's code blocks (globals.css, .hljs-*).
const TOKEN_STYLE: Record<TokenType, React.CSSProperties> = {
  keyword: { color: "var(--color-info)", fontWeight: 600 },
  builtin: { color: "#B14DFF" },
  string: { color: "var(--cosmetic-accent-hover)" },
  comment: { color: "#AAA79F", fontStyle: "italic" },
  number: { color: "var(--color-warning)" },
  decorator: { color: "var(--color-danger)" },
  operator: { color: "#C2BFB8" },
  text: {},
};

// The runner's chrome, Bastion: a panel, its bars on the panel, the code on
// carbon, square, no glow.
const PANEL = "#121418";
const SEPARATOR = "1px solid #303137";
const META = "#AAA79F";

/** A state's mark: a still square in the state's colour. */
function StateMark({ color }: { color: string }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-block", width: 8, height: 8, flexShrink: 0, background: color }}
    />
  );
}

function tokenizePython(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    const ch = code.charAt(i);

    // Triple-quoted strings
    if ((ch === '"' || ch === "'") && code.startsWith(ch.repeat(3), i)) {
      const q = ch.repeat(3);
      const end = code.indexOf(q, i + 3);
      const raw = end === -1 ? code.slice(i) : code.slice(i, end + 3);
      tokens.push({ type: "string", value: raw });
      i += raw.length;
      continue;
    }

    // Single-line strings
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < code.length && code.charAt(j) !== ch && code.charAt(j) !== "\n") {
        if (code.charAt(j) === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Comments
    if (ch === "#") {
      let j = i;
      while (j < code.length && code.charAt(j) !== "\n") j++;
      tokens.push({ type: "comment", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Decorators
    if (ch === "@") {
      let j = i + 1;
      while (j < code.length && /[a-zA-Z0-9_.]/.test(code.charAt(j))) j++;
      tokens.push({ type: "decorator", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Identifiers → keywords, builtins, plain names
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code.charAt(j))) j++;
      const word = code.slice(i, j);
      const type: TokenType = KEYWORDS.has(word)
        ? "keyword"
        : BUILTINS.has(word)
          ? "builtin"
          : "text";
      tokens.push({ type, value: word });
      i = j;
      continue;
    }

    // Numbers (int, float, hex, binary, octal)
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < code.length && /[0-9._xXbBoOeE]/.test(code.charAt(j))) j++;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Operators
    if (/[+\-*/%=<>!&|^~]/.test(ch)) {
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }

    tokens.push({ type: "text", value: ch });
    i++;
  }

  return tokens;
}

function setupWorkerHandlers(
  worker: Worker,
  onReady: () => void,
  onResult: (output: string, error: string | null) => void,
): void {
  worker.onmessage = (
    e: MessageEvent<{ type: string; output?: string; error?: string | null; id?: number }>,
  ) => {
    const { type, output, error } = e.data;
    if (type === "ready") {
      onReady();
      return;
    }
    if (type === "result") {
      onResult(output ?? "", error ?? null);
    }
  };
  worker.onerror = (e) => {
    onResult("", `Erreur du worker : ${e.message}`);
  };
}

export function ScriptRunner({
  starterCode,
  challengeId,
  displayStatus,
  maxAttempts,
  userAttempts,
  submitFlag,
  flagNotice,
}: Props): React.ReactElement {
  const [code, setCode] = useState(starterCode);
  const [outputLines, setOutputLines] = useState<OutputLine[]>([
    { kind: "info", text: "sandbox prête · pyodide · wasm" },
  ]);
  const [runnerState, setRunnerState] = useState<RunnerState>("loading");
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  const [flagState, flagAction, flagPending] = useActionState(
    (_prev: { correct: boolean; error?: string }, formData: FormData) => {
      const flag = (formData.get("flag") as string | null) ?? "";
      return submitFlag === undefined ? submitFlagAction(challengeId, flag) : submitFlag(flag);
    },
    { correct: false },
  );

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const spawnWorker = useCallback(() => {
    const worker = new Worker("/pyodide-worker.js");
    setupWorkerHandlers(
      worker,
      () => {
        setRunnerState("ready");
      },
      (out, err) => {
        clearPendingTimeout();
        setRunnerState("ready");
        if (err !== null) {
          const errLines: OutputLine[] = [
            { kind: "err", text: `⚠ Erreur Python :` },
            ...err
              .split("\n")
              .filter(Boolean)
              .map((l): OutputLine => ({ kind: "err", text: l })),
          ];
          if (out) {
            errLines.push({ kind: "info", text: "--- sortie avant erreur ---" });
            out
              .split("\n")
              .filter(Boolean)
              .forEach((l) => errLines.push({ kind: "info", text: l }));
          }
          setOutputLines(errLines);
        } else {
          const lines = out !== "" ? out.split("\n").filter(Boolean) : ["(aucune sortie)"];
          setOutputLines(lines.map((l): OutputLine => ({ kind: "good", text: l })));
        }
      },
    );
    workerRef.current = worker;
    return worker;
  }, [clearPendingTimeout]);

  useEffect(() => {
    spawnWorker();
    return () => {
      clearPendingTimeout();
      workerRef.current?.terminate();
    };
  }, [spawnWorker, clearPendingTimeout]);

  function handleRun(): void {
    if (runnerState !== "ready" || !workerRef.current) return;
    setRunnerState("running");
    setOutputLines([{ kind: "info", text: "Exécution du script..." }]);

    const id = ++runIdRef.current;
    workerRef.current.postMessage({ type: "run", code, id });

    timeoutRef.current = setTimeout(() => {
      workerRef.current?.terminate();
      const newWorker = spawnWorker();
      setRunnerState("loading");
      newWorker.postMessage({ type: "noop" });
      setOutputLines([{ kind: "err", text: "[Timeout] Exécution limitée à 10 secondes." }]);
    }, 10_000);
  }

  const isLoading = runnerState === "loading";
  const isRunning = runnerState === "running";
  const canRun = runnerState === "ready" && code.trim() !== "";
  const lineCount = code.split("\n").length;
  const attemptsLeft = Math.max(0, maxAttempts - userAttempts);
  const isCompleted = displayStatus === "COMPLETED" || flagState.correct;
  const isLocked = displayStatus === "LOCKED";
  const attemptsExhausted = attemptsLeft === 0 && userAttempts >= maxAttempts;

  // The sandbox's state: loading (warning), running (the accent), ready (success).
  const stateColor = isLoading
    ? "var(--color-state-warning)"
    : isRunning
      ? "var(--cosmetic-accent-hover)"
      : "var(--color-state-success)";

  const highlighted = useMemo(() => tokenizePython(code), [code]);

  return (
    <div
      className="challenge-runner"
      id="challenge-action"
      style={{
        position: "relative",
        overflow: "hidden",
        marginTop: 4,
        background: PANEL,
        border: SEPARATOR,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 16px",
          borderBottom: SEPARATOR,
          fontFamily: "var(--font-interface), sans-serif",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "#F4F2ED",
          }}
        >
          <StateMark color={stateColor} />
          Bac à sable Python
        </span>
        <span style={{ fontSize: 12, color: META }}>Pyodide · WASM</span>
      </div>

      {/* Code editor with line numbers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 1fr",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 1.7,
          background: "#0B0C0E",
          overflowX: "auto",
          minHeight: 160,
        }}
      >
        {/* Gutter */}
        <div
          style={{
            background: "#0D0E12",
            borderRight: SEPARATOR,
            padding: "16px 0",
            textAlign: "right",
            userSelect: "none",
            color: META,
            flexShrink: 0,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} style={{ paddingRight: 12, lineHeight: 1.7 }}>
              {String(i + 1).padStart(2, "0")}
            </div>
          ))}
        </div>

        {/* Editor: highlighted pre behind transparent textarea */}
        <div style={{ position: "relative" }}>
          {/* Syntax-highlighted mirror - aria-hidden, pointer-events none */}
          <pre
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              margin: 0,
              padding: "16px 18px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.7,
              background: "transparent",
              color: "#F4F2ED",
              whiteSpace: "pre",
              wordBreak: "normal",
              overflow: "hidden",
              tabSize: 4,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {highlighted.map((token, idx) =>
              token.type === "text" ? (
                token.value
              ) : (
                <span key={idx} style={TOKEN_STYLE[token.type]}>
                  {token.value}
                </span>
              ),
            )}
            {/* trailing newline keeps caret on last line aligned */}
            {"\n"}
          </pre>

          {/* Transparent textarea - captures input, shows caret */}
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
            }}
            spellCheck={false}
            rows={Math.max(8, lineCount)}
            disabled={isLocked}
            style={{
              position: "relative",
              zIndex: 1,
              display: "block",
              padding: "16px 18px",
              background: "transparent",
              border: "none",
              color: "transparent",
              caretColor: "#F4F2ED",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.7,
              outline: "none",
              resize: "none",
              boxSizing: "border-box",
              tabSize: 4,
              overflow: "hidden",
              whiteSpace: "pre",
              width: "100%",
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                // capture before rAF - React nullifies currentTarget after handler returns
                const target = e.currentTarget;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const next = `${code.substring(0, start)}    ${code.substring(end)}`;
                setCode(next);
                requestAnimationFrame(() => {
                  target.selectionStart = start + 4;
                  target.selectionEnd = start + 4;
                });
              }
            }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          flexWrap: "wrap",
          borderTop: SEPARATOR,
          fontFamily: "var(--font-interface), sans-serif",
        }}
      >
        {/* Run button */}
        <button
          className="btn"
          type="button"
          disabled={!canRun}
          onClick={handleRun}
          style={{ height: "auto", minHeight: 46 }}
        >
          <span style={{ fontSize: 10 }}>▶</span>
          {isRunning ? "Exécution…" : "Exécuter"}
        </button>

        {/* Status */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "4px 12px",
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: stateColor,
          }}
        >
          <StateMark color={stateColor} />
          <span>{isLoading ? "Chargement…" : isRunning ? "Exécution…" : "Prêt"}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 400, color: META }}>
            solution.py · {String(lineCount)} ligne{lineCount > 1 ? "s" : ""} · python 3.11
          </span>
        </div>
      </div>

      {/* Output area */}
      <div
        style={{
          borderTop: SEPARATOR,
          background: "#0B0C0E",
          padding: "14px 18px",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 1.7,
          color: "#F4F2ED",
          minHeight: 70,
        }}
      >
        {outputLines.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              color:
                line.kind === "good"
                  ? "#F4F2ED"
                  : line.kind === "err"
                    ? "var(--color-state-danger)"
                    : "#C2BFB8",
            }}
          >
            <span style={{ color: "var(--cosmetic-accent-hover)", flexShrink: 0 }}>{">>>"}</span>
            <span>{line.text}</span>
          </div>
        ))}
      </div>

      {/* Flag row - conditionally rendered */}
      {isCompleted ? (
        <div
          style={{
            borderTop: SEPARATOR,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-interface), sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: "#F4F2ED",
          }}
        >
          <StateMark color="var(--color-state-success)" />
          Défi résolu · flag correct
        </div>
      ) : flagNotice !== undefined ? (
        <div
          style={{
            borderTop: SEPARATOR,
            padding: "16px 20px",
            fontFamily: "var(--font-interface), sans-serif",
            fontSize: 13,
            color: META,
          }}
        >
          {flagNotice}
        </div>
      ) : isLocked ? (
        <div
          style={{
            borderTop: SEPARATOR,
            padding: "16px 20px",
            fontFamily: "var(--font-interface), sans-serif",
            fontSize: 13,
            color: META,
          }}
        >
          Défi verrouillé · complète les prérequis
        </div>
      ) : attemptsExhausted ? (
        <div
          style={{
            borderTop: SEPARATOR,
            padding: "16px 20px",
            fontFamily: "var(--font-interface), sans-serif",
            fontSize: 13,
            color: "var(--color-state-danger)",
          }}
        >
          Plus de tentatives disponibles
        </div>
      ) : (
        <form
          action={flagAction}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "stretch",
            borderTop: SEPARATOR,
            fontFamily: "var(--font-interface), sans-serif",
          }}
        >
          {/* Flag label */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0 18px",
              fontSize: 13,
              fontWeight: 600,
              color: "#C2BFB8",
              borderRight: SEPARATOR,
              whiteSpace: "nowrap",
            }}
          >
            Flag
          </span>

          {/* Input */}
          <div style={{ display: "flex", flexDirection: "column", background: "#0B0C0E" }}>
            <input
              name="flag"
              type="text"
              placeholder="FLAG{...}"
              autoComplete="off"
              spellCheck={false}
              required
              disabled={flagPending}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "14px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "#F4F2ED",
                caretColor: "#F4F2ED",
                width: "100%",
              }}
            />
            {flagState.error !== undefined && (
              <span
                style={{
                  padding: "0 16px 10px",
                  fontSize: 12,
                  color: "var(--color-state-danger)",
                }}
              >
                {flagState.error}
              </span>
            )}
          </div>

          {/* Validate button */}
          <button
            className="btn"
            type="submit"
            disabled={flagPending}
            style={{ height: "auto", minHeight: 50, whiteSpace: "nowrap" }}
          >
            {flagPending ? "…" : "Valider →"}
          </button>
        </form>
      )}
    </div>
  );
}
