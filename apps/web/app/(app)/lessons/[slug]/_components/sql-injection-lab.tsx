"use client";

import { ACCENT, RED } from "@cyberlearn/ui";
import React, { useEffect, useRef, useState } from "react";
import { parameterise, parseSqlInjectionLab, pasteFields } from "@cyberlearn/types";
import { lastResult, SqlSandbox, type SqlOutcome, type WorkerLike } from "@/lib/sql/sandbox";
import { SqlResultTable } from "./sql-result-table";

/**
 * <SqlInjectionLab>: a login form whose server code is shown, run against a
 * real SQLite in the learner's browser. In the vulnerable version the fields
 * are pasted into the query, so an apostrophe changes what the query says;
 * in the fixed version the same values go apart, as parameters, and the same
 * input is just a strange password. The query sent is always shown: seeing it
 * change is the lesson.
 */

type Mode = "vulnerable" | "fixed";

interface Attempt {
  mode: Mode;
  sql: string;
  params: string[];
  outcome: SqlOutcome;
}

/** Who the first row signs in as: its first text cell. */
function signedInAs(values: (string | number | null)[] | undefined): string {
  const text = values?.find((v) => typeof v === "string");
  return typeof text === "string" ? text : "un compte";
}

export function SqlInjectionLab(
  props: Record<string, unknown> & { createWorker?: () => WorkerLike },
): React.ReactElement {
  const { createWorker, ...raw } = props;
  const parsed = parseSqlInjectionLab(raw);
  const [mode, setMode] = useState<Mode>("vulnerable");
  const [values, setValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [tries, setTries] = useState(0);
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
        Laboratoire d&apos;injection SQL indisponible : {parsed.problem}
      </div>
    );
  }
  const lab = parsed.value;

  const submit = async (event: React.SyntheticEvent): Promise<void> => {
    event.preventDefault();
    if (running) return;
    sandbox.current ??= new SqlSandbox(lab.schema, createWorker);
    const built =
      mode === "vulnerable"
        ? { sql: pasteFields(lab.query, values), params: [] }
        : parameterise(lab.query, values);
    setRunning(true);
    const outcome = await sandbox.current.exec(built.sql, built.params);
    setRunning(false);
    setAttempt({ mode, ...built, outcome });
    setTries((t) => t + 1);
  };

  const result = attempt?.outcome.ok === true ? lastResult(attempt.outcome.results) : null;
  const rows = result?.values ?? [];
  const columnIndex = lab.success ? (result?.columns.indexOf(lab.success.column) ?? -1) : -1;
  // The login signs in as the first row, as the server would: an OR 1=1 that
  // brings the admin back third still opens the first account, not the admin's.
  const firstRow = rows[0];
  const goalReached =
    firstRow !== undefined &&
    (lab.success === undefined ||
      (columnIndex >= 0 && String(firstRow[columnIndex]) === String(lab.success.equals)));

  return (
    <section
      className="card card--sunken"
      aria-label={`Laboratoire d'injection SQL${lab.title ? ` : ${lab.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${RED}`,
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border-subtle)",
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
            color: RED,
          }}
        >
          INJECTION SQL · BASE RÉELLE
        </span>
        {lab.title ? (
          <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: 15 }}>
            {lab.title}
          </span>
        ) : null}
      </header>

      <div style={{ padding: "12px 16px", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>{lab.goal}</p>

        <div
          role="radiogroup"
          aria-label="Code du serveur"
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          {(
            [
              ["vulnerable", "Code vulnérable"],
              ["fixed", "Code corrigé"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => {
                setMode(value);
                setAttempt(null);
              }}
              style={{
                padding: "6px 12px",
                border: `1px solid ${mode === value ? (value === "vulnerable" ? RED : ACCENT) : "var(--color-border-default)"}`,
                background: "transparent",
                color: mode === value ? "var(--color-text-primary)" : "var(--color-text-muted)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <pre
          style={{
            margin: 0,
            padding: "10px 12px",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-subtle)",
            color: "var(--color-text-secondary)",
            fontSize: 12.5,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {mode === "vulnerable"
            ? `// le serveur colle les champs dans la requête\nrequete = "${lab.query}"`
            : `// le serveur passe les champs à part\nrequete = "${parameterise(lab.query, {}).sql}"\nparametres = [${lab.fields.map((f) => f.name).join(", ")}]`}
        </pre>

        <form onSubmit={(e) => void submit(e)} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          {lab.fields.map((field) => (
            <label
              key={field.name}
              style={{
                display: "grid",
                gap: 4,
                color: "var(--color-text-secondary)",
                fontSize: 13,
              }}
            >
              {field.label}
              <input
                type={field.secret ? "password" : "text"}
                value={values[field.name] ?? ""}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setValues({ ...values, [field.name]: e.target.value });
                }}
                style={{
                  padding: "8px 10px",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 13,
                }}
              />
            </label>
          ))}
          <button
            className="btn btn--accent btn--sm"
            type="submit"
            disabled={running}
            style={{
              justifySelf: "start",
            }}
          >
            {running ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
          {attempt !== null ? (
            <>
              <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 12 }}>
                Requête reçue par la base :
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: "8px 12px",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-subtle)",
                  color: "#D8D6EA",
                  fontSize: 12.5,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {attempt.sql}
                {attempt.params.length > 0
                  ? `\n-- paramètres : ${JSON.stringify(attempt.params)}`
                  : ""}
              </pre>
            </>
          ) : null}
          {attempt?.outcome.ok === false ? (
            <p
              style={{
                margin: 0,
                color: RED,
                fontSize: 14,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {attempt.outcome.timedOut
                ? attempt.outcome.error
                : `Erreur SQLite : ${attempt.outcome.error}`}
            </p>
          ) : null}
          {attempt?.outcome.ok === true && rows.length === 0 ? (
            <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
              Identifiants refusés : la requête ne renvoie aucun compte.
              {attempt.mode === "fixed"
                ? " Les valeurs sont passées à part : une apostrophe n'y est qu'un caractère de plus."
                : ""}
            </p>
          ) : null}
          {result !== null && rows.length > 0 ? (
            <>
              <p
                style={{
                  margin: 0,
                  color: goalReached ? ACCENT : "var(--color-text-secondary)",
                  fontSize: 14,
                }}
              >
                {goalReached
                  ? `✓ Connecté en tant que ${signedInAs(rows[0])}${attempt?.mode === "vulnerable" ? " : l'injection a marché." : "."}`
                  : `Connecté en tant que ${signedInAs(rows[0])}, mais ce n'est pas encore le compte visé.`}
              </p>
              <SqlResultTable result={result} />
            </>
          ) : null}
          {lab.hint && tries >= 3 && !goalReached ? (
            <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
              Indice : {lab.hint}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
