import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActionChip } from "@/components/buttons";
import { Text } from "@/components/ui";
import { Screen } from "@/components/screen";
import { requestLoginCode } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function VerifyOtp(): React.JSX.Element {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(): Promise<void> {
    // GoTrue OTP length is configurable (6 by default, 8 on some projects).
    if (!email || code.trim().length < 6) {
      setError("Entre le code complet reçu par e-mail.");
      return;
    }
    setError(null);
    setBusy(true);
    // The code comes from admin.generateLink({type:"magiclink"}), so accept both
    // verification types (GoTrue exposes it as email or magiclink depending on version).
    const token = code.trim();
    let err = (await supabase.auth.verifyOtp({ email, token, type: "email" })).error;
    if (err) {
      err = (await supabase.auth.verifyOtp({ email, token, type: "magiclink" })).error;
    }
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
    await requestLoginCode(email);
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Text variant="micro" style={{ color: colors.accent }}>
            Lien envoyé
          </Text>
          <Text variant="h1">Vérifie ta boîte mail</Text>
          <Text variant="bodySm">On a envoyé un code de connexion à {email ?? "ton adresse"}.</Text>
        </View>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 8))}
          placeholder="12345678"
          placeholderTextColor={colors.textDisabled}
          keyboardType="number-pad"
          maxLength={8}
          style={{
            height: 56,
            borderWidth: 1,
            borderColor: colors.borderDefault,
            backgroundColor: "rgba(5,4,26,0.6)",
            color: colors.textPrimary,
            fontFamily: `${fonts.mono}_700Bold`,
            fontSize: 22,
            letterSpacing: 6,
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
