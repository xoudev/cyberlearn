import {
  CONFIRMATION_RESENT_MESSAGE,
  RESEND_CONFIRMATION_LABEL,
} from "@cyberlearn/lib/auth/email-confirmation";
import React, { useState } from "react";
import { AuthError, AuthNotice, AuthTextLink } from "@/components/auth-form";
import { SITE_URL } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/** Where the link lands, as for the mail sent at sign-up. */
const EMAIL_REDIRECT_URL = `${SITE_URL}/auth/callback?next=/onboarding`;

/**
 * "Renvoyer l'e-mail de confirmation", as on the site, for an address that has
 * not been confirmed yet. Supabase's own limit on auth mails applies, as it
 * does to the sign-up and the password reset the app already sends.
 */
export function ResendConfirmation({ email }: { email: string }): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: EMAIL_REDIRECT_URL },
      });
      if (resendError?.code === "over_email_send_rate_limit" || resendError?.status === 429) {
        setError("Trop d’e-mails envoyés. Réessaie dans quelques minutes.");
        return;
      }
      // Any other refusal gets the neutral answer: which addresses wait for
      // a confirmation is not something to tell whoever asks.
      setNotice(CONFIRMATION_RESENT_MESSAGE);
    } catch {
      setError("Le service d’e-mail est indisponible. Réessaie dans quelques minutes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AuthError message={error} />
      <AuthNotice message={notice} />
      <AuthTextLink
        label={busy ? "Envoi…" : RESEND_CONFIRMATION_LABEL}
        onPress={() => {
          if (!busy) void resend();
        }}
      />
    </>
  );
}
