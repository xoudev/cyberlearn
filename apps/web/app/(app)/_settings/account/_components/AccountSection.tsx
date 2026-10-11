import type React from "react";
import type { AccountSectionData } from "../../_lib/settings-data";
import { SectionHead, SettingsCard } from "../../_components/SettingsPrimitives";
import { MONO, S } from "../../_components/tokens";
import { SecurityPanel } from "./security-panel";

/** The account section, in the settings drawer. */
export function AccountSection({ data }: { data: AccountSectionData }): React.JSX.Element {
  // A pending address is something to act on; it used to wear the same
  // turquoise as a verified one, which read as "all good" either way.
  const badgeColor = data.emailConfirmed ? S.turq : S.warning;
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
              border: `1px solid ${badgeColor}`,
              color: badgeColor,
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
