import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Footer, INK, MONO, progress, SANS, starts } from "./common";

/**
 * The call stack of a small Python programme: frames pushed as functions are
 * called, popped as they return, the line being run lit in the code. The
 * steps' lengths match ANIMATION_SCENES["call-stack"].
 */

const STEP = starts([60, 75, 75, 75, 75, 90]);
const CODE = [
  "def carre(n):",
  "    return n * n",
  "",
  "def somme_carres(a, b):",
  "    return carre(a) + carre(b)",
  "",
  "resultat = somme_carres(3, 4)",
];

interface Frame {
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly note?: string | undefined;
}

export function CallStack(): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = STEP[1] ?? 0;
  const s2 = STEP[2] ?? 0;
  const s3 = STEP[3] ?? 0;
  const s4 = STEP[4] ?? 0;
  const s5 = STEP[5] ?? 0;

  // The line lit in the code, step by step.
  const line =
    frame < s1
      ? 6
      : frame < s2
        ? 4
        : frame < s3
          ? 1
          : frame < s4
            ? 4
            : frame < s4 + 40
              ? 1
              : frame < s5
                ? 4
                : 6;

  const frames: Frame[] = [
    {
      label: "somme_carres(a=3, b=4)",
      from: s1,
      to: s5 + 25,
      note:
        frame >= s4 + 50
          ? "carre(a) = 9, carre(b) = 16"
          : frame >= s3 + 25
            ? "carre(a) = 9"
            : undefined,
    },
    { label: "carre(n=3)", from: s2, to: s3 + 20 },
    { label: "carre(n=4)", from: s4, to: s4 + 60 },
  ];
  const returned = frame >= s5 + 30 ? "25" : frame >= s4 + 45 ? "16" : frame >= s3 + 5 ? "9" : null;
  const returnedAt = frame >= s5 + 30 ? s5 + 30 : frame >= s4 + 45 ? s4 + 45 : s3 + 5;

  return (
    <AbsoluteFill style={{ background: INK.bg, fontFamily: SANS }}>
      <div
        style={{
          position: "absolute",
          left: 36,
          top: 36,
          width: 360,
          padding: "12px 0",
          border: `1px solid ${INK.line}`,
          background: INK.panel,
          fontFamily: MONO,
          fontSize: 16,
          lineHeight: "30px",
        }}
      >
        {CODE.map((text, i) => (
          <div
            key={`${String(i)}-${text}`}
            style={{
              padding: "0 14px",
              whiteSpace: "pre",
              color: i === line ? INK.text : INK.soft,
              background: i === line ? "rgba(10, 255, 212, 0.14)" : "transparent",
              borderLeft: `3px solid ${i === line ? INK.accent : "transparent"}`,
            }}
          >
            <span style={{ color: INK.muted, marginRight: 14 }}>{String(i + 1)}</span>
            {text}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 440,
          top: 36,
          color: INK.muted,
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: 2,
        }}
      >
        PILE D&apos;APPELS
      </div>
      <div
        style={{
          position: "absolute",
          left: 440,
          top: 318,
          width: 320,
          borderTop: `2px solid ${INK.line}`,
        }}
      />
      {frames.map((f, i) => {
        if (frame < f.from || frame >= f.to) return null;
        const inT = spring({ frame: frame - f.from, fps, config: { damping: 14 } });
        const outT = f.to - frame < 20 ? progress(frame, f.to - 20, f.to) : 0;
        const level = i === 0 ? 0 : 1;
        return (
          <div
            key={f.label}
            style={{
              position: "absolute",
              left: 440,
              top: 318 - 60 * (level + 1) - 20 * (1 - inT),
              width: 320,
              height: 52,
              boxSizing: "border-box",
              padding: "6px 12px",
              border: `2px solid ${level === 1 ? INK.amber : INK.accent}`,
              background: INK.panel,
              fontFamily: MONO,
              fontSize: 15,
              color: INK.text,
              opacity: inT * (1 - outT),
            }}
          >
            {f.label}
            {f.note !== undefined ? (
              <div style={{ fontSize: 12, color: INK.muted }}>{f.note}</div>
            ) : null}
          </div>
        );
      })}
      {returned !== null && frame - returnedAt < 40 ? (
        <div
          style={{
            position: "absolute",
            left: 770,
            top: 190 + 40 * progress(frame, returnedAt, returnedAt + 30),
            fontFamily: MONO,
            fontSize: 16,
            color: INK.amber,
            opacity: 1 - progress(frame, returnedAt + 20, returnedAt + 40),
          }}
        >
          → {returned}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 440,
          top: 335,
          fontFamily: MONO,
          fontSize: 15,
          color: frame >= s5 + 30 ? INK.accent : INK.muted,
        }}
      >
        resultat = {frame >= s5 + 30 ? "25" : "?"}
      </div>
      <Footer>
        {frame < s1
          ? "la pile est vide"
          : frame < s5 + 25
            ? "un cadre par appel en cours"
            : "la pile est vide : a, b, n n'existent plus"}
      </Footer>
    </AbsoluteFill>
  );
}
