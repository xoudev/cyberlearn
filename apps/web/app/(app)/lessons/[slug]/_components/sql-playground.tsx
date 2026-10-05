"use client";

import React, { useEffect, useRef, useState } from "react";
import { parseSqlPlayground } from "@cyberlearn/types";
import {
  lastResult,
  resultMatches,
  SqlSandbox,
  type SqlOutcome,
  type WorkerLike,
} from "@/lib/sql/sandbox";
import { SqlResultTable, tablesOf } from "./sql-result-table";

/**
 * <SqlPlayground>: a real SQLite (sql.js, in a Web Worker) built from the
 * exercise's schema, an editor, and the results. With `expected`, the last
 * result is checked against it. Client-side because the database lives in the
 * learner's browser; nothing is sent anywhere. SQLite starts on the first run,
 * not when the page opens: 0.7 MB nobody needs before then.
 */

const RED = "#FF4757";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";

export function SqlPlayground(
  props: Record<string, unknown> & { createWorker?: () => WorkerLike },
): React.ReactElement {
  const { createWorker, ...raw } = props;
  const parsed = parseSqlPlayground(raw);
  const schema = parsed.ok ? parsed.value.schema : "";
  const [query, setQuery] = useState(parsed.ok ? (parsed.value.starterQuery ?? "") : "");
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<SqlOutcome | null>(null);
  const [misses, setMisses] = useState(0);
  const sandbox = useRef<SqlSandbox | null>(null);

  useEffect(
    () => () => {
      sandbox.current?.reset();
    },
    [],
  );

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{ margin: "24px 0", padding: "14px 16px", border: `1px solid ${RED}` }}
      >
        Exercice SQL indisponible : {parsed.problem}
      </div>
    );
  }
  const exercise = parsed.value;

  const run = async (): Promise<void> => {
    if (query.trim() === "" || running) return;
    sandbox.current ??= new SqlSandbox(schema, createWorker);
    setRunning(true);
    const result = await sandbox.current.exec(query);
    setRunning(false);
    setOutcome(result);
    if (
      exercise.expected &&
      !(result.ok && resultMatches(lastResult(result.results), exercise.expected).ok)
    ) {
      setMisses((m) => m + 1);
    }
  };

  const check =
    exercise.expected && outcome?.ok === true
      ? resultMatches(lastResult(outcome.results), exercise.expected)
      : null;
  const last = outcome?.ok === true ? lastResult(outcome.results) : null;

  return (
    <section
      className="card card--sunken"
      aria-label={`Exercice SQL${exercise.title ? ` : ${exercise.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${ACCENT}`,
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1F1B47",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: ACCENT,
          }}
        >
          SQL · BASE RÉELLE
        </span>
        {exercise.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{exercise.title}</span>
        ) : null}
      </header>

      <div style={{ padding: "12px 16px", display: "grid", gap: 10 }}>
        {exercise.task ? (
          <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{exercise.task}</p>
        ) : null}
        <p
          style={{
            margin: 0,
            color: "#7F7BA9",
            fontSize: 12.5,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {tablesOf(schema)
            .map((t) => `${t.name}(${t.columns.join(", ")})`)
            .join("  ·  ")}
        </p>
        <textarea
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void run();
            }
          }}
          rows={Math.min(10, Math.max(3, query.split("\n").length + 1))}
          spellCheck={false}
          aria-label="Ta requête SQL"
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#0A0826",
            border: "1px solid #2A2560",
            color: "#D8D6EA",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 13,
            lineHeight: 1.6,
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || query.trim() === ""}
            style={primaryButton}
          >
            {running ? "Exécution…" : "Exécuter"}
          </button>
          <button
            type="button"
            onClick={() => {
              sandbox.current?.reset();
              setOutcome(null);
            }}
            style={smallButton}
          >
            Réinitialiser la base
          </button>
          <span style={{ fontSize: 12, color: "#5A5680" }}>Ctrl + Entrée pour exécuter</span>
        </div>

        <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
          {outcome?.ok === false ? (
            <p
              style={{
                margin: 0,
                color: RED,
                fontSize: 14,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {outcome.timedOut ? outcome.error : `Erreur SQLite : ${outcome.error}`}
            </p>
          ) : null}
          {outcome?.ok === true && last === null ? (
            <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>
              Requête exécutée, aucune ligne renvoyée.
            </p>
          ) : null}
          {last !== null ? <SqlResultTable result={last} /> : null}
          {check !== null ? (
            check.ok ? (
              <p style={{ margin: 0, color: ACCENT, fontSize: 14 }}>
                ✓ C&apos;est la bonne réponse.
              </p>
            ) : (
              <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>
                Pas encore : {check.reason}
              </p>
            )
          ) : null}
          {exercise.hint && misses >= 2 && !(check?.ok ?? false) ? (
            <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>Indice : {exercise.hint}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const primaryButton: React.CSSProperties = {
  padding: "8px 16px",
  border: "none",
  background: "var(--cosmetic-accent, #0AFFD4)",
  color: "#030219",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  padding: "7px 12px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
  cursor: "pointer",
};
