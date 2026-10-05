"use client";

import { ACCENT, AMBER, MONO, RED } from "@cyberlearn/ui";
import React, { useState } from "react";
import {
  asciiOf,
  hex2,
  identify,
  isFileAnswer,
  parseBytes,
  printableRuns,
  repairsMet,
} from "@cyberlearn/lib/files/hex";
import { parseHexEditor } from "@cyberlearn/types";

/**
 * <HexEditor>: the bytes of a small file in a grid, with the offsets, the
 * characters they spell, and the format their first bytes announce. A byte
 * can be rewritten to repair a header; the strings in the file are listed so
 * that a hidden message can be found. Client-side because it answers clicks;
 * nothing is sent anywhere.
 */

const BYTES_PER_ROW = 16;

const field: React.CSSProperties = {
  padding: "6px 10px",
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

type Verdict = "right" | "wrong";

export function HexEditor(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseHexEditor(props);
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | undefined>>({});

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
        Exercice « Éditeur hexadécimal » indisponible : {parsed.problem}
      </div>
    );
  }
  const editor = parsed.value;
  const original = parseBytes(editor.bytes) ?? [];
  const bytes = original.map((b, i) => edits[i] ?? b);
  const kind = identify(bytes);
  const runs = printableRuns(bytes);
  const repairs = editor.repairs ?? [];
  const met = repairsMet(bytes, repairs);
  const questions = editor.questions ?? [];
  const done =
    (repairs.length > 0 || questions.length > 0) &&
    met.every(Boolean) &&
    questions.every((q) => verdicts[q.label] === "right");
  const edited = Object.keys(edits).length;

  const select = (offset: number): void => {
    setSelected(offset);
    setDraft(hex2(bytes[offset] ?? 0));
  };

  const write = (): void => {
    if (selected === null || !editor.editable) return;
    const value = parseBytes(draft);
    if (value?.length !== 1) return;
    const byte = value[0] ?? 0;
    // The edits minus this byte, then this byte again if it differs from the original.
    const next: Record<number, number> = {};
    for (const [key, kept] of Object.entries(edits)) {
      if (Number(key) !== selected) next[Number(key)] = kept;
    }
    if (byte !== original[selected]) next[selected] = byte;
    setEdits(next);
  };

  const rows: number[] = [];
  for (let at = 0; at < bytes.length; at += BYTES_PER_ROW) rows.push(at);

  const check = (label: string, expected: string | string[]): void => {
    setVerdicts({
      ...verdicts,
      [label]: isFileAnswer(expected, answers[label] ?? "") ? "right" : "wrong",
    });
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Éditeur hexadécimal${editor.title ? ` : ${editor.title}` : ""}`}
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
          ÉDITEUR HEXADÉCIMAL
        </span>
        {editor.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{editor.title}</span>
        ) : null}
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: "#7F7BA9" }}>
          {editor.filename ? `${editor.filename} · ` : ""}
          {String(bytes.length)} octets
        </span>
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{editor.task}</p>

        <p aria-live="polite" style={{ margin: 0, fontSize: 14, color: "#B8B5D1" }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>TYPE RÉEL </span>
          {kind === null ? (
            <span style={{ color: AMBER }}>aucune signature connue à l&apos;octet 0</span>
          ) : (
            <>
              <strong style={{ color: ACCENT }}>{kind.name}</strong>
              <span style={{ fontFamily: MONO, fontSize: 12 }}>
                {" "}
                ({kind.magic.map(hex2).join(" ")})
              </span>
              . {kind.note}
            </>
          )}
        </p>

        <div
          className="card card--sunken"
          role="grid"
          aria-label="Octets du fichier"
          style={{ overflowX: "auto" }}
        >
          <div style={{ display: "grid", gap: 2, padding: "8px 10px", minWidth: "max-content" }}>
            {rows.map((at) => (
              <div
                key={at}
                role="row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: MONO,
                  fontSize: 13,
                }}
              >
                <span aria-hidden="true" style={{ color: "#3F3D5C", width: 64 }}>
                  {at.toString(16).padStart(8, "0")}
                </span>
                <span role="presentation" style={{ display: "flex", gap: 3 }}>
                  {bytes.slice(at, at + BYTES_PER_ROW).map((byte, k) => {
                    const offset = at + k;
                    const changed = edits[offset] !== undefined;
                    const isSelected = selected === offset;
                    return (
                      <button
                        key={offset}
                        type="button"
                        role="gridcell"
                        onClick={() => {
                          select(offset);
                        }}
                        aria-label={`Octet ${String(offset)} : ${hex2(byte)}${changed ? ", modifié" : ""}`}
                        aria-pressed={isSelected}
                        style={{
                          width: 26,
                          padding: "2px 0",
                          border: `1px solid ${isSelected ? ACCENT : changed ? AMBER : "transparent"}`,
                          background: isSelected
                            ? "color-mix(in srgb, var(--cosmetic-accent, #0AFFD4) 25%, transparent)"
                            : "transparent",
                          color: changed ? AMBER : "#B8B5D1",
                          fontFamily: MONO,
                          fontSize: 13,
                          cursor: "pointer",
                          marginRight: k === 7 ? 8 : 0,
                        }}
                      >
                        {hex2(byte)}
                      </button>
                    );
                  })}
                </span>
                <span aria-hidden="true" style={{ color: "#7F7BA9", whiteSpace: "pre" }}>
                  {bytes
                    .slice(at, at + BYTES_PER_ROW)
                    .map((b) => asciiOf(b))
                    .join("")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {editor.editable ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              write();
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <span style={{ fontFamily: MONO, fontSize: 12, color: "#B8B5D1" }}>
              {selected === null
                ? "Clique sur un octet pour le modifier."
                : `Octet ${String(selected)} : ${hex2(original[selected] ?? 0)} à l'origine`}
            </span>
            {selected !== null ? (
              <>
                <input
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                  }}
                  aria-label="Nouvelle valeur (hexadécimal)"
                  maxLength={2}
                  spellCheck={false}
                  autoComplete="off"
                  style={{ ...field, width: 56 }}
                />
                <button
                  type="submit"
                  disabled={(parseBytes(draft) ?? []).length !== 1}
                  style={{ ...small, border: `1px solid ${ACCENT}`, color: ACCENT }}
                >
                  Écrire
                </button>
              </>
            ) : null}
            {edited > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setEdits({});
                  if (selected !== null) setDraft(hex2(original[selected] ?? 0));
                }}
                style={{ ...small, marginLeft: "auto" }}
              >
                Rétablir l&apos;original ({String(edited)} octet{edited > 1 ? "s" : ""} modifié
                {edited > 1 ? "s" : ""})
              </button>
            ) : null}
          </form>
        ) : null}

        {runs.length > 0 ? (
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
              TEXTE LISIBLE DANS LES OCTETS
            </span>
            <ul
              aria-label="Chaînes lisibles"
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              {runs.map((run) => (
                <li key={run.offset}>
                  <button
                    type="button"
                    onClick={() => {
                      select(run.offset);
                    }}
                    aria-label={`Octet ${String(run.offset)} : ${run.text}`}
                    style={small}
                  >
                    <span style={{ color: "#7F7BA9" }}>
                      {run.offset.toString(16).padStart(4, "0")}{" "}
                    </span>
                    {run.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {repairs.length > 0 ? (
          <ul
            aria-label="Réparations"
            style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}
          >
            {repairs.map((repair, i) => (
              <li
                key={repair.label}
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  color: met[i] === true ? ACCENT : "#B8B5D1",
                }}
              >
                {met[i] === true ? "✓" : "○"} {repair.label}
                <span style={{ color: "#7F7BA9" }}> (octet {String(repair.offset)})</span>
              </li>
            ))}
          </ul>
        ) : null}

        {questions.length > 0 ? (
          <div style={{ borderTop: "1px solid #1F1B47", paddingTop: 10, display: "grid", gap: 10 }}>
            {questions.map((question) => {
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
                      {question.hint ? (
                        <span style={{ color: "#B8B5D1" }}> Indice : {question.hint}</span>
                      ) : null}
                    </p>
                  ) : null}
                </form>
              );
            })}
          </div>
        ) : null}

        <div aria-live="polite">
          {done ? (
            <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
              ✓ Exercice complété : le fichier dit ce qu&apos;il devait dire.
            </p>
          ) : null}
        </div>

        {editor.hints && editor.hints.length > 0 ? (
          <details style={{ borderTop: "1px solid #1F1B47", paddingTop: 10 }}>
            <summary
              style={{ cursor: "pointer", fontFamily: MONO, fontSize: 12, color: "#B8B5D1" }}
            >
              Indices ({String(editor.hints.length)})
            </summary>
            <ol
              style={{
                margin: "8px 0 0",
                paddingLeft: 20,
                color: "#B8B5D1",
                fontSize: 14,
                display: "grid",
                gap: 4,
              }}
            >
              {editor.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </section>
  );
}
