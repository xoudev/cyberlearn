import React, { Activity } from "react";
import type { SettingsData } from "../_lib/settings-data";
import { AccountSection } from "../account/_components/AccountSection";
import { DataSection } from "../data/_components/DataSection";
import { ModerationSection } from "../moderation/_components/ModerationSection";
import { NotificationsSection } from "../notifications/_components/NotificationsSection";
import { PreferencesSection } from "../preferences/_components/PreferencesSection";
import { PrivacySection } from "../privacy/_components/PrivacySection";
import { ProfileSection } from "../profile/_components/ProfileSection";
import { SETTINGS_SECTIONS, type SettingsSectionKey } from "./sections";

const RENDER: Record<SettingsSectionKey, (data: SettingsData) => React.ReactNode> = {
  profile: (data) => <ProfileSection data={data.profile} />,
  privacy: (data) => <PrivacySection data={data.privacy} />,
  preferences: (data) => <PreferencesSection data={data.preferences} />,
  notifications: (data) => <NotificationsSection data={data.notifications} />,
  moderation: (data) => <ModerationSection data={data.moderation} />,
  account: (data) => <AccountSection data={data.account} />,
  data: (data) => <DataSection data={data.data} />,
};

/**
 * The seven sections of the drawer, the same components as the pages'.
 *
 * All of them are mounted, the others hidden (Activity): switching is a
 * change of state with nothing to fetch, and a form left half-filled is
 * still half-filled when its section comes back. A hidden section runs no
 * effect until it is shown.
 *
 * Loaded on its own (React.lazy in the drawer), on the first hover of a link
 * to the settings: the forms are not in the bundle of every page.
 */
export default function SettingsPanels({
  data,
  section,
}: {
  data: SettingsData;
  section: SettingsSectionKey;
}): React.JSX.Element {
  return (
    <>
      {SETTINGS_SECTIONS.map(({ key, label }) => (
        <Activity key={key} mode={key === section ? "visible" : "hidden"}>
          <div role="region" aria-label={label}>
            {RENDER[key](data)}
          </div>
        </Activity>
      ))}
    </>
  );
}
