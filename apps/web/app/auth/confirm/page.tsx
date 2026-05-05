"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { finalizeAuthCallback } from "./actions";

export default function AuthConfirmPage(): React.ReactElement {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleImplicitSession() {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        router.replace("/login?error=missing_token");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error("[auth/confirm] setSession error:", sessionError.message);
        router.replace("/login?error=invalid_session");
        return;
      }

      const result = await finalizeAuthCallback();
      if (result.error) {
        setErrorMsg(result.error);
        return;
      }

      router.replace(result.redirectTo);
    }

    void handleImplicitSession();
  }, [router]);

  if (errorMsg) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#030219",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          color: "#FF4D6D",
          fontSize: 14,
          flexDirection: "column",
          gap: 16,
        }}
      >
        <span>{errorMsg}</span>
        <a href="/login" style={{ color: "#4D8BFF", fontSize: 12 }}>
          Retour à la connexion
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030219",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        color: "#6B6890",
        fontSize: 13,
        letterSpacing: "0.08em",
      }}
    >
      Connexion en cours…
    </div>
  );
}
