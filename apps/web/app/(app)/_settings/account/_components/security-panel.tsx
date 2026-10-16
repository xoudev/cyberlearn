"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  readTotpFactors,
  removeTotpFactors,
  type TotpFactorsState,
  type TotpRemovalOutcome,
} from "@cyberlearn/lib/auth/mfa-factors";
import { groupOtpSecret } from "@cyberlearn/lib/auth/otp-code";
import { mfaCodeSchema } from "@cyberlearn/types";
import { OtpCodeInput, useOtpAutoSubmit } from "@cyberlearn/ui";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { initialAuthActionState } from "@/app/(auth)/_actions/auth-action-state";
import { updatePassword } from "@/app/(auth)/_actions/password-auth";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { MONO, S } from "../../_components/tokens";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  border: `1px solid ${S.border}`,
  background: "#080622",
  color: S.fg,
  padding: "0 13px",
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  minHeight: 44,
  border: `1px solid ${S.turq}`,
  background: S.turq,
  color: "var(--color-bg-base)",
  padding: "0 18px",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: S.fg2,
  borderColor: S.border,
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: S.danger,
  borderColor: S.danger,
};

const ENROLLED_FACTOR_NAME = "CyberLearn Authenticator";

/** Asks Supabase for the factors; a throw is a failed question like any other. */
async function fetchTotpFactors(): Promise<TotpFactorsState> {
  try {
    return readTotpFactors(await createSupabaseBrowserClient().auth.mfa.listFactors());
  } catch {
    return { status: "error" };
  }
}

/** The status line: "MFA INACTIF" only once Supabase has said there is no factor. */
function factorStatusLabel(state: TotpFactorsState): { text: string; color: string } {
  if (state.status === "loading") return { text: "VÉRIFICATION…", color: S.muted };
  if (state.status === "error") return { text: "ÉTAT INCONNU", color: S.warning };
  return state.factors.length > 0
    ? { text: "MFA ACTIF", color: S.turq }
    : { text: "MFA INACTIF", color: S.muted };
}

function factorStatusText(state: TotpFactorsState): string {
  if (state.status === "loading") return "Lecture de l’état de ta double authentification.";
  if (state.status === "error") {
    return "Impossible de vérifier l’état de la double authentification.";
  }
  const [first] = state.factors;
  if (first) return first.friendlyName ?? "Application d’authentification";
  return "Protège ton compte avec Google Authenticator, 1Password, Authy ou une application compatible TOTP.";
}

