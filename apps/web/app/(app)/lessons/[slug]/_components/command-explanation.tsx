"use client";

import React from "react";
import { explainLine, PART_KIND_LABELS, type PartKind } from "@cyberlearn/lib/terminal/explain";

/**
 * A command line explained word by word (@cyberlearn/lib/terminal/explain):
 * what the terminals show when the learner clicks a step of the exercise, or
 * one of the lines they typed. Client-side because its parents are.
 */

const MONO = "var(--font-mono, monospace)";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";

const KIND_COLOR: Record<PartKind, string> = {
  command: ACCENT,
  subcommand: ACCENT,
  option: "#F5F5FA",
  value: "#F5F5FA",
  operand: "#F5F5FA",
  operator: "#FF6B9D",
  assignment: "#FFB020",
  unknown: "#7F7BA9",
};

export function CommandExplanation({
  line,
  onClose,
}: {
  line: string;
  onClose?: () => void;
}): React.ReactElement {
  const { parts, commands } = explainLine(line);
  return (
    <section
      aria-label={`Explication : ${line}`}
      style={{
        borderTop: "1px solid #1F1B47",
        padding: "14px 18px",
        background: "rgba(5,4,26,0.5)",
        display: "grid",
        gap: 10,
      }}
    >
      <header style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: ACCENT,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {"// "} Explication
        </span>
        <code
          style={{ fontFamily: MONO, fontSize: 12, color: "#F5F5FA", overflowWrap: "anywhere" }}
        >
          {line}
        </code>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: "auto" }}
          >
            Fermer
          </button>
        ) : null}
      </header>

      {parts.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#B8B5D1" }}>
          Rien à expliquer : la ligne est vide.
        </p>
      ) : null}

      {commands.length > 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#B8B5D1", lineHeight: 1.55 }}>
          {commands.map((command, k) => (
            <React.Fragment key={k}>
              {k > 0 ? " · " : ""}
              <strong style={{ fontFamily: MONO, color: command.known ? ACCENT : "#7F7BA9" }}>
                {command.name}
              </strong>
              {" : "}
              {command.summary}
            </React.Fragment>
          ))}
        </p>
      ) : null}

      {parts.length > 0 ? (
        <ul
          aria-label="Mot par mot"
          style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}
        >
          {parts.map((part, k) => (
            <li
              key={k}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(80px, max-content) 1fr",
                gap: "2px 14px",
                alignItems: "baseline",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <span style={{ display: "grid", gap: 1 }}>
                <code
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: KIND_COLOR[part.kind],
                    overflowWrap: "anywhere",
                  }}
                >
                  {part.text}
                </code>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#7F7BA9",
                  }}
                >
                  {PART_KIND_LABELS[part.kind]}
                </span>
              </span>
              <span style={{ color: "#B8B5D1" }}>{part.role}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
