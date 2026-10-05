"use client";

import { ACCENT, MONO, RED } from "@cyberlearn/ui";
import dynamic from "next/dynamic";
import React, { useCallback, useState } from "react";
import { ANIMATION_SCENES, stepAt, stepBounds } from "@cyberlearn/lib/animations/scenes";
import { parseStepAnimation } from "@cyberlearn/types";
import type { PlayerCommand } from "./step-animation-player";

/**
 * <StepAnimation>: an animation the learner steps through. Each step plays
 * then pauses, with what to see written beside it; the learner goes back,
 * replays, or lets the whole scene run. Client-side because the player draws
 * in the page; the player itself (Remotion) is loaded only on a lesson that
 * has an animation, not on every lesson.
 */

const StepAnimationPlayer = dynamic(
  () => import("./step-animation-player").then((m) => m.StepAnimationPlayer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          aspectRatio: "16 / 9",
          background: "var(--color-bg-sunken)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, color: "#5A5680" }}>
          Chargement de l&apos;animation…
        </span>
      </div>
    ),
  },
);

export function StepAnimation(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseStepAnimation(props);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [command, setCommand] = useState<PlayerCommand>({
    seq: 0,
    type: "seek",
    from: 0,
    to: null,
  });

  const onFrame = useCallback((at: number) => {
    setFrame(at);
  }, []);
  const onPaused = useCallback(() => {
    setPlaying(false);
  }, []);

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{ margin: "24px 0", padding: "14px 16px", border: `1px solid ${RED}` }}
      >
        Animation indisponible : {parsed.problem}
      </div>
    );
  }
  const scene = ANIMATION_SCENES[parsed.value.scene];
  const step = stepAt(scene, frame);
  const current = scene.steps[step];
  const last = scene.steps.length - 1;

  const send = (type: PlayerCommand["type"], from: number, to: number | null): void => {
    setCommand((c) => ({ seq: c.seq + 1, type, from, to }));
    setPlaying(type === "play");
  };
  const playStep = (index: number): void => {
    const bounds = stepBounds(scene, index);
    send("play", bounds.from, bounds.to);
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Animation : ${parsed.value.title ?? scene.title}`}
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
          ANIMATION · PAS À PAS
        </span>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: 15 }}>
          {parsed.value.title ?? scene.title}
        </span>
      </header>

      <div style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <StepAnimationPlayer
          sceneId={parsed.value.scene}
          scene={scene}
          command={command}
          onFrame={onFrame}
          onPaused={onPaused}
        />
      </div>

      <div style={{ padding: "12px 16px", display: "grid", gap: 10 }}>
        <ol
          aria-label="Étapes"
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {scene.steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => {
                  playStep(i);
                }}
                aria-current={i === step ? "step" : undefined}
                className="btn btn--ghost btn--sm"
                style={{
                  color:
                    i === step
                      ? "var(--color-bg-base)"
                      : i < step
                        ? ACCENT
                        : "var(--color-text-secondary)",
                  background: i === step ? ACCENT : "transparent",
                  borderColor: i <= step ? ACCENT : "var(--color-border-default)",
                }}
              >
                {String(i + 1)}
              </button>
            </li>
          ))}
        </ol>

        <div aria-live="polite" style={{ display: "grid", gap: 4 }}>
          <strong style={{ color: "var(--color-text-primary)", fontSize: 15 }}>
            {String(step + 1)}. {current?.title}
          </strong>
          <p style={{ margin: 0, color: "#D8D6EA", fontSize: 14, lineHeight: 1.55 }}>
            {current?.text}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              playStep(Math.max(0, step - 1));
            }}
            disabled={step === 0}
            className="btn btn--ghost btn--sm"
          >
            ◀ Précédent
          </button>
          <button
            type="button"
            onClick={() => {
              if (playing) send("pause", frame, null);
              else playStep(step);
            }}
            className="btn btn--accent btn--sm"
          >
            {playing ? "Pause" : "▶ Lire cette étape"}
          </button>
          <button
            type="button"
            onClick={() => {
              playStep(Math.min(last, step + 1));
            }}
            disabled={step === last}
            className="btn btn--ghost btn--sm"
          >
            Suivant ▶
          </button>
          <button
            type="button"
            onClick={() => {
              send("play", 0, null);
            }}
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: "auto" }}
          >
            Tout lire
          </button>
        </div>

        {parsed.value.caption ? (
          <p
            style={{
              margin: 0,
              color: "var(--color-text-secondary)",
              fontSize: 13,
              fontStyle: "italic",
            }}
          >
            {parsed.value.caption}
          </p>
        ) : null}
      </div>
    </section>
  );
}
