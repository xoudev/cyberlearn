"use client";

import { ACCENT, MONO, RED } from "@cyberlearn/ui";
import React, { useState } from "react";
import {
  defaultKey,
  type Direction,
  directionLabels,
  hasDirections,
  isAnswer,
  keyLabel,
  runTool,
  TOOL_NAMES,
  TOOL_NOTES,
} from "@cyberlearn/lib/crypto/workshop";
import { type CryptoTool, parseCryptoWorkshop } from "@cyberlearn/types";

/**
 * <CryptoWorkshop>: a bench with one tool open at a time (Base64, hexadecimal,
 * Caesar, Vigenère, XOR, SHA-256), a direction, a key when the tool takes one,
 * and the text to transform, answered as it is typed. With a challenge, a
 * message to decipher: the learner works it out with the tools and proposes
 * the clear text. Client-side because it answers keystrokes; nothing is sent
 * anywhere.
 */

const field: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid var(--color-border-default)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-text-primary)",
  fontFamily: MONO,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const chip = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  border: `1px solid ${active ? ACCENT : "var(--color-border-default)"}`,
  background: active ? ACCENT : "transparent",
  color: active ? "var(--color-bg-base)" : "var(--color-text-secondary)",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
});

const small: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid var(--color-border-default)",
  background: "transparent",
  color: "var(--color-text-secondary)",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
};

export function CryptoWorkshop(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseCryptoWorkshop(props);
  const [chosenTool, setChosenTool] = useState<CryptoTool | null>(null);
  const [direction, setDirection] = useState<Direction>("encode");
  const [keys, setKeys] = useState<Partial<Record<CryptoTool, string>>>({});
  const [typed, setTyped] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{
          margin: "24px 0",
          padding: "14px 16px",
          border: `1px solid ${RED}`,
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        Exercice « Atelier crypto » indisponible : {parsed.problem}
      </div>
    );
  }
  const workshop = parsed.value;
  const tool = chosenTool ?? workshop.tools[0] ?? "base64";
  const key = keys[tool] ?? defaultKey(tool);
  const input = typed ?? workshop.input ?? "";
  const twoWays = hasDirections(tool);
  const result = runTool({ tool, direction: twoWays ? direction : "encode", input, key });
  const labels = directionLabels(tool);
  const keyName = keyLabel(tool);
  const challenge = workshop.challenge;

  const takeOutput = (): void => {
    if (!result.ok) return;
    setTyped(result.output);
    if (twoWays) setDirection(direction === "encode" ? "decode" : "encode");
  };

  const propose = (text: string): void => {
    if (challenge === undefined || solved) return;
    if (isAnswer(challenge.answer, text)) {
      setSolved(true);
    } else {
      setAttempts((n) => n + 1);
    }
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Atelier crypto${workshop.title ? ` : ${workshop.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${ACCENT}`,
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
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          ATELIER CRYPTO
        </span>
        {workshop.title ? (
          <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: 15 }}>
            {workshop.title}
          </span>
        ) : null}
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        {workshop.task ? (
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
            {workshop.task}
          </p>
        ) : null}

        {workshop.tools.length > 1 ? (
          <div
            role="group"
            aria-label="Outils"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {workshop.tools.map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-pressed={candidate === tool}
                onClick={() => {
                  setChosenTool(candidate);
                }}
                style={chip(candidate === tool)}
              >
                {TOOL_NAMES[candidate]}
              </button>
            ))}
          </div>
        ) : null}
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
          <strong style={{ color: "var(--color-text-secondary)" }}>{TOOL_NAMES[tool]}.</strong>{" "}
          {TOOL_NOTES[tool]}
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {twoWays ? (
            <div role="group" aria-label="Sens" style={{ display: "flex", gap: 6 }}>
              {(["encode", "decode"] as const).map((way) => (
                <button
                  key={way}
                  type="button"
                  aria-pressed={direction === way}
                  onClick={() => {
                    setDirection(way);
                  }}
                  style={chip(direction === way)}
                >
                  {labels[way]}
                </button>
              ))}
            </div>
          ) : null}
          {keyName !== null ? (
            <label style={{ display: "flex", gap: 8, alignItems: "center", flex: "1 1 220px" }}>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {keyName}
              </span>
              <input
                value={key}
                onChange={(event) => {
                  setKeys({ ...keys, [tool]: event.target.value });
                }}
                aria-label={keyName}
                spellCheck={false}
                autoComplete="off"
                style={{ ...field, width: "auto", flex: 1 }}
              />
            </label>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <textarea
            value={input}
            onChange={(event) => {
              setTyped(event.target.value);
            }}
            aria-label="Entrée"
            rows={3}
            spellCheck={false}
            style={{ ...field, resize: "vertical" }}
          />
          {result.ok ? (
            <pre
              aria-label="Sortie"
              tabIndex={0}
              style={{
                ...field,
                margin: 0,
                minHeight: 44,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                color: ACCENT,
              }}
            >
              {result.output === "" ? " " : result.output}
            </pre>
          ) : (
            <p style={{ margin: 0, color: RED, fontSize: 14 }}>{result.problem}</p>
          )}
          <button
            type="button"
            onClick={takeOutput}
            disabled={!result.ok || result.output === ""}
            style={{ ...small, justifySelf: "start" }}
          >
            {twoWays
              ? "Reprendre la sortie comme entrée, dans l'autre sens"
              : "Reprendre la sortie comme entrée"}
          </button>
        </div>

        {challenge !== undefined ? (
          <div
            style={{
              borderTop: "1px solid var(--color-border-subtle)",
              paddingTop: 10,
              display: "grid",
              gap: 8,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--color-text-muted)" }}>
              MESSAGE À DÉCHIFFRER
            </span>
            <pre
              style={{
                ...field,
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                color: "var(--color-text-primary)",
              }}
            >
              {challenge.ciphertext}
            </pre>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setTyped(challenge.ciphertext);
                  if (twoWays) setDirection("decode");
                }}
                style={small}
              >
                Mettre dans l&apos;entrée
              </button>
              <button
                type="button"
                onClick={() => {
                  if (result.ok) setAnswer(result.output);
                }}
                disabled={!result.ok || result.output === ""}
                style={small}
              >
                Utiliser la sortie comme réponse
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                propose(answer);
              }}
              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
            >
              <input
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                }}
                readOnly={solved}
                aria-label="Ta réponse en clair"
                placeholder="Le message, en clair"
                spellCheck={false}
                autoComplete="off"
                style={{ ...field, flex: "1 1 220px", width: "auto" }}
              />
              <button
                type="submit"
                disabled={solved || answer.trim() === ""}
                style={{ ...small, border: `1px solid ${ACCENT}`, color: ACCENT }}
              >
                Vérifier
              </button>
            </form>
            <div aria-live="polite">
              {solved ? (
                <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
                  ✓ Déchiffré : c&apos;est bien le message.
                </p>
              ) : attempts > 0 ? (
                <p style={{ margin: 0, color: RED, fontSize: 14 }}>
                  Non, ce n&apos;est pas encore ça.
                  {challenge.hint ? (
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {" "}
                      Indice : {challenge.hint}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
