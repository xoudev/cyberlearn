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
import { MONO, S, SANS } from "../../_components/tokens";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

// The two messages that say something went right. Every other message of the
// panel says something failed, and is announced as an alert: the code leaves on
// its sixth digit with no click, so a refusal that is only drawn is never
// heard by somebody using a screen reader.
const ENABLED_MESSAGE = "Double authentification activée.";
const DISABLED_MESSAGE = "Double authentification désactivée.";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  border: `1px solid ${S.borderStrong}`,
  background: S.base,
  color: S.fg,
  padding: "0 13px",
  fontFamily: SANS,
  fontSize: 14,
};

/** A six-digit code: the monospace, spaced so each digit reads on its own. */
const codeInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: MONO,
  textAlign: "center",
  fontSize: 20,
  letterSpacing: "0.3em",
};

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: 500,
  color: S.fg2,
};

const noteStyle: React.CSSProperties = {
  margin: 0,
  color: S.fg2,
  fontFamily: SANS,
  fontSize: 13,
  lineHeight: 1.6,
};

const buttonStyle: React.CSSProperties = {
  minHeight: 44,
  border: `1px solid ${S.accent}`,
  background: S.accent,
  color: S.onAccent,
  padding: "0 18px",
  cursor: "pointer",
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: S.fg2,
  borderColor: S.borderStrong,
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

/** The status line: "MFA inactif" only once Supabase has said there is no factor. */
function factorStatusLabel(state: TotpFactorsState): { text: string; color: string } {
  if (state.status === "loading") return { text: "Vérification…", color: S.muted };
  if (state.status === "error") return { text: "État inconnu", color: S.warning };
  return state.factors.length > 0
    ? { text: "MFA actif", color: S.success }
    : { text: "MFA inactif", color: S.muted };
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

/**
 * `canDisableMfa` is false for an administrator (the role is read on the
 * server, apps/web/lib/auth/mfa-removal.ts): the panel then offers no removal
 * of the second factor and points to the break-glass procedure instead.
 */
export function SecurityPanel({ canDisableMfa }: { canDisableMfa: boolean }): React.JSX.Element {
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
  const offerDisable = canDisableMfa && factors.length > 0;

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
    setMessage(ENABLED_MESSAGE);
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
  // to be enough, so a stray click took the account's protection away. The
  // code is checked here, in the browser: it does not stop a stolen session,
  // which can ask Supabase directly (see removeTotpFactors). The code is not
  // sent on its sixth digit, as it is elsewhere: here the button is the
  // confirmation.
  async function confirmDisable(): Promise<void> {
    if (!offerDisable) return;
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
    setMessage(DISABLED_MESSAGE);
    router.refresh();
  }

  return (
    <>
      <SettingsCard title="Mot de passe">
        <form action={passwordAction} style={{ display: "grid", gap: 14 }}>
          {/* Re-authentication: without it a stolen session could change the
              password and lock the owner out permanently. */}
          <label style={{ display: "grid", gap: 7 }}>
            <span style={fieldLabelStyle}>Mot de passe actuel</span>
            <input
              style={inputStyle}
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </label>
          <label style={{ display: "grid", gap: 7 }}>
            <span style={fieldLabelStyle}>Nouveau mot de passe</span>
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
            <span style={fieldLabelStyle}>Confirmation</span>
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
                ...noteStyle,
                color: passwordState.status === "error" ? S.danger : S.success,
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
                  fontFamily: SANS,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {status.text}
              </div>
              <p style={{ ...noteStyle, margin: "7px 0 0", color: S.muted }}>
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
                background: S.panel,
                border: `1px solid ${S.borderSoft}`,
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
                <div style={{ ...fieldLabelStyle, marginBottom: 7 }}>Clé manuelle</div>
                <code
                  style={{ color: S.fg, fontFamily: MONO, fontSize: 13, overflowWrap: "anywhere" }}
                >
                  {groupOtpSecret(enrollment.secret)}
                </code>
              </div>
              <OtpCodeInput
                label="Code de confirmation"
                value={code}
                onValueChange={setCode}
                placeholder="000000"
                style={{ display: "grid", gap: 7 }}
                labelStyle={fieldLabelStyle}
                inputStyle={codeInputStyle}
              />
              <button style={buttonStyle} type="submit" disabled={busy}>
                Vérifier et activer
              </button>
            </form>
          ) : null}

          {factors.length > 0 && !canDisableMfa ? (
            <p style={noteStyle}>
              Compte administrateur : ta double authentification protège aussi la console et ne se
              désactive pas ici. Si tu perds ton application d’authentification, suis la procédure
              de secours décrite dans docs/authentication.md.
            </p>
          ) : null}

          {offerDisable && !confirmingDisable ? (
            <button
              type="button"
              disabled={busy}
              onClick={openDisableConfirmation}
              style={dangerButtonStyle}
            >
              Désactiver le MFA
            </button>
          ) : null}

          {offerDisable && confirmingDisable ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void confirmDisable();
              }}
              style={{
                display: "grid",
                gap: 14,
                padding: 18,
                background: S.panel,
                border: `1px solid ${S.danger}`,
              }}
            >
              <p style={noteStyle}>
                Sans second facteur, ton mot de passe suffira pour entrer dans ton compte. Pour
                confirmer, entre le code affiché par ton application d’authentification.
              </p>
              <OtpCodeInput
                label="Code actuel"
                value={disableCode}
                onValueChange={setDisableCode}
                placeholder="000000"
                style={{ display: "grid", gap: 7 }}
                labelStyle={fieldLabelStyle}
                inputStyle={codeInputStyle}
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
            <p
              role={
                message === ENABLED_MESSAGE || message === DISABLED_MESSAGE ? "status" : "alert"
              }
              style={noteStyle}
            >
              {message}
            </p>
          ) : null}
        </div>
      </SettingsCard>
    </>
  );
}
