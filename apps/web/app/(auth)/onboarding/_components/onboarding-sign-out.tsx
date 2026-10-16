"use client";

// Client: signing out goes through the browser's Supabase client, which clears
// the session cookies, as the sidebar's button does once the sign-up is done.

import React, { useState } from "react";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";

/**
 * The way out during the sign-up. The sidebar, which carries it everywhere
 * else, is not drawn until the onboarding is finished, and the middleware
 * sends every other page back here until then: somebody signed in with the
 * wrong GitHub account, or on a shared computer, had to make up a handle and
 * reach step 3 to leave. The app offers the same under its onboarding.
 *
 * A full page load to /login afterwards, so nothing of the session stays in
 * the router's cache.
 */
export function OnboardingSignOut(): React.ReactElement {
  const [pending, setPending] = useState(false);

  async function signOut(): Promise<void> {
    setPending(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <button
      type="button"
      className="mono-label onboarding-bar__signout"
      disabled={pending}
      onClick={() => {
        void signOut();
      }}
      style={{
        flexShrink: 0,
        minHeight: 32,
        padding: "0 10px",
        background: "transparent",
        border: "1px solid var(--color-border-default)",
        color: "var(--color-text-secondary)",
        cursor: pending ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
