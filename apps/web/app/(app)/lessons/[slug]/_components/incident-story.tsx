"use client";

import React, { useState } from "react";
import {
  debriefLine,
  ENDING_LABELS,
  endingsOf,
  paragraphsOf,
  play,
  recommendedPath,
  VERDICT_LABELS,
} from "@cyberlearn/lib/story/incident";
import { parseIncidentStory, type StoryEnding, type StoryVerdict } from "@cyberlearn/types";

/**
 * <IncidentStory>: an incident told scene by scene, decided by the learner.
 * The state is the list of picks, which @cyberlearn/lib/story/incident
 * replays: each decision taken stays on screen with its verdict and its
 * consequence, an ending brings the debrief, and a replay starts over with
 * the endings found so far still counted. Client-side because it answers
 * clicks; nothing is sent anywhere.
 */

const RED = "#FF4757";
const AMBER = "#FFB020";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";
const MONO = "var(--font-mono, monospace)";

const VERDICT_COLOR: Record<StoryVerdict, string> = { good: ACCENT, risky: AMBER, bad: RED };
const ENDING_COLOR: Record<StoryEnding, string> = { success: ACCENT, partial: AMBER, failure: RED };

const button: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#F5F5FA",
  textAlign: "left",
  fontSize: 14,
  lineHeight: 1.5,
  cursor: "pointer",
};

const small: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
};

const tag: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const prose: React.CSSProperties = { margin: 0, color: "#B8B5D1", fontSize: 14, lineHeight: 1.6 };

export function IncidentStory(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseIncidentStory(props);
  const [picks, setPicks] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [showPath, setShowPath] = useState(false);

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
        Incident à choix indisponible : {parsed.problem}
      </div>
    );
  }
  const story = parsed.value;
  const run = play(story, picks);
  const endings = endingsOf(story);
  const path = recommendedPath(story);

  const choose = (pick: number): void => {
    const next = [...picks, pick];
    const after = play(story, next);
    setPicks(next);
    if (after.ending !== null && !found.includes(after.scene.id)) {
      setFound([...found, after.scene.id]);
    }
  };

  const restart = (): void => {
    setPicks([]);
    setShowPath(false);
  };

  return (
    <section
      aria-label={`Incident à choix${story.title ? ` : ${story.title}` : ""}`}
      style={{
        margin: "28px 0",
        border: "1px solid #1F1B47",
        borderTop: `2px solid ${ACCENT}`,
        background: "#05041A",
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
        <span style={{ ...tag, color: ACCENT }}>Incident à choix</span>
        {story.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{story.title}</span>
        ) : null}
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
          {run.ending === null ? `Décision ${String(run.steps.length + 1)}` : "Fin"}
        </span>
      </header>

      <div style={{ padding: "14px 16px 16px", display: "grid", gap: 14 }}>
        {story.role ? <p style={{ ...prose, fontStyle: "italic" }}>{story.role}</p> : null}
        {story.task ? <p style={prose}>{story.task}</p> : null}

        {run.steps.length > 0 ? (
          <ol
            aria-label="Tes décisions"
            style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}
          >
            {run.steps.map((step, k) => (
              <li
                key={k}
                style={{
                  borderLeft: `2px solid ${VERDICT_COLOR[step.choice.verdict]}`,
                  paddingLeft: 12,
                  display: "grid",
                  gap: 4,
                }}
              >
                {step.scene.title ? (
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
                    {step.scene.title}
                  </span>
                ) : null}
                <span style={{ color: "#F5F5FA", fontSize: 14 }}>{step.choice.text}</span>
                <span style={{ ...tag, color: VERDICT_COLOR[step.choice.verdict] }}>
                  {VERDICT_LABELS[step.choice.verdict]}
                </span>
                <p style={prose}>{step.choice.consequence}</p>
              </li>
            ))}
          </ol>
        ) : null}

        <article
          aria-label={run.scene.title ?? (run.ending === null ? "La situation" : "La fin")}
          style={{
            border: `1px solid ${run.ending === null ? "#2A2560" : ENDING_COLOR[run.ending]}`,
            padding: "12px 14px",
            display: "grid",
            gap: 10,
          }}
        >
          {run.ending !== null ? (
            <span style={{ ...tag, color: ENDING_COLOR[run.ending] }}>
              {ENDING_LABELS[run.ending]}
            </span>
          ) : null}
          {run.scene.title ? (
            <h4 style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: "#7F7BA9" }}>
              {run.scene.title}
            </h4>
          ) : null}
          {paragraphsOf(run.scene.text).map((paragraph, k) => (
            <p key={k} style={{ ...prose, color: "#F5F5FA" }}>
              {paragraph}
            </p>
          ))}
          {run.scene.choices ? (
            <div role="group" aria-label="Que fais-tu ?" style={{ display: "grid", gap: 6 }}>
              {run.scene.choices.map((choice, k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    choose(k);
                  }}
                  style={button}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          ) : null}
        </article>

        <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
          {run.ending !== null ? (
            <>
              <p style={{ ...prose, color: "#F5F5FA" }}>{debriefLine(run)}</p>
              <p style={prose}>
                Fins découvertes : {String(found.length)} sur {String(endings.length)}.
                {found.length < endings.length
                  ? " Rejoue pour voir où mènent les autres décisions."
                  : ""}
              </p>
              {showPath && path ? (
                <ol
                  aria-label="La suite conseillée"
                  style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}
                >
                  {path.map((step, k) => (
                    <li key={k} style={{ color: "#B8B5D1", fontSize: 14 }}>
                      {step.scene.title ? (
                        <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
                          {step.scene.title} :{" "}
                        </span>
                      ) : null}
                      {step.choice.text}
                    </li>
                  ))}
                </ol>
              ) : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={restart}
                  style={{ ...button, border: `1px solid ${ACCENT}`, color: ACCENT }}
                >
                  Rejouer
                </button>
                {path && !showPath ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPath(true);
                    }}
                    style={small}
                  >
                    Voir la suite conseillée
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
