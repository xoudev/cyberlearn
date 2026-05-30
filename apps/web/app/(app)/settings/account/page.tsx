import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { SectionHead, SettingsCard } from "../_components/SettingsPrimitives";
import { MONO, S } from "../_components/tokens";

export const metadata: Metadata = { title: "Compte" };

// Cyber Learn auth is passwordless (Supabase Magic Link + GitHub OAuth), so the
// account section is read-only: there is no password or 2FA to manage.
const PROVIDER_LABELS: Record<string, string> = {
  email: "Lien magique (email)",
  github: "GitHub OAuth",
};

function AccountRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 0",
        borderBottom: last ? "none" : `1px solid ${S.borderSoft}`,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: S.muted,
            marginBottom: 5,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 14,
            color: S.fg,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function AccountSettingsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();

  const email = user.email ?? "—";
  const verified = Boolean(user.email_confirmed_at);
  const providers = [...new Set((user.identities ?? []).map((i) => i.provider))];
  const methodLabel =
    providers.length > 0
      ? providers.map((p) => PROVIDER_LABELS[p] ?? p).join(" · ")
      : "Lien magique (email)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="COMPTE" hint="email & connexion" />
      <SettingsCard title="Connexion">
        <AccountRow label="Email">
          {email}
          {verified ? (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: S.turq,
                border: "1px solid rgba(10,255,212,0.4)",
                padding: "2px 6px",
              }}
            >
              VÉRIFIÉ
            </span>
          ) : null}
        </AccountRow>

        <AccountRow label="Méthode de connexion" last>
          {methodLabel}
        </AccountRow>

        <p
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px dashed ${S.borderSoft}`,
            fontFamily: MONO,
            fontSize: 12,
            lineHeight: 1.6,
            color: S.muted,
          }}
        >
          Ton compte utilise une authentification{" "}
          <span style={{ color: S.fg2 }}>sans mot de passe</span>. Chaque connexion génère un lien à
          usage unique — il n&apos;y a ni mot de passe ni double authentification à gérer.
        </p>
      </SettingsCard>
    </div>
  );
}
