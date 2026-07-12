import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { Screen } from "@/components/screen";
import { supabase } from "@/lib/supabase";

export default function VerifyOtp(): React.JSX.Element {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(): Promise<void> {
    if (!email || code.trim().length < 6) {
      setError("Entre le code à 6 chiffres reçu par e-mail.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (err) {
      setError("Code invalide ou expiré.");
      return;
    }
    // The session listener in the root gate navigates into the tabs.
  }

  async function resend(): Promise<void> {
    if (!email) return;
    setError(null);
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Text variant="micro" style={{ color: colors.accent }}>
            Lien envoyé
          </Text>
          <Text variant="h1">Vérifie ta boîte mail</Text>
          <Text variant="bodySm">On a envoyé un code à 6 chiffres à {email ?? "ton adresse"}.</Text>
        </View>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="123456"
          placeholderTextColor={colors.textDisabled}
          keyboardType="number-pad"
          maxLength={6}
          style={{
            height: 56,
            borderWidth: 1,
            borderColor: colors.borderDefault,
            backgroundColor: "rgba(5,4,26,0.6)",
            color: colors.textPrimary,
            fontFamily: `${fonts.mono}_700Bold`,
            fontSize: 24,
            letterSpacing: 8,
            textAlign: "center",
          }}
        />

        {error ? (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={verify}
          disabled={busy}
          style={{
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color={colors.bgBase} />
          ) : (
            <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
              Valider
            </Text>
          )}
        </Pressable>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable onPress={() => router.back()}>
            <Text variant="micro">← Changer d&apos;e-mail</Text>
          </Pressable>
          <Pressable onPress={resend}>
            <Text variant="micro" style={{ color: colors.accent }}>
              Renvoyer le code
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
