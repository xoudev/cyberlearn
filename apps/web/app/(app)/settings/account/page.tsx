import type React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { SectionHead, SettingsCard } from "../_components/SettingsPrimitives";
import { MONO, S } from "../_components/tokens";
import { SecurityPanel } from "./_components/security-panel";

export const metadata: Metadata = { title: "Compte et sécurité" };

export default async function AccountSettingsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="COMPTE" hint="identité & sécurité" />
      <SettingsCard title="Identité de connexion">
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: "0.12em" }}>
            ADRESSE E-MAIL
          </span>
          <span style={{ fontFamily: MONO, fontSize: 14, color: S.fg }}>{user.email ?? "-"}</span>
          <span
            style={{
              width: "fit-content",
              marginTop: 5,
              padding: "3px 7px",
              border: `1px solid ${S.turq}`,
              color: S.turq,
              fontFamily: MONO,
              fontSize: 9,
            }}
          >
            {user.email_confirmed_at ? "E-MAIL VÉRIFIÉ" : "VÉRIFICATION EN ATTENTE"}
          </span>
        </div>
      </SettingsCard>
      <SecurityPanel />
    </div>
  );
}
