"use client";

// Cloudflare's script draws the check into a node of the page and adds the
// token to the form as a hidden field: it needs the DOM.

import { useEffect, useRef } from "react";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "dark" | "light";
      language: string;
      size: "flexible";
      appearance: "interaction-only";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once for the page, however many forms ask for it. */
function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }
    // Created by this script rather than written in the page: the policy's
    // 'strict-dynamic' trusts what a script it already trusts adds.
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("turnstile script loaded without its API"));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("turnstile script failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * The anti-robot check of a form, drawn only when Cloudflare wants the visitor
 * to do something: most people never see it.
 *
 * Nothing at all without a site key, which is how a deployment leaves the
 * check off. A token is good for one submission, so `resetKey` changes after
 * each answer of the form's action and the widget asks for a new one; without
 * it the second attempt after a mistyped password was refused as a robot.
 */
export function TurnstileWidget({ resetKey }: { resetKey: unknown }): React.JSX.Element | null {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const node = container.current;
    if (!siteKey || node === null) return;
    let cancelled = false;
    let api: TurnstileApi | null = null;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        api = turnstile;
        widgetId.current = turnstile.render(node, {
          sitekey: siteKey,
          theme: "dark",
          language: "fr",
          size: "flexible",
          appearance: "interaction-only",
        });
      })
      .catch(() => {
        // The script is blocked or Cloudflare is down. The form is sent
        // without a token and the server answers with the reason.
      });
    return () => {
      cancelled = true;
      if (api !== null && widgetId.current !== null) api.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  const firstKey = useRef(resetKey);
  useEffect(() => {
    if (firstKey.current === resetKey) return;
    firstKey.current = resetKey;
    if (window.turnstile && widgetId.current !== null) window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={container} data-turnstile />;
}
