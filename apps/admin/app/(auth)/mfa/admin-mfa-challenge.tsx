"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { mfaCodeSchema } from "@cyberlearn/types";
import { OtpCodeInput, useOtpAutoSubmit } from "@cyberlearn/ui";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { CancelSignIn } from "./cancel-sign-in";

export function AdminMfaChallenge({
  next,
}: {
  /** Already checked by the page: a console path, or the dashboard. */
  next: string;
}): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const verify = useCallback(
    async (value: string): Promise<void> => {
      const parsed = mfaCodeSchema.safeParse(value);
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
      router.replace(next);
      router.refresh();
    },
    [next, router],
  );

  // Sent on the sixth digit, once, as on the learner site. Enter and the
  // button stay the way to insist on a code that was refused.
  const submit = useOtpAutoSubmit({
    code,
    pending,
    onSubmit: (value) => {
      void verify(value);
    },
  });

  return (
    <form
      className="a-auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
    >
      <OtpCodeInput
        label="Code temporaire"
        value={code}
        onValueChange={setCode}
        className="a-field"
        labelClassName="a-label"
        inputClassName="a-input a-input--code"
      />
      {/* Announced by itself: the code leaves on the sixth digit, with no click. */}
      {error ? (
        <p className="a-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="a-btn a-btn--primary" type="submit" disabled={pending}>
        {pending ? "Vérification…" : "Valider"}
      </button>
      <CancelSignIn />
    </form>
  );
}
