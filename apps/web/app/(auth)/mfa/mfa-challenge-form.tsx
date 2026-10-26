"use client";
import Link from "next/link";

// TOTP entry, automatic submission and verification require browser interaction.
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  MFA_RECOURSE_HINT,
  MFA_RECOURSE_PATH,
  MFA_RECOURSE_PROMPT,
} from "@cyberlearn/lib/auth/mfa-recourse";
import { mfaCodeSchema } from "@cyberlearn/types";
import { OtpCodeInput, useOtpAutoSubmit } from "@cyberlearn/ui";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { completeMfaSignIn } from "../_actions/mfa-sign-in";
import styles from "../_components/auth-shell.module.css";

export function MfaChallengeForm({ next }: { next: string }): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(
    async (value: string): Promise<void> => {
      const parsed = mfaCodeSchema.safeParse(value);
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

      // The sign-in is finished on the server: the profile synchronisation
      // (lastActiveAt above all) and the onboarding step were skipped while
      // the code was owed. Should that request fail, the session is valid all
      // the same, and the destination asked for is still the right place.
      let destination: string;
      try {
        destination = (await completeMfaSignIn(next)).redirectTo;
      } catch {
        destination = next;
      }
      router.replace(destination);
      router.refresh();
    },
    [next, router],
  );

  // Sent on the sixth digit, once (@cyberlearn/lib/auth/otp-code). The submit
  // button and Enter stay the way to insist on a code that was refused.
  const submit = useOtpAutoSubmit({
    code,
    pending,
    onSubmit: (value) => {
      void verify(value);
    },
  });

  async function cancel(): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
    >
      <OtpCodeInput
        label="Code temporaire"
        value={code}
        onValueChange={setCode}
        className={styles.field}
        labelClassName={styles.label}
        inputClassName={[styles.input, styles.codeInput].join(" ")}
      />
      {error ? (
        <p className={[styles.message, styles.error].join(" ")} role="alert">
          {error}
        </p>
      ) : null}
      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? "Vérification…" : "Valider le code"}
      </button>
      {/* Without the phone there is no code to type, and the team can remove the
          factor. The contact form is outside the second-factor gate, so this
          does not bring the person back here. */}
      <div className={styles.recourse}>
        <Link className={styles.link} href={MFA_RECOURSE_PATH}>
          {MFA_RECOURSE_PROMPT}
        </Link>
        <p className={styles.finePrint}>{MFA_RECOURSE_HINT}</p>
      </div>
      <button
        className={styles.link}
        type="button"
        onClick={() => {
          void cancel();
        }}
      >
        Annuler et se déconnecter
      </button>
    </form>
  );
}
