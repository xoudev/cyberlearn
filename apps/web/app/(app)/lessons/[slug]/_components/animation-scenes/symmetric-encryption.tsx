import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Footer, INK, Machine, MONO, progress, SANS, starts } from "./common";

/**
 * Symmetric encryption: Alice's message scrambles under a shared key, crosses
 * the wire past Eve, and unscrambles under the same key at Bob's. The steps'
 * lengths match ANIMATION_SCENES["symmetric-encryption"].
 */

const STEP = starts([60, 75, 90, 105, 90]);
const CLEAR = "RENDEZ-VOUS 18H";
const CIPHER = "x4Q#Lz!p-M9&Rk2";
const ALICE_X = 130;
const BOB_X = 670;
const WIRE_Y = 215;

/** The clear text with its first `n` characters replaced by the cipher's. */
function mixed(n: number, back: boolean): string {
  let out = "";
  for (let i = 0; i < CLEAR.length; i++) {
    const scrambled = back ? i >= n : i < n;
    out += scrambled ? CIPHER.charAt(i) : CLEAR.charAt(i);
  }
  return out;
}

function Key({
  x,
  y,
  scale,
  label,
}: {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly label: string;
}): React.ReactElement {
  return (
    <div
      style={{
        position: "absolute",
        left: x - 30,
        top: y,
        width: 60,
        textAlign: "center",
        transform: `scale(${String(scale)})`,
        fontFamily: MONO,
      }}
    >
      <svg width="40" height="20" viewBox="0 0 40 20" aria-hidden="true">
        <circle cx="8" cy="10" r="6" fill="none" stroke={INK.amber} strokeWidth="2.5" />
        <path
          d="M14 10 H38 M30 10 V16 M35 10 V15"
          stroke={INK.amber}
          strokeWidth="2.5"
          fill="none"
        />
      </svg>
      <div style={{ fontSize: 12, color: INK.amber }}>{label}</div>
    </div>
  );
}

export function SymmetricEncryption(): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const keyScale = spring({ frame: frame - (STEP[1] ?? 0), fps, config: { damping: 12 } });
  const keysShown = frame >= (STEP[1] ?? 0);
  const scrambleN = Math.round(progress(frame, STEP[2] ?? 0, (STEP[2] ?? 0) + 70) * CLEAR.length);
  const travel = progress(frame, STEP[3] ?? 0, (STEP[3] ?? 0) + 80);
  const unscrambleN = Math.round(
    progress(frame, (STEP[4] ?? 0) + 10, (STEP[4] ?? 0) + 75) * CLEAR.length,
  );
  const eveSees = travel > 0.4;

  let text = CLEAR;
  if (frame >= (STEP[4] ?? 0)) text = mixed(unscrambleN, true);
  else if (frame >= (STEP[2] ?? 0)) text = mixed(scrambleN, false);
  const bubbleX = ALICE_X + (BOB_X - ALICE_X) * travel;
  const scrambled = frame >= (STEP[2] ?? 0) && text !== CLEAR;

  return (
    <AbsoluteFill style={{ background: INK.bg }}>
      <Machine x={ALICE_X} y={70} name="Alice" />
      <Machine x={BOB_X} y={70} name="Bob" />
      <svg
        style={{ position: "absolute", left: 0, top: 0 }}
        width={800}
        height={450}
        aria-hidden="true"
      >
        <line
          x1={ALICE_X + 70}
          y1={WIRE_Y}
          x2={BOB_X - 70}
          y2={WIRE_Y}
          stroke={INK.line}
          strokeWidth={2}
        />
        <line x1={400} y1={WIRE_Y} x2={400} y2={300} stroke={INK.red} strokeDasharray="4 5" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 340,
          top: 305,
          width: 120,
          textAlign: "center",
          fontFamily: SANS,
          color: INK.red,
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Ève écoute
        {keysShown ? (
          <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 400, opacity: keyScale }}>
            pas de clé
          </div>
        ) : null}
      </div>
      {keysShown ? (
        <>
          <Key x={ALICE_X} y={150} scale={keyScale} label="clé K" />
          <Key x={BOB_X} y={150} scale={keyScale} label="clé K" />
        </>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: bubbleX - 95,
          top: WIRE_Y - 50,
          width: 190,
          padding: "8px 0",
          textAlign: "center",
          border: `2px solid ${scrambled ? INK.purple : INK.accent}`,
          background: INK.panel,
          fontFamily: MONO,
          fontSize: 15,
          letterSpacing: 1,
          color: scrambled ? INK.purple : INK.text,
        }}
      >
        {text}
      </div>
      {eveSees ? (
        <div
          style={{
            position: "absolute",
            left: 300,
            top: 345,
            width: 200,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 13,
            color: INK.red,
            opacity: progress(travel, 0.4, 0.6),
          }}
        >
          {CIPHER} <span style={{ fontSize: 18 }}>?</span>
        </div>
      ) : null}
      <Footer>
        {frame < (STEP[1] ?? 0)
          ? "en clair, tout le monde lit"
          : frame < (STEP[2] ?? 0)
            ? "la même clé des deux côtés"
            : frame < (STEP[3] ?? 0)
              ? "clair + clé → chiffré"
              : frame < (STEP[4] ?? 0)
                ? "Ève capte le chiffré, pas la clé"
                : "chiffré + clé → clair"}
      </Footer>
    </AbsoluteFill>
  );
}
