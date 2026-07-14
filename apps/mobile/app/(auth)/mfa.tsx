import { mfaCodeSchema } from "@cyberlearn/types";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { GradientButton } from "@/components/buttons";
import { AuthError, AuthField, AuthFormScreen, AuthTextLink } from "@/components/auth-form";
import { supabase } from "@/lib/supabase";

export default function MfaChallenge(): React.JSX.Element {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function verify(): Promise<void> {
    const result = mfaCodeSchema.safeParse(code);
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
    router.replace("/accueil");
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
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          onSubmitEditing={() => void verify()}
        />
      </View>
      <AuthError message={error} />
      <GradientButton
        label="Valider le code"
        onPress={() => void verify()}
        loading={busy}
        disabled={!factorId}
      />
      <AuthTextLink label="Utiliser un autre compte" onPress={() => void supabase.auth.signOut()} />
    </AuthFormScreen>
  );
}
