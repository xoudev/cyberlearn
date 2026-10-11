"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { groupOtpSecret } from "@cyberlearn/lib/auth/otp-code";
import { mfaCodeSchema } from "@cyberlearn/types";
import { OtpCodeInput, useOtpAutoSubmit } from "@cyberlearn/ui";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { CancelSignIn } from "../cancel-sign-in";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/** Copies the secret and says so for two seconds. */
function useCopied(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const copy = useCallback((text: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch(() => {
        // No clipboard here: the key stays on screen to be typed.
      });
  }, []);
  return { copied, copy };
}

export function AdminMfaSetup({
  next,
}: {
  /** Already checked by the page: a console path, or the dashboard. */
  next: string;
}): React.JSX.Element {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [pending, setPending] = useState(false);
  const { copied, copy } = useCopied();

  // Started by a click rather than on mount. An effect runs twice in
  // development (StrictMode), and two enrolments racing under the same name
  // left one of them failing with an "Impossible de préparer" flash; the
  // button is disabled while one is in flight, so there is only ever one.
  async function start(): Promise<void> {
    setStarting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const factors = await supabase.auth.mfa.listFactors();
      // A QR code shown earlier and never confirmed holds the factor's name.
      for (const staleFactor of factors.data?.all.filter(
        (factor) => factor.status === "unverified",
      ) ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: staleFactor.id });
      }
      const result = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "CyberLearn Admin",
      });
      if (result.error) {
        setError("Impossible de préparer le facteur MFA. Réessaie.");
        return;
      }
      setCode("");
      setEnrollment({
        factorId: result.data.id,
        qrCode: result.data.totp.qr_code,
        secret: result.data.totp.secret,
      });
    } catch {
      setError("Impossible de préparer le facteur MFA. Réessaie.");
    } finally {
      setStarting(false);
    }
  }

  const verify = useCallback(
    async (value: string): Promise<void> => {
      if (!enrollment) return;
      const parsed = mfaCodeSchema.safeParse(value);
      if (!parsed.success) {
        setError("Code à six chiffres requis.");
        return;
      }
      setPending(true);
      setError(null);
      const supabase = createSupabaseBrowserClient();
      const result = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: parsed.data,
      });
      if (result.error) {
        setError("Code invalide ou expiré.");
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
    },
    [enrollment, next, router],
  );

  // The first code from the app goes on its sixth digit; nothing is sent
  // before the QR code is on screen.
  const submit = useOtpAutoSubmit({
    code,
    pending: pending || enrollment === null,
    onSubmit: (value) => {
      void verify(value);
    },
  });

  if (!enrollment) {
    return (
      <div className="a-auth-form">
        <p className="a-form-notice">
          Garde ton téléphone à portée de main : un QR code va s’afficher, à scanner avec ton
          application d’authentification.
        </p>
        {error ? <p className="a-form-error">{error}</p> : null}
        <button
          className="a-btn a-btn--primary"
          type="button"
          disabled={starting}
          onClick={() => {
            void start();
          }}
        >
          {starting ? "Préparation…" : "Afficher le QR code"}
        </button>
        <CancelSignIn />
      </div>
    );
  }

  return (
    <form
      className="a-auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
    >
      <div className="a-qr">
        {/* Scanners need dark modules on a light backdrop plus a quiet
            zone; the Supabase SVG has neither on our dark panel. */}
        <span className="a-qr-canvas">
          <Image
            src={enrollment.qrCode}
            alt="QR code MFA administrateur"
            width={196}
            height={196}
            unoptimized
          />
        </span>
        <span className="a-qr-key">
          <code className="a-qr-secret" aria-label="Clé à saisir à la main">
            {groupOtpSecret(enrollment.secret)}
          </code>
          <button
            className="a-btn a-btn--ghost a-btn--sm"
            type="button"
            onClick={() => {
              copy(enrollment.secret);
            }}
          >
            {copied ? "Copiée" : "Copier"}
          </button>
        </span>
      </div>
      <OtpCodeInput
        label="Code affiché par l’application"
        value={code}
        onValueChange={setCode}
        placeholder="000000"
        className="a-field"
        labelClassName="a-label"
        inputClassName="a-input a-input--code"
      />
      {error ? <p className="a-form-error">{error}</p> : null}
      <button className="a-btn a-btn--primary" type="submit" disabled={pending}>
        {pending ? "Activation…" : "Activer et continuer"}
      </button>
      <CancelSignIn />
    </form>
  );
}
