import React from "react";
import { interpolate } from "remotion";

/** What the three scenes share: colours, type, a few shapes. */

export const SCENE = { width: 800, height: 450 } as const;

export const INK = {
  bg: "#05041A",
  panel: "#0A0826",
  line: "#2A2560",
  text: "#F5F5FA",
  soft: "#B8B5D1",
  muted: "#7F7BA9",
  accent: "#0AFFD4",
  amber: "#FFB020",
  purple: "#7B61FF",
  red: "#FF4757",
} as const;

export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
export const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** 0 before `from`, 1 after `to`, straight in between. */
export function progress(frame: number, from: number, to: number): number {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Where the steps of a scene start, from their lengths. */
export function starts(frames: readonly number[]): number[] {
  const out: number[] = [];
  let at = 0;
  for (const f of frames) {
    out.push(at);
    at += f;
  }
  return out;
}

export function Machine({
  x,
  y,
  name,
  state,
  color = INK.accent,
}: {
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly state?: string | undefined;
  readonly color?: string;
}): React.ReactElement {
  return (
    <div
      style={{
        position: "absolute",
        left: x - 70,
        top: y,
        width: 140,
        textAlign: "center",
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          margin: "0 auto",
          width: 64,
          height: 44,
          border: `2px solid ${color}`,
          background: INK.panel,
        }}
      />
      <div style={{ margin: "4px auto 0", width: 28, height: 4, background: color }} />
      <div style={{ marginTop: 8, color: INK.text, fontWeight: 700, fontSize: 16 }}>{name}</div>
      {state !== undefined ? (
        <div style={{ marginTop: 2, color, fontFamily: MONO, fontSize: 12, letterSpacing: 1 }}>
          {state}
        </div>
      ) : null}
    </div>
  );
}

/** A caption at the bottom of the scene. */
export function Footer({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 18,
        textAlign: "center",
        fontFamily: MONO,
        fontSize: 13,
        color: INK.muted,
      }}
    >
      {children}
    </div>
  );
}

/** A horizontal arrow drawn from x1 to x2 over `t` in [0, 1], its label above. */
export function Arrow({
  x1,
  x2,
  y,
  t,
  label,
  color,
}: {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly t: number;
  readonly label: string;
  readonly color: string;
}): React.ReactElement | null {
  if (t <= 0) return null;
  const tip = x1 + (x2 - x1) * t;
  const dir = x2 > x1 ? 1 : -1;
  return (
    <>
      <svg
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
        width={SCENE.width}
        height={SCENE.height}
        aria-hidden="true"
      >
        <line x1={x1} y1={y} x2={tip} y2={y} stroke={color} strokeWidth={2} />
        <polygon
          points={`${String(tip)},${String(y)} ${String(tip - 10 * dir)},${String(y - 5)} ${String(tip - 10 * dir)},${String(y + 5)}`}
          fill={color}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: Math.min(x1, x2),
          width: Math.abs(x2 - x1),
          top: y - 24,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 13,
          color,
          opacity: progress(t, 0.15, 0.5),
        }}
      >
        {label}
      </div>
    </>
  );
}
