import type React from "react";
import type { DataSectionData } from "../../_lib/settings-data";
import { SectionHead, SettingsCard } from "../../_components/SettingsPrimitives";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { ExportDataButton } from "./ExportDataButton";

export function DataSection({ data }: { data: DataSectionData }): React.JSX.Element {
  return (
    <div className="settings-data-section">
      <SectionHead label="DONNÉES" hint="export et suppression" />
      <SettingsCard
        title="Exporter mes données"
        desc="Télécharge une copie de tes données au format JSON."
      >
        <p className="settings-data-meta">Article 20 RGPD · un export par 24 h</p>
        <ExportDataButton />
      </SettingsCard>
      <DeleteAccountSection
        pendingExpiresAt={data.pendingExpiresAt}
        certificateCount={data.certificateCount}
      />
    </div>
  );
}
