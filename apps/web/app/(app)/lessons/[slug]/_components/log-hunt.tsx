"use client";

import React, { useState } from "react";
import {
  buildLog,
  clockOf,
  countBy,
  FIELD_NAMES,
  type FieldFilter,
  filterEvents,
  isLogAnswer,
  LOG_FIELDS,
  type LogField,
} from "@cyberlearn/lib/logs/hunt";
import { parseLogHunt } from "@cyberlearn/types";

/**
 * <LogHunt>: a table of normalized log events to filter and count until the
 * attack stands out, then questions whose answers are in the table. A click
 * on a value filters on it; "Compter par" gives the counts an analyst asks
 * for. Client-side because it answers clicks; nothing is sent anywhere.
 */

const RED = "#FF4757";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";
const MONO = "var(--font-mono, monospace)";
const ROWS_SHOWN = 100;
const COUNT_FIELDS: readonly LogField[] = ["ip", "user", "action", "source", "host"];

const field: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #2A2560",
  background: "#0A0826",
  color: "#F5F5FA",
  fontFamily: MONO,
  fontSize: 13,
};

const small: React.CSSProperties = {
  padding: "4px 10px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
};

const cellButton: React.CSSProperties = {
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
  textAlign: "left",
};

type Verdict = "right" | "wrong";

