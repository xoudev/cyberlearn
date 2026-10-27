import type React from "react";
import type { AccountSectionData } from "../../_lib/settings-data";
import { SectionHead, SettingsCard } from "../../_components/SettingsPrimitives";
import { S, SANS } from "../../_components/tokens";
import { SecurityPanel } from "./security-panel";

/** The account section, in the settings drawer. */
export function AccountSection({ data }: { data: AccountSectionData }): React.JSX.Element {
  // A pending address is something to act on; it used to wear the same
  // colour as a verified one, which read as "all good" either way.
  const badgeColor = data.emailConfirmed ? S.success : S.warning;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="Compte" hint="identité & sécurité" />
      <SettingsCard title="Identité de connexion">
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: S.fg2 }}>
            Adresse e-mail
          </span>
          <span style={{ fontFamily: SANS, fontSize: 15, color: S.fg, overflowWrap: "anywhere" }}>
            {data.email ?? "-"}
          </span>
          <span
            style={{
              width: "fit-content",
              marginTop: 5,
              padding: "3px 8px",
              border: `1px solid ${badgeColor}`,
              color: badgeColor,
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {data.emailConfirmed ? "E-mail vérifié" : "Vérification en attente"}
          </span>
        </div>
      </SettingsCard>
      <SecurityPanel canDisableMfa={data.canDisableMfa} />
    </div>
  );
}
