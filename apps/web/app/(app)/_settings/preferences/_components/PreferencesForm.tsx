"use client";

import type React from "react";
import { InfoTip } from "@/components/info-tip";
import { Segmented, ToggleRow } from "../../_components/SettingsControls";
import { SettingsCard } from "../../_components/SettingsPrimitives";

// The app is dark-only for launch (see RootLayout forcedTheme="dark"). The
// theme control is shown disabled with "Sombre" selected, like the language
// control, until the light theme is designed.
export function PreferencesForm(): React.JSX.Element {
  return (
    <SettingsCard title="Apparence & langue">
      <ToggleRow
        name="Thème"
        desc="Thème clair en cours de développement, mode sombre uniquement pour le moment."
        info={
          <InfoTip title="Thème">
            Le thème clair n&apos;a pas encore été conçu. L&apos;application reste en mode sombre au
            lancement.
          </InfoTip>
        }
      >
        <Segmented<"light" | "dark" | "system">
          value="dark"
          options={[
            { id: "light", label: "Clair" },
            { id: "dark", label: "Sombre" },
            { id: "system", label: "Système" },
          ]}
          disabled
        />
      </ToggleRow>
      <ToggleRow
        name="Langue"
        desc="Langue de l'interface."
        info={
          <InfoTip title="Langue">Prochainement · internationalisation (i18n) planifiée.</InfoTip>
        }
        last
      >
        <Segmented<"fr" | "en">
          value="fr"
          options={[
            { id: "fr", label: "FR" },
            { id: "en", label: "EN" },
          ]}
          disabled
        />
      </ToggleRow>
    </SettingsCard>
  );
}
