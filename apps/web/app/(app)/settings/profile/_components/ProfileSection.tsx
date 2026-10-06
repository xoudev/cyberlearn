import type React from "react";
import type { ProfileSectionData } from "../../_lib/settings-data";
import { SectionHead, SettingsCard } from "../../_components/SettingsPrimitives";
import { ProfileForm } from "./ProfileForm";

/** The profile section, on its page and in the drawer. */
export function ProfileSection({ data }: { data: ProfileSectionData }): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="PROFIL" hint="visible selon ta confidentialité" />
      <SettingsCard title="Ton identité">
        <ProfileForm
          username={data.username}
          initialDisplayName={data.displayName}
          initialBio={data.bio}
          initialAvatarUrl={data.avatarUrl}
          initialAvatarPreview={data.avatarPreview}
        />
      </SettingsCard>
    </div>
  );
}
