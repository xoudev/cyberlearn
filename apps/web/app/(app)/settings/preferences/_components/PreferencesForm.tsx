"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { InfoTip } from "@/components/info-tip";
import { Segmented, ToggleRow } from "../../_components/SettingsControls";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { updateThemeAction } from "../_actions/update-preferences";

type Theme = "light" | "dark" | "system";

const THEME_OPTIONS = [
  { id: "light", label: "Clair" },
  { id: "dark", label: "Sombre" },
  { id: "system", label: "Système" },
] as const satisfies readonly { id: Theme; label: string }[];

function normalizeTheme(value: string | undefined): Theme {
  return value === "light" || value === "system" ? value : "dark";
}

export function PreferencesForm({ initialTheme }: { initialTheme: string }): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  // Before hydration useTheme() is undefined; fall back to the persisted value
  // to avoid a flash / hydration mismatch on the segmented control.
  useEffect(() => {
    setMounted(true);
  }, []);

  const current = normalizeTheme(mounted ? theme : initialTheme);

  function handleThemeChange(next: Theme): void {
    setTheme(next); // immediate visual switch (next-themes)
    const fd = new FormData();
    fd.set("theme", next);
    startTransition(async () => {
      const res = await updateThemeAction({}, fd);
      if (!res.success) toast.error(res.error ?? "Erreur lors de l'enregistrement");
    });
  }

  return (
    <SettingsCard title="Apparence & langue">
      <ToggleRow name="Thème" desc="Clair, sombre, ou suivre le système.">
        <Segmented<Theme> value={current} options={THEME_OPTIONS} onChange={handleThemeChange} />
      </ToggleRow>
      <ToggleRow
        name="Langue"
        desc="Langue de l'interface."
        info={
          <InfoTip title="Langue">Prochainement — internationalisation (i18n) planifiée.</InfoTip>
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
