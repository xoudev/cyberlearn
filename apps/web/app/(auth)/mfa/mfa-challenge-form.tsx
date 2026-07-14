"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mfaCodeSchema } from "@cyberlearn/types";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import styles from "../_components/auth-shell.module.css";

export function MfaChallengeForm({ next }: { next: string }): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(): Promise<void> {
    const parsed = mfaCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError("Entre le code à six chiffres affiché dans ton application.");
      return;
    }

    setPending(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const factors = await supabase.auth.mfa.listFactors();
    const factor = factors.data?.totp[0];
    if (factors.error || !factor) {
      setError("Aucun facteur TOTP actif n’a été trouvé.");
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

    router.replace(next);
    router.refresh();
  }

  async function cancel(): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Code temporaire</span>
        <input
          className={[styles.input, styles.codeInput].join(" ")}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
        />
      </label>
      {error ? <p className={[styles.message, styles.error].join(" ")}>{error}</p> : null}
      <button
        className={styles.submit}
        type="button"
        disabled={pending}
        onClick={() => {
          void verify();
        }}
      >
        {pending ? "Vérification…" : "Valider le code"}
      </button>
      <button
        className={styles.link}
        type="button"
        onClick={() => {
          void cancel();
        }}
      >
        Annuler et se déconnecter
      </button>
    </div>
  );
}
