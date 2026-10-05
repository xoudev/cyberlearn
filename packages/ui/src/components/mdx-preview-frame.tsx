"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * The site's rendering of a draft, inside the editor.
 *
 * The panel cannot draw a lesson itself: the components live in the site, and
 * a copy here would be the approximation the quick preview already is. So the
 * draft goes to the site (the app's server action, through `refresh`) and the
 * page the site renders is framed. After each pause in typing the draft is
 * sent again and the frame reloaded; the author also has a button for it.
 *
 * What the site answers is an address, or the reason the draft cannot be
 * drawn: the same check the save runs, so the error names the section and
 * the line, before the author has saved anything.
 */

export type MdxPreviewResult = { ok: true; url: string } | { ok: false; error: string };

export interface MdxEditorPreview {
  /** Sends the draft to the site; resolves with the page to frame, or why it cannot be drawn. */
  refresh: (mdx: string) => Promise<MdxPreviewResult>;
}

/**
 * The shape of the apps' server actions. The token comes back so the next
 * refresh updates the same preview instead of leaving one behind per pause.
 */
export type LessonPreviewAction = (input: {
  token: string | null;
  contentMdx: string;
}) => Promise<{ ok: true; token: string; url: string } | { ok: false; error: string }>;

/** A `preview` for the panel, from the app's action: keeps the token between refreshes. */
export function useLessonPreview(action: LessonPreviewAction): MdxEditorPreview {
  const token = useRef<string | null>(null);
  const refresh = useCallback(
    async (mdx: string): Promise<MdxPreviewResult> => {
      const result = await action({ token: token.current, contentMdx: mdx });
      if (!result.ok) return result;
      token.current = result.token;
      return { ok: true, url: result.url };
    },
    [action],
  );
  return useMemo(() => ({ refresh }), [refresh]);
}

/** How long the typing has to stop before the draft is sent. */
export const PREVIEW_PAUSE_MS = 1500;

export interface PreviewState {
  /** The page to frame; null until the first draft has been accepted. */
  url: string | null;
  /** Why the last draft was refused; null once one is accepted again. */
  error: string | null;
  /** A draft is on its way. */
  busy: boolean;
  /** The editor's text differs from the last draft the site accepted. */
  stale: boolean;
  /** Bumped each time the frame should reload. */
  version: number;
}

const INITIAL: PreviewState = { url: null, error: null, busy: false, stale: true, version: 0 };

export function usePreviewRefresh(
  value: string,
  preview: MdxEditorPreview,
): { state: PreviewState; refreshNow: () => void } {
  const [state, setState] = useState<PreviewState>(INITIAL);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const latest = useRef(value);
  latest.current = value;
  /** The last draft the site accepted. */
  const accepted = useRef<string | null>(null);
  /** Numbers the sends, so an answer that arrives after a later send is dropped. */
  const sends = useRef(0);

  const send = useCallback(async (mdx: string): Promise<void> => {
    const id = ++sends.current;
    setState((s) => ({ ...s, busy: true }));
    let result: MdxPreviewResult;
    try {
      result = await previewRef.current.refresh(mdx);
    } catch {
      result = { ok: false, error: "L'aperçu n'a pas répondu. Réessaie dans un instant." };
    }
    if (id !== sends.current) return;
    if (result.ok) {
      accepted.current = mdx;
      const url = result.url;
      setState((s) => ({
        url,
        error: null,
        busy: false,
        stale: latest.current !== mdx,
        version: s.version + 1,
      }));
    } else {
      const error = result.error;
      setState((s) => ({ ...s, error, busy: false }));
    }
  }, []);

  useEffect(() => {
    if (value === accepted.current) {
      setState((s) => (s.stale ? { ...s, stale: false } : s));
      return;
    }
    setState((s) => (s.stale ? s : { ...s, stale: true }));
    // The first draft goes at once: the frame is empty until it does.
    const delay = sends.current === 0 ? 0 : PREVIEW_PAUSE_MS;
    const timer = setTimeout(() => {
      void send(value);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, send]);

  const refreshNow = useCallback(() => {
    void send(latest.current);
  }, [send]);

  return { state, refreshNow };
}

// ── Chrome ─────────────────────────────────────────────────────────────────────

const BORDER = "#2A2560";
const ACCENT = "var(--cosmetic-accent)";
const MONO = "var(--font-mono)";
const DANGER = "#FF4D6D";

/** A small button of a pane's header: RAFRAÎCHIR, SITE, RAPIDE. */
export function PaneButton({
  children,
  onClick,
  title,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 20,
        padding: "0 8px",
        border: `1px solid ${BORDER}`,
        background: "transparent",
        color: disabled ? "#44406B" : "#7F7BA9",
        fontFamily: MONO,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.08em",
        cursor: disabled ? "default" : "pointer",
        borderRadius: 2,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export function MdxPreviewFrame({
  value,
  preview,
  onQuick,
}: {
  value: string;
  preview: MdxEditorPreview;
  /** Switches the pane to the quick preview. */
  onQuick: () => void;
}): React.ReactElement {
  const { state, refreshNow } = usePreviewRefresh(value, preview);
  const frame = useRef<HTMLIFrameElement>(null);

  // Setting src again, even to the same address, makes the frame load it
  // again; the version changes on every accepted draft.
  useEffect(() => {
    if (state.url !== null && frame.current) frame.current.src = state.url;
  }, [state.url, state.version]);

  const status = state.busy
    ? "mise à jour…"
    : state.error !== null
      ? "refusé"
      : state.stale
        ? "modifié"
        : state.url !== null
          ? "à jour"
          : "";

  return (
    <div
      style={{
        height: 620,
        display: "flex",
        flexDirection: "column",
        background: "#060422",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          color: "#7F7BA9",
          letterSpacing: "0.12em",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: "1px solid rgba(31,27,71,0.6)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: ACCENT,
            display: "inline-block",
            boxShadow: `0 0 6px ${ACCENT}`,
          }}
        />
        APERÇU DU SITE
        <span
          aria-live="polite"
          style={{
            marginLeft: "auto",
            color: state.error !== null ? DANGER : state.stale || state.busy ? "#B8B5D1" : ACCENT,
          }}
        >
          {status}
        </span>
        <PaneButton
          title="Envoyer le brouillon au site maintenant"
          onClick={refreshNow}
          disabled={state.busy}
        >
          RAFRAÎCHIR
        </PaneButton>
        <PaneButton title="L'aperçu rapide : une approximation, à chaque frappe" onClick={onQuick}>
          RAPIDE
        </PaneButton>
      </div>

      {state.error !== null && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "8px 16px",
            borderBottom: `1px solid ${DANGER}55`,
            background: "rgba(255,77,109,0.07)",
            color: "#F5F5FA",
            fontSize: 12,
            lineHeight: 1.5,
            flexShrink: 0,
          }}
        >
          <b style={{ color: DANGER, fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em" }}>
            NE S&apos;AFFICHE PAS ·{" "}
          </b>
          {state.error}
        </p>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        {state.url === null ? (
          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "#7F7BA9",
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.08em",
            }}
          >
            {state.error === null ? "// préparation de l'aperçu…" : "// corrige, puis rafraîchis"}
          </div>
        ) : (
          <iframe
            ref={frame}
            title="Aperçu de la leçon, rendu par le site"
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: "100%",
              border: 0,
              display: "block",
              background: "#030219",
            }}
          />
        )}
      </div>
    </div>
  );
}
