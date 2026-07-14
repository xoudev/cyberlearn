"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mfaCodeSchema } from "@cyberlearn/types";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import styles from "../../auth.module.css";

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
    <div className={styles.form}>
      {enrollment ? (
        <div className={styles.qr}>
          <Image
            src={enrollment.qrCode}
            alt="QR code MFA administrateur"
            width={196}
            height={196}
            unoptimized
          />
          <span className={styles.secret}>{enrollment.secret}</span>
        </div>
      ) : null}
      <input
        className={[styles.input, styles.code].join(" ")}
        value={code}
        onChange={(event) => {
          setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      <button
        className={styles.button}
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
