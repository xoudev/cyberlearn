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
        <p>
          Le fichier comprend ton profil, tes préférences, ta progression, tes exercices, tes notes,
          tes messages du forum, tes questions et réponses, tes demandes au support, tes amis, tes
          classes, tes sanctions et les décisions du filtre automatique sur tes textes.
        </p>
        <p>
          Tes amis y figurent par leur pseudo seulement : leur e-mail est le leur. Pour les
          notifications, les messages du forum, les amitiés et les décisions du filtre, les plus
          récents sont inclus ; le fichier dit en tête combien.
        </p>
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
