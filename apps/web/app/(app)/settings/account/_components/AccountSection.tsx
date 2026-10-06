import type React from "react";
import type { AccountSectionData } from "../../_lib/settings-data";
import { SectionHead, SettingsCard } from "../../_components/SettingsPrimitives";
import { MONO, S } from "../../_components/tokens";
import { SecurityPanel } from "./security-panel";

/** The account section, on its page and in the drawer. */
export function AccountSection({ data }: { data: AccountSectionData }): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="COMPTE" hint="identité & sécurité" />
      <SettingsCard title="Identité de connexion">
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: "0.12em" }}>
            ADRESSE E-MAIL
          </span>
          <span style={{ fontFamily: MONO, fontSize: 14, color: S.fg }}>{data.email ?? "-"}</span>
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
            {data.emailConfirmed ? "E-MAIL VÉRIFIÉ" : "VÉRIFICATION EN ATTENTE"}
          </span>
        </div>
      </SettingsCard>
      <SecurityPanel />
    </div>
  );
}
