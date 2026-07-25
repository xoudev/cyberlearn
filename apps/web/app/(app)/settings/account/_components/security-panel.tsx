"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mfaCodeSchema } from "@cyberlearn/types";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { initialAuthActionState } from "@/app/(auth)/_actions/auth-action-state";
import { updatePassword } from "@/app/(auth)/_actions/password-auth";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { MONO, S } from "../../_components/tokens";

interface TotpFactorSummary {
  id: string;
  friendlyName: string;
}

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
  color: "#030219",
  padding: "0 18px",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

export function SecurityPanel(): React.JSX.Element {
  const router = useRouter();
  const [factor, setFactor] = useState<TotpFactorSummary | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updatePassword,
    initialAuthActionState,
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      const active = data?.totp[0];
      setFactor(
        active
          ? {
              id: active.id,
              friendlyName: active.friendly_name ?? "Application d’authentification",
            }
          : null,
      );
    });
  }, []);

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
      friendlyName: "CyberLearn Authenticator",
    });
    setBusy(false);
    if (result.error) {
      setMessage("Impossible de démarrer l’activation du MFA.");
      return;
    }

    setEnrollment({
      factorId: result.data.id,
      qrCode: result.data.totp.qr_code,
      secret: result.data.totp.secret,
    });
  }

  async function verifyEnrollment(): Promise<void> {
    if (!enrollment) return;
    const parsed = mfaCodeSchema.safeParse(code);
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

    setFactor({ id: enrollment.factorId, friendlyName: "CyberLearn Authenticator" });
    setEnrollment(null);
    setCode("");
    setMessage("Double authentification activée.");
    router.refresh();
  }

  async function disableMfa(): Promise<void> {
    if (!factor) return;
    setBusy(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const result = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (!result.error) await supabase.auth.refreshSession();
    setBusy(false);
    if (result.error) {
      setMessage("Revalide d’abord ton code MFA, puis réessaie.");
      router.push("/mfa?next=/settings/account");
      return;
    }

    setFactor(null);
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
                  color: factor ? S.turq : S.muted,
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {factor ? "MFA ACTIF" : "MFA INACTIF"}
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
                {factor
                  ? factor.friendlyName
                  : "Protège ton compte avec Google Authenticator, 1Password, Authy ou une application compatible TOTP."}
              </p>
            </div>
            {!factor && !enrollment ? (
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
            <div
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
                  {enrollment.secret}
                </code>
              </div>
              <input
                style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: "0.3em" }}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
              />
              <button
                style={buttonStyle}
                type="button"
                disabled={busy}
                onClick={() => void verifyEnrollment()}
              >
                Vérifier et activer
              </button>
            </div>
          ) : null}

          {factor ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void disableMfa()}
              style={{
                ...buttonStyle,
                background: "transparent",
                color: S.danger,
                borderColor: S.danger,
              }}
            >
              Désactiver le MFA
            </button>
          ) : null}

          {message ? (
            <p style={{ margin: 0, color: S.fg2, fontFamily: MONO, fontSize: 11 }}>{message}</p>
          ) : null}
        </div>
      </SettingsCard>
    </>
  );
}
