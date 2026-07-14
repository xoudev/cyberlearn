"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mfaCodeSchema } from "@cyberlearn/types";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import styles from "../auth.module.css";

export function AdminMfaChallenge(): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function verify(): Promise<void> {
    const parsed = mfaCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError("Code à six chiffres requis.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const factors = await supabase.auth.mfa.listFactors();
    const factor = factors.data?.totp[0];
    if (factors.error || !factor) {
      setError("Facteur MFA introuvable.");
      setPending(false);
      return;
    }
    const result = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: parsed.data,
    });
    if (result.error) {
      setError("Code invalide ou expiré.");
      setPending(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className={styles.form}>
      <input
        className={[styles.input, styles.code].join(" ")}
        value={code}
        onChange={(event) => {
          setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      <button
        className={styles.button}
        type="button"
        disabled={pending}
        onClick={() => {
          void verify();
        }}
      >
        {pending ? "Vérification…" : "Valider"}
      </button>
    </div>
  );
}
