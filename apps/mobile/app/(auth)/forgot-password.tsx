import { passwordResetRequestSchema } from "@cyberlearn/types";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { GradientButton } from "@/components/buttons";
import {
  AuthError,
  AuthField,
  AuthFormScreen,
  AuthNotice,
  AuthTextLink,
} from "@/components/auth-form";
import {
  RECOVERY_COPY,
  clearRecoveryPending,
  isRecoveryCode,
  markRecoveryPending,
  recoveryCodeInput,
} from "@/lib/recovery";
import { supabase } from "@/lib/supabase";

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://cyberlearn.fr").replace(/\/$/, "");
const RESET_REDIRECT_URL = `${SITE_URL}/auth/callback?next=/reset-password`;

/**
 * Forgotten password, in two steps. The e-mail carries a link, which opens
 * the site's reset page, and a code, which is entered here: verifying it opens
 * a recovery session and the app goes on to /reset-password (through the MFA
 * step first when the account has one).
 */
export default function ForgotPassword(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset(): Promise<void> {
    const result = passwordResetRequestSchema.safeParse({ email });
    if (!result.success) {
      setError("Entre une adresse e-mail valide.");
      return;
    }

    setBusy(true);
    setError(null);
    await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: RESET_REDIRECT_URL,
    });
    setBusy(false);
    // Said the same way whether the address exists or not.
    setSentTo(result.data.email);
  }

  async function verifyCode(): Promise<void> {
    if (sentTo === null || !isRecoveryCode(code)) {
      setError(RECOVERY_COPY.badCode);
      return;
    }
    setBusy(true);
    setError(null);
    // Before the session exists, so the gates send it to the reset screen.
    markRecoveryPending();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: sentTo,
      token: code,
      type: "recovery",
    });
    setBusy(false);
    if (verifyError) {
      clearRecoveryPending();
      setError(RECOVERY_COPY.badCode);
      return;
    }
    router.replace("/reset-password");
  }

  return (
    <AuthFormScreen
      eyebrow="Récupération"
      title="Nouveau mot de passe."
      description={RECOVERY_COPY.requestDescription}
    >
      <AuthField
        label="Adresse e-mail"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setSentTo(null);
          setCode("");
        }}
        placeholder="toi@exemple.fr"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        onSubmitEditing={() => void requestReset()}
      />
      {sentTo !== null ? (
        <AuthField
          label={RECOVERY_COPY.codeLabel}
          value={code}
          onChangeText={(value) => {
            setCode(recoveryCodeInput(value));
            setError(null);
          }}
          placeholder="000000"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={10}
          onSubmitEditing={() => void verifyCode()}
        />
      ) : null}
      <AuthError message={error} />
      <AuthNotice message={sentTo !== null ? RECOVERY_COPY.sent : null} />
      {sentTo === null ? (
        <GradientButton
          label="Recevoir un code"
          onPress={() => void requestReset()}
          loading={busy}
        />
      ) : (
        <GradientButton
          label={RECOVERY_COPY.verify}
          onPress={() => void verifyCode()}
          loading={busy}
          disabled={!isRecoveryCode(code)}
        />
      )}
      {sentTo !== null ? (
        <AuthTextLink label="Renvoyer un e-mail" onPress={() => void requestReset()} />
      ) : null}
      <AuthTextLink label="Retour à la connexion" onPress={() => router.back()} />
    </AuthFormScreen>
  );
}
