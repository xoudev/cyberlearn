import { passwordUpdateSchema } from "@cyberlearn/types";
import { useQueryClient } from "@tanstack/react-query";
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
import { resetPasswordApi } from "@/lib/api";
import { RECOVERY_COPY, clearRecoveryPending } from "@/lib/recovery";
import { supabase } from "@/lib/supabase";

/**
 * The site's /reset-password in the app: reached from the recovery code (see
 * forgot-password), in the session that code opened. The server takes the new
 * password without the old one for 15 minutes in that session only; past that,
 * the code has to be asked for again.
 */
export default function ResetPassword(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(): Promise<void> {
    const parsed = passwordUpdateSchema.safeParse({ password, passwordConfirmation });
    if (!parsed.success) {
      setError(RECOVERY_COPY.rules);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await resetPasswordApi(parsed.data);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.expired === true ? RECOVERY_COPY.expired : (result.error ?? RECOVERY_COPY.rules),
      );
      return;
    }
    clearRecoveryPending();
    setSaved(true);
    await queryClient.invalidateQueries();
    router.replace("/home");
  }

  async function cancel(): Promise<void> {
    clearRecoveryPending();
    await supabase.auth.signOut();
  }

  return (
    <AuthFormScreen
      eyebrow="Récupération"
      title={RECOVERY_COPY.resetTitle}
      description={RECOVERY_COPY.resetDescription}
    >
      <AuthField
        label="Nouveau mot de passe"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError(null);
        }}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <AuthField
        label="Confirmation"
        value={passwordConfirmation}
        onChangeText={(value) => {
          setPasswordConfirmation(value);
          setError(null);
        }}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => void save()}
      />
      <AuthError message={error} />
      <AuthNotice message={saved ? RECOVERY_COPY.saved : null} />
      <GradientButton label="Enregistrer" onPress={() => void save()} loading={busy} />
      <AuthTextLink label="Annuler et se déconnecter" onPress={() => void cancel()} />
    </AuthFormScreen>
  );
}
