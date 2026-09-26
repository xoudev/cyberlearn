"use client";

import React, { useSyncExternalStore } from "react";
import { getPythonRuntime, type PythonRuntimeState } from "@/lib/python/runtime";

/**
 * What the page's Python is doing, said out loud.
 *
 * Before, a slow first start, a failed start and a stuck worker all looked the
 * same: nothing, then a wrong result. The learner's only way out was a reload,
 * which also lost their code.
 */

const SERVER_STATE = (): PythonRuntimeState => "idle";

export function usePythonRuntimeState(): PythonRuntimeState {
  const runtime = getPythonRuntime();
  return useSyncExternalStore(runtime.subscribe, runtime.getState, SERVER_STATE);
}

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
  letterSpacing: "0.04em",
  lineHeight: 1.5,
};

/**
 * One line under the editor while Python starts, or when it could not. Shown
 * only when there is something to say.
 */
export function PythonStatusNotice({
  state,
  busy,
}: {
  state: PythonRuntimeState;
  /** A run is waiting on Python: the loading line is only worth showing then. */
  busy: boolean;
}): React.ReactElement | null {
  if (state === "failed") {
    return (
      <div
        role="alert"
        style={{
          ...MONO,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "10px 16px",
          borderTop: "1px solid rgba(255,176,32,0.35)",
          background: "rgba(255,176,32,0.06)",
          color: "#FFB020",
        }}
      >
        <span>Python n&apos;a pas pu démarrer. Ton code est conservé.</span>
        <button
          type="button"
          onClick={() => {
            void getPythonRuntime()
              .restart()
              .catch(() => undefined);
          }}
          style={{
            ...MONO,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "6px 12px",
            background: "transparent",
            color: "#FFB020",
            border: "1px solid rgba(255,176,32,0.5)",
            cursor: "pointer",
          }}
        >
          Relancer Python
        </button>
      </div>
    );
  }
  if (state === "loading" && busy) {
    return (
      <div
        role="status"
        style={{
          ...MONO,
          padding: "10px 16px",
          borderTop: "1px solid #1F1B47",
          background: "rgba(5,4,26,0.6)",
          color: "#B8B5D1",
        }}
      >
        Démarrage de Python. La première fois, le navigateur télécharge l&apos;interpréteur : cela
        peut prendre quelques secondes.
      </div>
    );
  }
  return null;
}

/** Back to the starter code, with a word when a saved draft was put back. */
export function DraftControls({
  restored,
  onReset,
}: {
  restored: boolean;
  onReset: () => void;
}): React.ReactElement {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      {restored && (
        <span style={{ ...MONO, fontSize: 10, color: "#7F7BA9" }}>Brouillon retrouvé</span>
      )}
      <button
        type="button"
        onClick={onReset}
        title="Revenir au code de départ"
        style={{
          ...MONO,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "4px 8px",
          background: "transparent",
          color: "#7F7BA9",
          border: "1px solid #2A2560",
          cursor: "pointer",
        }}
      >
        Réinitialiser
      </button>
    </span>
  );
}

/** The French hint under a Python error. */
export function ErrorHint({
  hint,
}: { hint: string | null | undefined }): React.ReactElement | null {
  if (!hint) return null;
  return (
    <div style={{ ...MONO, marginTop: 6, color: "#B8B5D1" }}>
      <span style={{ color: "#FFB020" }}>Piste : </span>
      {hint}
    </div>
  );
}
