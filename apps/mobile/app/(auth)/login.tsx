import { passwordSignInSchema } from "@cyberlearn/types";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { GradientButton } from "@/components/buttons";
import { AuthError, AuthField, AuthFormScreen, AuthTextLink } from "@/components/auth-form";
import { supabase } from "@/lib/supabase";

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(): Promise<void> {
    const result = passwordSignInSchema.safeParse({ email, password, redirectTo: "/accueil" });
    if (!result.success) {
      setError("Vérifie ton adresse e-mail et ton mot de passe.");
      return;
    }

    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });
    setBusy(false);

    if (signInError) {
      setError("Adresse e-mail ou mot de passe incorrect.");
    }
  }

  return (
    <AuthFormScreen
      eyebrow="Accès sécurisé"
      title="Bon retour."
      description="Connecte-toi avec le même compte que sur cyberlearn.fr."
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
          placeholder="12 caractères minimum"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          secure
          onSubmitEditing={() => void signIn()}
        />
      </View>

      <AuthError message={error} />
      <GradientButton label="Se connecter" onPress={() => void signIn()} loading={busy} />

      <View style={{ gap: 2 }}>
        <AuthTextLink
          label="Mot de passe oublié ?"
          onPress={() => router.push("/forgot-password")}
        />
        <AuthTextLink label="Créer un compte" onPress={() => router.push("/register")} />
      </View>
    </AuthFormScreen>
  );
}
