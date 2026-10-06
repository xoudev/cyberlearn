import type React from "react";
import type { PreferencesSectionData } from "../../_lib/settings-data";
import { SectionHead } from "../../_components/SettingsPrimitives";
import { PreferencesForm } from "./PreferencesForm";
import { RevisionsForm } from "./RevisionsForm";

/** The preferences section, on its page and in the drawer. */
export function PreferencesSection({ data }: { data: PreferencesSectionData }): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="PRÉFÉRENCES" hint="apparence, langue & révisions" />
      <PreferencesForm />
      <RevisionsForm initial={data.spacedRepetition} />
    </div>
  );
}
