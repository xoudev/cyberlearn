import { passwordSignUpSchema } from "@cyberlearn/types";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { GradientButton } from "@/components/buttons";
import { AuthError, AuthField, AuthFormScreen, AuthTextLink } from "@/components/auth-form";
import { Text } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://cyberlearn.fr").replace(/\/$/, "");
const EMAIL_REDIRECT_URL = `${SITE_URL}/auth/callback?next=/onboarding`;

export default function Register(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function signUp(): Promise<void> {
    const result = passwordSignUpSchema.safeParse({ email, password, passwordConfirmation });
    if (!result.success) {
      setError(
        "Utilise au moins 12 caractères avec une lettre et un chiffre, puis confirme le même mot de passe.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: { emailRedirectTo: EMAIL_REDIRECT_URL },
    });
    setBusy(false);

    if (signUpError) {
      setError("Impossible de créer ce compte pour le moment.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthFormScreen
        eyebrow="E-mail envoyé"
        title="Confirme ton adresse."
        description="Ouvre le lien reçu par e-mail pour activer ton compte et terminer ton profil sur cyberlearn.fr."
      >
        <Text variant="bodySm">Tu pourras ensuite revenir dans l’app et te connecter.</Text>
        <GradientButton label="Retour à la connexion" onPress={() => router.replace("/login")} />
      </AuthFormScreen>
    );
  }

  return (
    <AuthFormScreen
      eyebrow="Nouveau compte"
      title="Rejoins CyberLearn."
      description="Un seul compte pour le site, l’administration autorisée et l’application mobile."
    >
      <View style={{ gap: 16 }}>
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
        />
        <AuthField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          placeholder="12 caractères, une lettre, un chiffre"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          secure
        />
        <AuthField
          label="Confirmer le mot de passe"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          placeholder="Répète le mot de passe"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          secure
          onSubmitEditing={() => void signUp()}
        />
      </View>

      <AuthError message={error} />
      <GradientButton label="Créer mon compte" onPress={() => void signUp()} loading={busy} />
      <AuthTextLink label="J’ai déjà un compte" onPress={() => router.replace("/login")} />
    </AuthFormScreen>
  );
}
