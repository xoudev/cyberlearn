import type React from "react";
import type { PreferencesSectionData } from "../../_lib/settings-data";
import { SectionHead } from "../../_components/SettingsPrimitives";
import { RevisionsForm } from "./RevisionsForm";

/**
 * The preferences section, in the settings drawer.
 *
 * Theme and language are not here: the site is dark and in French, with no
 * light theme designed and no translation, and two controls that stayed
 * disabled for good were controls people kept trying. They come back with
 * the thing they switch.
 */
export function PreferencesSection({ data }: { data: PreferencesSectionData }): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="PRÉFÉRENCES" hint="révisions" />
      <RevisionsForm initial={data.spacedRepetition} />
    </div>
  );
}
