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
import { supabase } from "@/lib/supabase";

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://cyberlearn.fr").replace(/\/$/, "");
const RESET_REDIRECT_URL = `${SITE_URL}/auth/callback?next=/reset-password`;

export default function ForgotPassword(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(
      "Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être envoyé.",
    );
  }

  return (
    <AuthFormScreen
      eyebrow="Récupération"
      title="Nouveau mot de passe."
      description="Le lien sécurisé s’ouvrira sur cyberlearn.fr pour choisir ton nouveau mot de passe."
    >
      <AuthField
        label="Adresse e-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="toi@exemple.fr"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        onSubmitEditing={() => void requestReset()}
      />
      <AuthError message={error} />
      <AuthNotice message={message} />
      <GradientButton label="Envoyer le lien" onPress={() => void requestReset()} loading={busy} />
      <AuthTextLink label="Retour à la connexion" onPress={() => router.back()} />
    </AuthFormScreen>
  );
}
