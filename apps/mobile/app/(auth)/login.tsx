import { passwordSignInSchema } from "@cyberlearn/types";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { GradientButton } from "@/components/buttons";
import { AuthError, AuthField, AuthFormScreen, AuthTextLink } from "@/components/auth-form";
import { Text } from "@/components/ui";
import { MOBILE_AUTH_CALLBACK_URL, parseMobileOAuthCallback } from "@/lib/oauth";
import { supabase } from "@/lib/supabase";

void WebBrowser.maybeCompleteAuthSession();

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"password" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(): Promise<void> {
    const result = passwordSignInSchema.safeParse({ email, password, redirectTo: "/home" });
    if (!result.success) {
      setError("Vérifie ton adresse e-mail et ton mot de passe.");
      return;
    }

    setBusy("password");
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });
    setBusy(null);

    if (signInError) {
      setError("Adresse e-mail ou mot de passe incorrect.");
    }
  }

  async function signInWithGitHub(): Promise<void> {
    setError(null);
    setBusy("github");

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: MOBILE_AUTH_CALLBACK_URL,
          skipBrowserRedirect: true,
          scopes: "read:user user:email",
        },
      });
      if (oauthError || !data.url) {
        setError("Connexion GitHub indisponible.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, MOBILE_AUTH_CALLBACK_URL);
      if (result.type !== "success" || !result.url) return;

      const callback = parseMobileOAuthCallback(result.url);
      if (callback.status === "provider_error") {
        setError("Connexion GitHub annulée ou refusée.");
        return;
      }
      if (callback.status !== "success") {
        setError("La réponse GitHub n’est pas valide.");
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(callback.code);
      if (exchangeError) setError("La session GitHub n’a pas pu être ouverte.");
    } catch {
      setError("Connexion GitHub interrompue.");
    } finally {
      setBusy(null);
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
      <GradientButton
        label="Se connecter"
        onPress={() => void signIn()}
        disabled={busy !== null}
        loading={busy === "password"}
      />

      <View style={styles.divider} accessibilityElementsHidden>
        <View style={styles.dividerLine} />
        <Text variant="micro">ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuer avec GitHub"
        disabled={busy !== null}
        onPress={() => void signInWithGitHub()}
        style={({ pressed }) => [
          styles.githubButton,
          pressed && styles.githubButtonPressed,
          busy !== null && styles.githubButtonDisabled,
        ]}
      >
        {busy === "github" ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text variant="micro" style={styles.githubLabel}>
            Continuer avec GitHub
          </Text>
        )}
      </Pressable>

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

const styles = StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  githubButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgElevated,
  },
  githubButtonPressed: { borderColor: colors.textSecondary, opacity: 0.85 },
  githubButtonDisabled: { opacity: 0.5 },
  githubLabel: { color: colors.textPrimary, letterSpacing: 1 },
});
