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

const TOKEN_STYLE: Record<TokenType, React.CSSProperties> = {
  keyword: { color: "#4D8BFF", fontWeight: 600 },
  builtin: { color: "#B14DFF" },
  string: { color: "#0AFFD4" },
  comment: { color: "#6B6890", fontStyle: "italic" },
  number: { color: "#FFB020" },
  decorator: { color: "#FF4D6D" },
  operator: { color: "#8B88B8" },
  text: {},
};

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
    (_prev: { correct: boolean; error?: string }, formData: FormData) =>
      submitFlagAction(challengeId, (formData.get("flag") as string | null) ?? ""),
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

  // Status dot color
  const dotColor = isLoading ? "#FFB020" : isRunning ? "#4D8BFF" : "#0AFFD4";

  const highlighted = useMemo(() => tokenizePython(code), [code]);

  return (
    <div
      id="challenge-action"
      style={{
        border: "1px solid #1F1B47",
        background: "#0A0826",
        position: "relative",
        overflow: "hidden",
        marginTop: 4,
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
          background: "rgba(5,4,26,0.7)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#B8B5D1",
            fontWeight: 600,
          }}
        >
          {/* Pulsing dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}b3`,
              display: "inline-block",
              // SAFETY: inline animation keyword accepted by browsers
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          Python Sandbox
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "#0AFFD4",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
            padding: "4px 8px",
            border: "1px solid rgba(10,255,212,0.35)",
            background: "rgba(10,255,212,0.05)",
          }}
        >
          Pyodide · WASM
        </span>
      </div>

      {/* Code editor with line numbers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 1fr",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 1.7,
          background: "#0A0826",
          overflowX: "auto",
          minHeight: 160,
        }}
      >
        {/* Gutter */}
        <div
          style={{
            background: "rgba(5,4,26,0.6)",
            borderRight: "1px solid #1F1B47",
            padding: "16px 0",
            textAlign: "right",
            userSelect: "none",
            color: "#3F3D5C",
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
          {/* Syntax-highlighted mirror — aria-hidden, pointer-events none */}
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
              color: "#F5F5FA",
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

          {/* Transparent textarea — captures input, shows caret */}
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
              caretColor: "#F5F5FA",
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
                // capture before rAF — React nullifies currentTarget after handler returns
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
          borderTop: "1px solid #1F1B47",
          background: "rgba(5,4,26,0.7)",
        }}
      >
        {/* Run button */}
        <button
          type="button"
          disabled={!canRun}
          onClick={handleRun}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "0 22px",
            minHeight: 46,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: canRun ? "#0024FF" : "#1A1840",
            color: canRun ? "#fff" : "#3F3D5C",
            border: "none",
            borderRight: "1px solid rgba(0,36,255,0.4)",
            cursor: canRun ? "pointer" : "not-allowed",
            transition: "background 200ms ease",
            boxShadow: canRun ? "inset 0 0 0 1px rgba(255,255,255,0.15)" : "none",
          }}
        >
          <span style={{ fontSize: 9 }}>▶</span>
          {isRunning ? "EXÉCUTION..." : "EXÉCUTER"}
        </button>

        {/* Status */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: dotColor,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "currentColor",
              boxShadow: "0 0 6px currentColor",
              flexShrink: 0,
            }}
          />
          <span>{isLoading ? "Chargement..." : isRunning ? "Exécution..." : "Prêt"}</span>
          <span
            style={{
              color: "#3F3D5C",
              marginLeft: "auto",
              letterSpacing: "0.1em",
              fontWeight: 500,
            }}
          >
            solution.py · {String(lineCount)} ligne{lineCount > 1 ? "s" : ""} · python 3.11
          </span>
        </div>
      </div>

      {/* Output area */}
      <div
        style={{
          borderTop: "1px solid #1F1B47",
          background: "#030219",
          padding: "14px 18px",
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
          lineHeight: 1.7,
          color: "#F5F5FA",
          minHeight: 70,
        }}
      >
        {outputLines.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              color: line.kind === "good" ? "#0AFFD4" : line.kind === "err" ? "#FF4D6D" : "#B8B5D1",
            }}
          >
            <span style={{ color: "#0AFFD4", flexShrink: 0 }}>{">>>"}</span>
            <span>{line.text}</span>
          </div>
        ))}
      </div>

      {/* Flag row — conditionally rendered */}
      {isCompleted ? (
        <div
          style={{
            borderTop: "1px solid rgba(10,255,212,0.2)",
            background: "rgba(10,255,212,0.04)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            color: "#0AFFD4",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#0AFFD4",
              boxShadow: "0 0 6px rgba(10,255,212,0.6)",
              flexShrink: 0,
            }}
          />
          Challenge résolu — FLAG correct
        </div>
      ) : isLocked ? (
        <div
          style={{
            borderTop: "1px solid #1F1B47",
            background: "rgba(5,4,26,0.5)",
            padding: "16px 20px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Challenge verrouillé — complète les prérequis
        </div>
      ) : attemptsExhausted ? (
        <div
          style={{
            borderTop: "1px solid rgba(255,77,109,0.2)",
            background: "rgba(255,77,109,0.04)",
            padding: "16px 20px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#FF4D6D",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
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
            borderTop: "1px solid #1F1B47",
            background: "rgba(255,77,109,0.04)",
          }}
        >
          {/* Flag label */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0 18px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#FF4D6D",
              borderRight: "1px solid #1F1B47",
              background: "rgba(255,77,109,0.08)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 13 }}>⚑</span>
            FLAG
          </span>

          {/* Input */}
          <div style={{ display: "flex", flexDirection: "column" }}>
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
                color: "#F5F5FA",
                caretColor: "#FF4D6D",
                width: "100%",
              }}
            />
            {flagState.error !== undefined && (
              <span
                style={{
                  padding: "0 16px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#FF4D6D",
                  letterSpacing: "0.06em",
                }}
              >
                {flagState.error}
              </span>
            )}
          </div>

          {/* Validate button */}
          <button
            type="submit"
            disabled={flagPending}
            style={{
              padding: "0 22px",
              minHeight: 50,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: flagPending ? "#2A1520" : "#FF4D6D",
              color: "#fff",
              border: "none",
              borderLeft: "1px solid rgba(255,77,109,0.4)",
              cursor: flagPending ? "not-allowed" : "pointer",
              transition: "background 200ms ease",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
              whiteSpace: "nowrap",
            }}
          >
            {flagPending ? "..." : "Valider →"}
          </button>
        </form>
      )}
    </div>
  );
}
