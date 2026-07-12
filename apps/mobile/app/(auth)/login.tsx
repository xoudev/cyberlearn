import { makeRedirectUri } from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { Screen } from "@/components/screen";
import { requestLoginCode } from "@/lib/api";
import { supabase } from "@/lib/supabase";

void WebBrowser.maybeCompleteAuthSession();

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"otp" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(): Promise<void> {
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      setError("Entre une adresse e-mail valide.");
      return;
    }
    setError(null);
    setBusy("otp");
    // Server-side flow: the web API emails our template with the 6-digit code
    // (supabase.auth.signInWithOtp would send Supabase's link-only email).
    const res = await requestLoginCode(value);
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? "Envoi impossible. Réessaie dans un instant.");
      return;
    }
    router.push({ pathname: "/verify-otp", params: { email: value } });
  }

  async function signInGithub(): Promise<void> {
    setError(null);
    setBusy("github");
    try {
      const redirectTo = makeRedirectUri({ scheme: "cyberlearn", path: "auth-callback" });
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (err || !data.url) {
        setError("Connexion GitHub indisponible.");
        return;
      }
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== "success" || !res.url) return;
      const url = new URL(res.url);
      const code = url.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    } catch {
      setError("Connexion GitHub interrompue.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 22 }}>
        <View style={{ alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Text variant="display" style={{ letterSpacing: 2 }}>
            CYBER
            <Text
              style={{
                color: colors.accent,
                fontFamily: `${fonts.sans}_800ExtraBold`,
                fontSize: 32,
              }}
            >
              LEARN
            </Text>
          </Text>
          <Text variant="micro" style={{ color: colors.accent }}>
            Bon retour
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="micro">Adresse e-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="toi@exemple.fr"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={inputStyle}
          />
          <Text variant="bodySm">Sans mot de passe. On t&apos;envoie un code valable 1 h.</Text>
        </View>

        {error ? (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}

        <Pressable onPress={sendCode} disabled={busy !== null} style={primaryBtn(busy === "otp")}>
          {busy === "otp" ? (
            <ActivityIndicator color={colors.bgBase} />
          ) : (
            <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
              Recevoir le code
            </Text>
          )}
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSubtle }} />
          <Text variant="micro">ou</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSubtle }} />
        </View>

        <Pressable onPress={signInGithub} disabled={busy !== null} style={ghostBtn}>
          {busy === "github" ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text variant="micro" style={{ color: colors.textPrimary, letterSpacing: 1 }}>
              Continuer avec GitHub
            </Text>
          )}
        </Pressable>

        {/* Build marker: confirms which JS bundle the device is running. */}
        <Text variant="micro" style={{ textAlign: "center", color: colors.textDisabled }}>
          build otp-v2
        </Text>
      </View>
    </Screen>
  );
}

const inputStyle = {
  height: 48,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  backgroundColor: "rgba(5,4,26,0.6)",
  color: colors.textPrimary,
  fontFamily: `${fonts.mono}_400Regular`,
  fontSize: 14,
  paddingHorizontal: 14,
} as const;

function primaryBtn(busy: boolean) {
  return {
    height: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.accent,
    opacity: busy ? 0.7 : 1,
  };
}

const ghostBtn = {
  height: 48,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderWidth: 1,
  borderColor: colors.borderDefault,
} as const;