export function LogHunt(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseLogHunt(props);
  const [text, setText] = useState("");
  const [filters, setFilters] = useState<FieldFilter[]>([]);
  const [countField, setCountField] = useState<LogField | "">("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | undefined>>({});
  const [misses, setMisses] = useState<Record<string, number>>({});

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{
          margin: "24px 0",
          padding: "14px 16px",
          border: `1px solid ${RED}`,
          color: "#B8B5D1",
          fontSize: 14,
        }}
      >
        Exercice « Chasse dans les logs » indisponible : {parsed.problem}
      </div>
    );
  }
  const hunt = parsed.value;
  const log = buildLog(hunt);
  const shown = filterEvents(log, text, filters);
  const counts = countField === "" ? [] : countBy(shown, countField).slice(0, 10);
  const done = hunt.questions.every((q) => verdicts[q.label] === "right");

  const addFilter = (f: LogField, value: string): void => {
    if (filters.some((x) => x.field === f && x.value === value)) return;
    setFilters([...filters, { field: f, value }]);
  };

  const check = (label: string, expected: string | string[]): void => {
    if (isLogAnswer(expected, answers[label] ?? "")) {
      setVerdicts({ ...verdicts, [label]: "right" });
    } else {
      setVerdicts({ ...verdicts, [label]: "wrong" });
      setMisses({ ...misses, [label]: (misses[label] ?? 0) + 1 });
    }
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Chasse dans les logs${hunt.title ? ` : ${hunt.title}` : ""}`}
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
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          CHASSE DANS LES LOGS
        </span>
        {hunt.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{hunt.title}</span>
        ) : null}
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: "#7F7BA9" }}>
          {String(shown.length)} événements sur {String(log.length)}
        </span>
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{hunt.task}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            aria-label="Filtre texte"
            placeholder="Filtrer : une adresse, un compte, un mot de l'action"
            spellCheck={false}
            style={{ ...field, flex: "1 1 260px" }}
          />
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontFamily: MONO,
              fontSize: 11,
              color: "#7F7BA9",
            }}
          >
            COMPTER PAR
            <select
              value={countField}
              onChange={(event) => {
                const value = event.target.value;
                setCountField(LOG_FIELDS.includes(value as LogField) ? (value as LogField) : "");
              }}
              aria-label="Compter par"
              style={field}
            >
              <option value="">rien</option>
              {COUNT_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {FIELD_NAMES[f].toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filters.length > 0 ? (
          <div
            role="group"
            aria-label="Filtres actifs"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {filters.map((f) => (
              <button
                key={`${f.field}=${f.value}`}
                type="button"
                onClick={() => {
                  setFilters(filters.filter((x) => x !== f));
                }}
                aria-label={`Retirer le filtre ${FIELD_NAMES[f.field]} = ${f.value}`}
                style={{ ...small, border: `1px solid ${ACCENT}`, color: "#F5F5FA" }}
              >
                {FIELD_NAMES[f.field]} = {f.value} ×
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setFilters([]);
                setText("");
              }}
              style={small}
            >
              Tout effacer
            </button>
          </div>
        ) : null}

        {countField !== "" ? (
          <table
            aria-label={`Décompte par ${FIELD_NAMES[countField].toLowerCase()}`}
            style={{
              borderCollapse: "collapse",
              fontFamily: MONO,
              fontSize: 12,
              color: "#B8B5D1",
              alignSelf: "start",
            }}
          >
            <tbody>
              {counts.map(({ value, count }) => (
                <tr key={value}>
                  <td style={{ padding: "2px 12px 2px 0", textAlign: "right", color: ACCENT }}>
                    {String(count)}
                  </td>
                  <td style={{ padding: "2px 0" }}>
                    <button
                      type="button"
                      onClick={() => {
                        addFilter(countField, value);
                      }}
                      aria-label={`Filtrer : ${FIELD_NAMES[countField]} = ${value}`}
                      style={cellButton}
                    >
                      {value}
                    </button>
                  </td>
                </tr>
              ))}
              {counts.length === 0 ? (
                <tr>
                  <td style={{ color: "#7F7BA9" }}>aucune valeur</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        ) : null}

        <div className="card card--sunken" style={{ overflowX: "auto" }}>
          <table
            aria-label="Événements"
            style={{ borderCollapse: "collapse", width: "100%", fontFamily: MONO, fontSize: 12 }}
          >
            <thead>
              <tr>
                {LOG_FIELDS.map((f) => (
                  <th
                    key={f}
                    scope="col"
                    style={{
                      textAlign: "left",
                      padding: "6px 10px",
                      color: "#7F7BA9",
                      fontWeight: 400,
                      borderBottom: "1px solid #1F1B47",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {FIELD_NAMES[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, ROWS_SHOWN).map((event, i) => (
                <tr
                  key={`${event.time}-${String(i)}`}
                  style={{ borderBottom: "1px solid #110F33" }}
                >
                  <td
                    style={{ padding: "3px 10px", color: "#B8B5D1", whiteSpace: "nowrap" }}
                    title={event.time}
                  >
                    {clockOf(event.time)}
                  </td>
                  {(["source", "host", "ip", "user", "action"] as const).map((f) => {
                    const value = event[f];
                    return (
                      <td key={f} style={{ padding: "3px 10px", whiteSpace: "nowrap" }}>
                        {value === undefined ? (
                          <span style={{ color: "#3F3D5C" }}>·</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              addFilter(f, value);
                            }}
                            aria-label={`Filtrer : ${FIELD_NAMES[f]} = ${value}`}
                            style={cellButton}
                          >
                            {value}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length > ROWS_SHOWN ? (
            <p
              style={{
                margin: 0,
                padding: "6px 10px",
                fontFamily: MONO,
                fontSize: 12,
                color: "#7F7BA9",
              }}
            >
              … et {String(shown.length - ROWS_SHOWN)} autres lignes : affine le filtre, ou compte.
            </p>
          ) : null}
          {shown.length === 0 ? (
            <p
              style={{
                margin: 0,
                padding: "6px 10px",
                fontFamily: MONO,
                fontSize: 12,
                color: "#7F7BA9",
              }}
            >
              Aucun événement ne correspond.
            </p>
          ) : null}
        </div>

        <div style={{ borderTop: "1px solid #1F1B47", paddingTop: 10, display: "grid", gap: 10 }}>
          {hunt.questions.map((question) => {
            const verdict = verdicts[question.label];
            return (
              <form
                key={question.label}
                onSubmit={(event) => {
                  event.preventDefault();
                  check(question.label, question.answer);
                }}
                style={{ display: "grid", gap: 6 }}
              >
                <label style={{ color: "#F5F5FA", fontSize: 14 }}>
                  {verdict === "right" ? (
                    <span style={{ color: ACCENT, fontFamily: MONO }}>✓ </span>
                  ) : null}
                  {question.label}
                  <span style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <input
                      value={answers[question.label] ?? ""}
                      onChange={(event) => {
                        setAnswers({ ...answers, [question.label]: event.target.value });
                        if (verdict === "wrong")
                          setVerdicts({ ...verdicts, [question.label]: undefined });
                      }}
                      readOnly={verdict === "right"}
                      aria-label={question.label}
                      spellCheck={false}
                      autoComplete="off"
                      style={{ ...field, flex: "1 1 200px" }}
                    />
                    <button
                      type="submit"
                      disabled={
                        verdict === "right" || (answers[question.label] ?? "").trim() === ""
                      }
                      style={{ ...small, border: `1px solid ${ACCENT}`, color: ACCENT }}
                    >
                      Vérifier
                    </button>
                  </span>
                </label>
                {verdict === "wrong" ? (
                  <p style={{ margin: 0, color: RED, fontSize: 14 }}>
                    Non, ce n&apos;est pas ça.
                    {question.hint && (misses[question.label] ?? 0) >= 1 ? (
                      <span style={{ color: "#B8B5D1" }}> Indice : {question.hint}</span>
                    ) : null}
                  </p>
                ) : null}
              </form>
            );
          })}
          <div aria-live="polite">
            {done ? (
              <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
                ✓ Enquête bouclée : toutes les réponses sont justes.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
