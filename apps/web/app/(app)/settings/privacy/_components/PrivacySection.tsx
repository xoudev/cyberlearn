import type React from "react";
import type { PrivacySectionData } from "../../_lib/settings-data";
import { SectionHead } from "../../_components/SettingsPrimitives";
import { PrivacyForm } from "./PrivacyForm";

/** The privacy section, on its page and in the drawer. */
export function PrivacySection({ data }: { data: PrivacySectionData }): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="CONFIDENTIALITÉ" hint="qui voit quoi" />
      <PrivacyForm
        initialVisibility={data.visibility}
        initialPublicProfile={data.publicProfile}
        initialFriendsLeaderboard={data.friendsLeaderboard}
      />
    </div>
  );
}
