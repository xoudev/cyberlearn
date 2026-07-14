import { mfaCodeSchema, passwordUpdateSchema } from "@cyberlearn/types";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { AuthError, AuthField, AuthNotice } from "@/components/auth-form";
import { BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { Card, SectionLabel, Text } from "@/components/ui";
import { supabase } from "@/lib/supabase";

interface PendingTotp {
  factorId: string;
  qrCode: string;
  secret: string;
}

export default function Security(): React.JSX.Element {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [factorLoading, setFactorLoading] = useState(true);
  const [pendingTotp, setPendingTotp] = useState<PendingTotp | null>(null);
  const [code, setCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaNotice, setMfaNotice] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const loadFactor = useCallback(async (): Promise<void> => {
    setFactorLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactorId(data?.totp[0]?.id ?? null);
    setFactorLoading(false);
  }, []);

  useEffect(() => {
    void loadFactor();
  }, [loadFactor]);

  async function beginEnrollment(): Promise<void> {
    setMfaBusy(true);
    setMfaError(null);
    setMfaNotice(null);

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const staleFactors = factors?.all.filter(
      (factor) => factor.factor_type === "totp" && factor.status === "unverified",
    );
    for (const factor of staleFactors ?? []) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "CyberLearn Mobile",
    });
    setMfaBusy(false);

    if (error) {
      setMfaError("Impossible de préparer la double authentification.");
      return;
    }
    setPendingTotp({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyEnrollment(): Promise<void> {
    const result = mfaCodeSchema.safeParse(code);
    if (!result.success || !pendingTotp) {
      setMfaError("Entre le code à 6 chiffres affiché dans ton application.");
      return;
    }

    setMfaBusy(true);
    setMfaError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pendingTotp.factorId,
      code: result.data,
    });
    setMfaBusy(false);

    if (error) {
      setMfaError("Code incorrect ou expiré.");
      return;
    }

    setCode("");
    setPendingTotp(null);
    setMfaNotice("Double authentification activée sur ton compte.");
    await loadFactor();
  }

  async function disableMfa(): Promise<void> {
    if (!factorId) return;
    setMfaBusy(true);
    setMfaError(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaBusy(false);
    if (error) {
      setMfaError("Impossible de désactiver la double authentification.");
      return;
    }
    setFactorId(null);
    setMfaNotice("Double authentification désactivée.");
  }

  async function updatePassword(): Promise<void> {
    const result = passwordUpdateSchema.safeParse({ password, passwordConfirmation });
    if (!result.success) {
      setPasswordError(
        "Utilise au moins 12 caractères avec une lettre et un chiffre, puis confirme le même mot de passe.",
      );
      return;
    }

    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordNotice(null);
    const { error } = await supabase.auth.updateUser({ password: result.data.password });
    setPasswordBusy(false);
    if (error) {
      setPasswordError("Impossible de modifier le mot de passe.");
      return;
    }
    setPassword("");
    setPasswordConfirmation("");
    setPasswordNotice("Mot de passe mis à jour.");
  }

  return (
    <Screen>
      <View style={styles.backButton}>
        <BackButton />
      </View>
      <SectionLabel eyebrow="Compte" title="Sécurité" />

      <Card style={styles.card}>
        <View style={styles.sectionHeading}>
          <Text variant="h3">Double authentification</Text>
          <Text variant="micro" style={{ color: factorId ? colors.accent : colors.textMuted }}>
            {factorLoading ? "Vérification" : factorId ? "Activée" : "Désactivée"}
          </Text>
        </View>
        <Text variant="bodySm">
          Un code temporaire sera demandé après ton mot de passe sur le site et l’application.
        </Text>

        {pendingTotp ? (
          <View style={styles.enrollment}>
            <View style={styles.qrSurface}>
              <SvgXml xml={pendingTotp.qrCode} width={190} height={190} />
            </View>
            <Text variant="bodySm" style={styles.centeredText}>
              Scanne ce QR code avec Aegis, 2FAS, Google Authenticator ou une application
              compatible.
            </Text>
            <View style={styles.secretBox}>
              <Text variant="micro">Clé manuelle</Text>
              <Text selectable style={styles.secret}>
                {pendingTotp.secret}
              </Text>
            </View>
            <AuthField
              label="Code de confirmation"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              onSubmitEditing={() => void verifyEnrollment()}
            />
            <GradientButton
              label="Activer le MFA"
              onPress={() => void verifyEnrollment()}
              loading={mfaBusy}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPendingTotp(null);
                setCode("");
              }}
              style={styles.secondaryAction}
            >
              <Text variant="micro">Annuler</Text>
            </Pressable>
          </View>
        ) : factorId ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void disableMfa()}
            disabled={mfaBusy}
            style={styles.dangerAction}
          >
            <Text variant="micro" style={{ color: colors.danger }}>
              Désactiver le MFA
            </Text>
          </Pressable>
        ) : (
          <GradientButton
            label="Configurer le MFA"
            onPress={() => void beginEnrollment()}
            loading={mfaBusy}
            disabled={factorLoading}
          />
        )}
        <AuthError message={mfaError} />
        <AuthNotice message={mfaNotice} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionHeading}>
          <Text variant="h3">Mot de passe</Text>
          <Text variant="micro">12+ caractères</Text>
        </View>
        <AuthField
          label="Nouveau mot de passe"
          value={password}
          onChangeText={setPassword}
          placeholder="Une lettre et un chiffre minimum"
          autoCapitalize="none"
          autoComplete="new-password"
          secure
        />
        <AuthField
          label="Confirmer le mot de passe"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          placeholder="Répète le mot de passe"
          autoCapitalize="none"
          autoComplete="new-password"
          secure
          onSubmitEditing={() => void updatePassword()}
        />
        <GradientButton
          label="Modifier le mot de passe"
          onPress={() => void updatePassword()}
          loading={passwordBusy}
        />
        <AuthError message={passwordError} />
        <AuthNotice message={passwordNotice} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: { marginBottom: 16 },
  card: { gap: 16, marginBottom: 18 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  enrollment: { gap: 16 },
  qrSurface: { alignSelf: "center", backgroundColor: "white", padding: 10 },
  centeredText: { textAlign: "center" },
  secretBox: { gap: 7, borderWidth: 1, borderColor: colors.borderDefault, padding: 12 },
  secret: {
    color: colors.textPrimary,
    fontFamily: `${fonts.mono}_500Medium`,
    fontSize: 12,
    letterSpacing: 1,
  },
  secondaryAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  dangerAction: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,77,109,0.5)",
  },
});
