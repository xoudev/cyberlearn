import type React from "react";
import type { NotificationsSectionData } from "../../_lib/settings-data";
import { SectionHead } from "../../_components/SettingsPrimitives";
import { NotificationsForm } from "./NotificationsForm";

/** The notifications section, in the settings drawer. */
export function NotificationsSection({
  data,
}: {
  data: NotificationsSectionData;
}): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="NOTIFICATIONS" hint="par email" />
      <NotificationsForm
        initialReviewReminders={data.reviewReminders}
        initialWeeklyDigest={data.weeklyDigest}
        initialEmailNotifications={data.emailNotifications}
        streakReminder={data.streakReminder}
      />
    </div>
  );
}