export function SecurityPanel(): React.JSX.Element {
  const router = useRouter();
  // Loading until Supabase answers: the panel used to start on "no factor",
  // and so told every protected account it was unprotected, with an enrol
  // button, until the answer came - or for good when it did not.
  const [factorsState, setFactorsState] = useState<TotpFactorsState>({ status: "loading" });
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updatePassword,
    initialAuthActionState,
  );

  useEffect(() => {
    let active = true;
    void fetchTotpFactors().then((state) => {
      if (active) setFactorsState(state);
    });
    return () => {
      active = false;
    };
  }, []);

  async function reloadFactors(): Promise<void> {
    setFactorsState({ status: "loading" });
    setFactorsState(await fetchTotpFactors());
  }

  const factors = factorsState.status === "ready" ? factorsState.factors : [];
  const status = factorStatusLabel(factorsState);

  async function startEnrollment(): Promise<void> {
    setBusy(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const factors = await supabase.auth.mfa.listFactors();
    const staleFactors = factors.data?.all.filter(
      (item) => item.factor_type === "totp" && item.status === "unverified",
    );
    for (const staleFactor of staleFactors ?? []) {
      await supabase.auth.mfa.unenroll({ factorId: staleFactor.id });
    }

    const result = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: ENROLLED_FACTOR_NAME,
    });
    setBusy(false);
    if (result.error) {
      setMessage("Impossible de démarrer l’activation du MFA.");
      return;
    }

    setCode("");
    setEnrollment({
      factorId: result.data.id,
      qrCode: result.data.totp.qr_code,
      secret: result.data.totp.secret,
    });
  }

  async function verifyEnrollment(value: string): Promise<void> {
    if (!enrollment) return;
    const parsed = mfaCodeSchema.safeParse(value);
    if (!parsed.success) {
      setMessage("Entre le code à six chiffres affiché par ton application.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const result = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: parsed.data,
    });
    setBusy(false);
    if (result.error) {
      setMessage("Code invalide ou expiré.");
      return;
    }

    setFactorsState({
      status: "ready",
      factors: [{ id: enrollment.factorId, friendlyName: ENROLLED_FACTOR_NAME }],
    });
    setEnrollment(null);
    setCode("");
    setMessage("Double authentification activée.");
    router.refresh();
  }

  // The confirmation code goes on its sixth digit, as it does at sign-in.
  // Nothing to send before the QR code is on screen: `busy` covers the wait.
  const submitEnrollmentCode = useOtpAutoSubmit({
    code,
    pending: busy || enrollment === null,
    onSubmit: (value) => {
      void verifyEnrollment(value);
    },
  });

  function openDisableConfirmation(): void {
    setDisableCode("");
    setMessage(null);
    setConfirmingDisable(true);
  }

  function closeDisableConfirmation(): void {
    setConfirmingDisable(false);
    setDisableCode("");
  }

  // Removal takes an explicit confirmation and a fresh code: one click used
  // to be enough, so a stray click, or a session in the wrong hands, took the
  // account's protection away. The code is not sent on its sixth digit, as it
  // is elsewhere: here the button is the confirmation.
  async function confirmDisable(): Promise<void> {
    if (factors.length === 0) return;
    const parsed = mfaCodeSchema.safeParse(disableCode);
    if (!parsed.success) {
      setMessage("Entre le code à six chiffres affiché par ton application.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    let outcome: TotpRemovalOutcome;
    try {
      outcome = await removeTotpFactors(
        supabase.auth.mfa,
        factors.map((factor) => factor.id),
        parsed.data,
      );
      if (outcome === "disabled") await supabase.auth.refreshSession();
    } catch {
      outcome = "failed";
    }
    setBusy(false);

    if (outcome === "invalid_code") {
      setMessage("Code invalide ou expiré.");
      return;
    }
    closeDisableConfirmation();
    if (outcome === "failed") {
      // Stay here and say so. This used to send the person to /mfa, which an
      // aal2 session leaves at once, onto the dashboard, without the message.
      // Some factors may be gone already: the panel reads them again.
      setMessage("La désactivation a échoué. Réessaie.");
      await reloadFactors();
      return;
    }

    setFactorsState({ status: "ready", factors: [] });
    setMessage("Double authentification désactivée.");
    router.refresh();
  }

  return (
    <>
      <SettingsCard title="Mot de passe">
        <form action={passwordAction} style={{ display: "grid", gap: 14 }}>
          {/* Re-authentication: without it a stolen session could change the
              password and lock the owner out permanently. */}
          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted }}>
              MOT DE PASSE ACTUEL
            </span>
            <input
              style={inputStyle}
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </label>
          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted }}>
              NOUVEAU MOT DE PASSE
            </span>
            <input
              style={inputStyle}
              type="password"
              name="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted }}>CONFIRMATION</span>
            <input
              style={inputStyle}
              type="password"
              name="passwordConfirmation"
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
          {passwordState.message ? (
            <p
              style={{
                margin: 0,
                color: passwordState.status === "error" ? S.danger : S.turq,
                fontFamily: MONO,
                fontSize: 11,
              }}
            >
              {passwordState.message}
            </p>
          ) : null}
          <button style={buttonStyle} type="submit" disabled={passwordPending}>
            {passwordPending ? "Mise à jour…" : "Changer le mot de passe"}
          </button>
        </form>
      </SettingsCard>

      <SettingsCard title="Double authentification">
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: status.color,
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {status.text}
              </div>
              <p
                style={{
                  margin: "7px 0 0",
                  color: S.muted,
                  fontFamily: MONO,
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                {factorStatusText(factorsState)}
              </p>
            </div>
            {factorsState.status === "error" ? (
              <button
                style={secondaryButtonStyle}
                type="button"
                onClick={() => {
                  setMessage(null);
                  void reloadFactors();
                }}
              >
                Réessayer
              </button>
            ) : null}
            {factorsState.status === "ready" && factors.length === 0 && !enrollment ? (
              <button
                style={buttonStyle}
                type="button"
                disabled={busy}
                onClick={() => void startEnrollment()}
              >
                Activer
              </button>
            ) : null}
          </div>

          {enrollment ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitEnrollmentCode(code);
              }}
              style={{
                display: "grid",
                gap: 14,
                padding: 18,
                background: "#080622",
                border: `1px solid ${S.border}`,
              }}
            >
              {/* Scanners need dark modules on a light backdrop plus a quiet
                  zone; the Supabase SVG has neither on our dark panel. */}
              <div style={{ width: "fit-content", padding: 14, background: "#ffffff" }}>
                <Image
                  src={enrollment.qrCode}
                  alt="QR code MFA"
                  width={196}
                  height={196}
                  unoptimized
                />
              </div>
              <div>
                <div style={{ color: S.muted, fontFamily: MONO, fontSize: 10, marginBottom: 7 }}>
                  CLÉ MANUELLE
                </div>
                <code
                  style={{ color: S.fg, fontFamily: MONO, fontSize: 12, overflowWrap: "anywhere" }}
                >
                  {groupOtpSecret(enrollment.secret)}
                </code>
              </div>
              <OtpCodeInput
                label="CODE DE CONFIRMATION"
                value={code}
                onValueChange={setCode}
                placeholder="000000"
                style={{ display: "grid", gap: 7 }}
                labelStyle={{ fontFamily: MONO, fontSize: 10, color: S.muted }}
                inputStyle={{
                  ...inputStyle,
                  textAlign: "center",
                  fontSize: 20,
                  letterSpacing: "0.3em",
                }}
              />
              <button style={buttonStyle} type="submit" disabled={busy}>
                Vérifier et activer
              </button>
            </form>
          ) : null}

          {factors.length > 0 && !confirmingDisable ? (
            <button
              type="button"
              disabled={busy}
              onClick={openDisableConfirmation}
              style={dangerButtonStyle}
            >
              Désactiver le MFA
            </button>
          ) : null}

          {factors.length > 0 && confirmingDisable ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void confirmDisable();
              }}
              style={{
                display: "grid",
                gap: 14,
                padding: 18,
                background: "#080622",
                border: `1px solid ${S.danger}`,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: S.fg2,
                  fontFamily: MONO,
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                Sans second facteur, ton mot de passe suffira pour entrer dans ton compte. Pour
                confirmer, entre le code affiché par ton application d’authentification.
              </p>
              <OtpCodeInput
                label="CODE ACTUEL"
                value={disableCode}
                onValueChange={setDisableCode}
                placeholder="000000"
                style={{ display: "grid", gap: 7 }}
                labelStyle={{ fontFamily: MONO, fontSize: 10, color: S.muted }}
                inputStyle={{
                  ...inputStyle,
                  textAlign: "center",
                  fontSize: 20,
                  letterSpacing: "0.3em",
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button style={dangerButtonStyle} type="submit" disabled={busy}>
                  {busy ? "Vérification…" : "Confirmer la désactivation"}
                </button>
                <button
                  style={secondaryButtonStyle}
                  type="button"
                  disabled={busy}
                  onClick={closeDisableConfirmation}
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : null}

          {message ? (
            <p style={{ margin: 0, color: S.fg2, fontFamily: MONO, fontSize: 11 }}>{message}</p>
          ) : null}
        </div>
      </SettingsCard>
    </>
  );
}
