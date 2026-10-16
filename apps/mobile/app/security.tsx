import {
  removeTotpFactors,
  type TotpFactorsState,
  type TotpRemovalOutcome,
} from "@cyberlearn/lib/auth/mfa-factors";
import {
  createOtpAutoSubmit,
  groupOtpSecret,
  sanitizeOtpCode,
} from "@cyberlearn/lib/auth/otp-code";
import { mfaCodeSchema, passwordUpdateSchema } from "@cyberlearn/types";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { AuthError, AuthField, AuthNotice } from "@/components/auth-form";
import { BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { Card, SectionLabel, Text } from "@/components/ui";
import { fetchMfaRemovalApi, updatePasswordApi } from "@/lib/api";
import { loadTotpPanel, readTotpQrSvg } from "@/lib/mfa";
import { supabase } from "@/lib/supabase";

interface PendingTotp {
  factorId: string;
  qrSvg: string;
  secret: string;
}

export default function Security(): React.JSX.Element {
  // Read as on the site (@cyberlearn/lib/auth/mfa-factors): a failed read is
  // "unknown", not "disabled", so it offers no enrolment over a live factor.
  const [factorsState, setFactorsState] = useState<TotpFactorsState>({ status: "loading" });
  // False for an administrator, as on the site, and until the server says.
  const [canDisable, setCanDisable] = useState(false);
  const [pendingTotp, setPendingTotp] = useState<PendingTotp | null>(null);
  const [code, setCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaNotice, setMfaNotice] = useState<string | null>(null);
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  // The confirmation code goes on its sixth digit, once, as at sign-in.
  const [gate] = useState(createOtpAutoSubmit);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const loadFactor = useCallback(async (): Promise<void> => {
    setFactorsState({ status: "loading" });
    const panel = await loadTotpPanel({
      listFactors: () => supabase.auth.mfa.listFactors(),
      fetchCanDisable: fetchMfaRemovalApi,
    });
    setCanDisable(panel.canDisable);
    setFactorsState(panel.factors);
  }, []);

  const factorIds = factorsState.status === "ready" ? factorsState.factors.map((f) => f.id) : [];

  useEffect(() => {
    void loadFactor();
  }, [loadFactor]);

  async function beginEnrollment(): Promise<void> {
    setMfaBusy(true);
    setMfaError(null);
    setMfaNotice(null);

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setMfaBusy(false);
      setMfaError("Impossible de vérifier les facteurs existants.");
      return;
    }
    const staleFactors = factors?.all.filter(
      (factor) => factor.factor_type === "totp" && factor.status === "unverified",
    );
    for (const factor of staleFactors ?? []) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) {
        setMfaBusy(false);
        setMfaError("Impossible de nettoyer une configuration MFA incomplète.");
        return;
      }
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
    const qrSvg = readTotpQrSvg(data.totp.qr_code);
    if (!qrSvg) {
      await supabase.auth.mfa.unenroll({ factorId: data.id });
      setMfaError("Le QR code de double authentification est invalide.");
      return;
    }
    // A new factor: a code refused for the last one may be right for this one.
    gate.reset();
    setPendingTotp({ factorId: data.id, qrSvg, secret: data.totp.secret });
  }

  const verifyEnrollment = useCallback(
    async (value: string): Promise<void> => {
      const result = mfaCodeSchema.safeParse(value);
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
    },
    [loadFactor, pendingTotp],
  );

  useEffect(() => {
    if (gate.shouldSubmit(code, mfaBusy || pendingTotp === null)) void verifyEnrollment(code);
  }, [code, gate, mfaBusy, pendingTotp, verifyEnrollment]);

  function submitEnrollmentByHand(): void {
    gate.markSubmitted(code);
    void verifyEnrollment(code);
  }

  function openDisableConfirmation(): void {
    setDisableCode("");
    setMfaError(null);
    setMfaNotice(null);
    setConfirmingDisable(true);
  }

  function closeDisableConfirmation(): void {
    setConfirmingDisable(false);
    setDisableCode("");
  }

  // Removal takes an explicit confirmation and a fresh code, as on the site:
  // one touch used to remove every factor. The button is the confirmation,
  // so the code does not go on its sixth digit here.
  async function confirmDisable(): Promise<void> {
    if (factorIds.length === 0 || !canDisable) return;
    const result = mfaCodeSchema.safeParse(disableCode);
    if (!result.success) {
      setMfaError("Entre le code à 6 chiffres affiché dans ton application.");
      return;
    }

    setMfaBusy(true);
    setMfaError(null);
    let outcome: TotpRemovalOutcome;
    try {
      outcome = await removeTotpFactors(supabase.auth.mfa, factorIds, result.data);
    } catch {
      outcome = "failed";
    }
    setMfaBusy(false);

    if (outcome === "invalid_code") {
      setMfaError("Code incorrect ou expiré.");
      return;
    }
    closeDisableConfirmation();
    if (outcome === "failed") {
      setMfaError("Impossible de désactiver la double authentification.");
      await loadFactor();
      return;
    }
    setFactorsState({ status: "ready", factors: [] });
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
    const response = await updatePasswordApi({
      currentPassword,
      password: result.data.password,
      passwordConfirmation: result.data.passwordConfirmation,
    });
    setPasswordBusy(false);
    if (!response.ok) {
      setPasswordError(response.error ?? "Impossible de modifier le mot de passe.");
      return;
    }
    setCurrentPassword("");
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
          <Text
            variant="micro"
            style={{
              color:
                factorsState.status === "error"
                  ? colors.warning
                  : factorIds.length > 0
                    ? colors.accent
                    : colors.textMuted,
            }}
          >
            {factorsState.status === "loading"
              ? "Vérification"
              : factorsState.status === "error"
                ? "Inconnue"
                : factorIds.length > 0
                  ? "Activée"
                  : "Désactivée"}
          </Text>
        </View>
        <Text variant="bodySm">
          Un code temporaire sera demandé après ton mot de passe sur le site et l’application.
        </Text>

        {pendingTotp ? (
          <View style={styles.enrollment}>
            <View style={styles.qrSurface}>
              <SvgXml xml={pendingTotp.qrSvg} width={190} height={190} />
            </View>
            <Text variant="bodySm" style={styles.centeredText}>
              Scanne ce QR code avec Aegis, 2FAS, Google Authenticator ou une application
              compatible.
            </Text>
            <View style={styles.secretBox}>
              <Text variant="micro">Clé manuelle</Text>
              <Text selectable style={styles.secret}>
                {groupOtpSecret(pendingTotp.secret)}
              </Text>
            </View>
            <AuthField
              label="Code de confirmation"
              value={code}
              // No maxLength: it would cut a pasted "123 456" before the
              // separators are dropped.
              onChangeText={(value) => setCode(sanitizeOtpCode(value))}
              placeholder="000000"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              // No autoFocus: the QR code cannot be scanned from its own
              // screen, and a keyboard opening at once would cover the
              // manual key just above, which has to be read or copied first.
              onSubmitEditing={submitEnrollmentByHand}
            />
            <GradientButton
              label="Activer le MFA"
              onPress={submitEnrollmentByHand}
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
        ) : factorIds.length > 0 && canDisable && confirmingDisable ? (
          <View style={styles.enrollment}>
            <Text variant="bodySm">
              Sans second facteur, ton mot de passe suffira pour entrer dans ton compte. Pour
              confirmer, entre le code affiché par ton application d’authentification.
            </Text>
            <AuthField
              label="Code actuel"
              value={disableCode}
              onChangeText={(value) => setDisableCode(sanitizeOtpCode(value))}
              placeholder="000000"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              autoFocus
              onSubmitEditing={() => void confirmDisable()}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void confirmDisable()}
              disabled={mfaBusy}
              style={styles.dangerAction}
            >
              <Text variant="micro" style={{ color: colors.danger }}>
                {mfaBusy ? "Vérification…" : "Confirmer la désactivation"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={closeDisableConfirmation}
              disabled={mfaBusy}
              style={styles.secondaryAction}
            >
              <Text variant="micro">Annuler</Text>
            </Pressable>
          </View>
        ) : factorIds.length > 0 && canDisable ? (
          <Pressable
            accessibilityRole="button"
            onPress={openDisableConfirmation}
            disabled={mfaBusy}
            style={styles.dangerAction}
          >
            <Text variant="micro" style={{ color: colors.danger }}>
              Désactiver le MFA
            </Text>
          </Pressable>
        ) : factorIds.length > 0 ? (
          <Text variant="bodySm">
            Compte administrateur : ta double authentification protège aussi la console et ne se
            désactive pas depuis l’app. Si tu perds ton application d’authentification, suis la
            procédure de secours décrite dans docs/authentication.md.
          </Text>
        ) : factorsState.status === "error" ? (
          <>
            <Text variant="bodySm">
              Impossible de vérifier l’état de la double authentification.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadFactor()}
              style={styles.secondaryAction}
            >
              <Text variant="micro">Réessayer</Text>
            </Pressable>
          </>
        ) : (
          <GradientButton
            label="Configurer le MFA"
            onPress={() => void beginEnrollment()}
            loading={mfaBusy}
            disabled={factorsState.status === "loading"}
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
          label="Mot de passe actuel"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Confirme ton identité"
          autoCapitalize="none"
          autoComplete="current-password"
          secure
        />
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
