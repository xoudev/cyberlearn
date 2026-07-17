"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mfaCodeSchema } from "@cyberlearn/types";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function AdminMfaSetup(): React.JSX.Element {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const factors = await supabase.auth.mfa.listFactors();
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
        setError("Impossible de préparer le facteur MFA.");
        return;
      }
      setEnrollment({
        factorId: result.data.id,
        qrCode: result.data.totp.qr_code,
        secret: result.data.totp.secret,
      });
    })();
  }, []);

  async function verify(): Promise<void> {
    if (!enrollment) return;
    const parsed = mfaCodeSchema.safeParse(code);
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
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="a-auth-form">
      {enrollment ? (
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
          <span className="a-qr-secret">{enrollment.secret}</span>
        </div>
      ) : null}
      <input
        className="a-input a-input--code"
        value={code}
        onChange={(event) => {
          setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
      />
      {error ? <p className="a-form-error">{error}</p> : null}
      <button
        className="a-btn a-btn--primary"
        type="button"
        disabled={pending || !enrollment}
        onClick={() => {
          void verify();
        }}
      >
        {pending ? "Activation…" : "Activer et continuer"}
      </button>
    </div>
  );
}
