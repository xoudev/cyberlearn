import { createOtpAutoSubmit, sanitizeOtpCode } from "@cyberlearn/lib/auth/otp-code";
import { mfaCodeSchema } from "@cyberlearn/types";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { GradientButton } from "@/components/buttons";
import { AuthError, AuthField, AuthFormScreen, AuthTextLink } from "@/components/auth-form";
import { clearRecoveryPending, signedInRoute } from "@/lib/recovery";
import { supabase } from "@/lib/supabase";

export default function MfaChallenge(): React.JSX.Element {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which code was sent last: the sixth digit sends a code once, and a refused
  // one left in the field does not go round again on its own.
  const [gate] = useState(createOtpAutoSubmit);

  useEffect(() => {
    let active = true;
    void supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (!active) return;
      const factor = data?.totp[0];
      if (listError || !factor) {
        setError("Aucun facteur d’authentification valide n’est disponible.");
        return;
      }
      setFactorId(factor.id);
    });
    return () => {
      active = false;
    };
  }, []);

  const verify = useCallback(
    async (value: string): Promise<void> => {
      const result = mfaCodeSchema.safeParse(value);
      if (!result.success || !factorId) {
        setError("Entre le code à 6 chiffres de ton application d’authentification.");
        return;
      }

      setBusy(true);
      setError(null);
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: result.data,
      });
      setBusy(false);

      if (verifyError) {
        setError("Code incorrect ou expiré.");
        return;
      }
      // A recovering session goes on to choose its new password.
      router.replace(signedInRoute());
    },
    [factorId, router],
  );

  // Sent on the sixth digit, as on the site: a code is always six digits, so
  // the button only matters to insist on one that was refused. A code typed
  // before the factor is known waits for it.
  useEffect(() => {
    if (gate.shouldSubmit(code, busy || factorId === null)) void verify(code);
  }, [busy, code, factorId, gate, verify]);

  function submitByHand(): void {
    gate.markSubmitted(code);
    void verify(code);
  }

  // The root gate sends a signed-out session from here to the sign-in screen
  // (lib/session-gate). A recovery started for this account ends with it, and
  // a sign-out the server could not record still ends the session here.
  async function switchAccount(): Promise<void> {
    clearRecoveryPending();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }

  return (
    <AuthFormScreen
      eyebrow="Double authentification"
      title="Confirme que c’est toi."
      description="Ouvre ton application d’authentification et entre le code temporaire."
    >
      <View style={{ gap: 16 }}>
        <AuthField
          label="Code à 6 chiffres"
          value={code}
          // No maxLength: it would cut a pasted "123 456" to "123 45" before
          // the separators are dropped.
          onChangeText={(value) => setCode(sanitizeOtpCode(value))}
          placeholder="000000"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoFocus
          onSubmitEditing={submitByHand}
        />
      </View>
      <AuthError message={error} />
      <GradientButton
        label="Valider le code"
        onPress={submitByHand}
        loading={busy}
        disabled={!factorId}
      />
      <AuthTextLink label="Utiliser un autre compte" onPress={() => void switchAccount()} />
    </AuthFormScreen>
  );
}
