"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { NOTIFICATION_SETTINGS } from "@cyberlearn/lib/settings/notifications";
import { InfoTip } from "@/components/info-tip";
import { SaveBar, Switch, ToggleRow } from "../../_components/SettingsControls";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { updateNotificationsAction } from "../_actions/update-notifications";

interface NotificationsFormProps {
  initialReviewReminders: boolean;
  initialWeeklyDigest: boolean;
  initialEmailNotifications: boolean;
  /** Display-only: the toggle is disabled until streak emails ship. */
  streakReminder: boolean;
}

/** The switches this form saves; the streak alert is shown but not sent yet. */
interface Editable {
  reviewReminders: boolean;
  weeklyDigest: boolean;
  emailNotifications: boolean;
}

/**
 * The rows, their words and which ones are live come from
 * @cyberlearn/lib/settings/notifications, which the app reads too.
 */
export function NotificationsForm({
  initialReviewReminders,
  initialWeeklyDigest,
  initialEmailNotifications,
  streakReminder,
}: NotificationsFormProps): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const initial: Editable = {
    reviewReminders: initialReviewReminders,
    weeklyDigest: initialWeeklyDigest,
    emailNotifications: initialEmailNotifications,
  };
  const [values, setValues] = useState<Editable>(initial);
  const [saved, setSaved] = useState<Editable>(initial);

  const dirty =
    values.reviewReminders !== saved.reviewReminders ||
    values.weeklyDigest !== saved.weeklyDigest ||
    values.emailNotifications !== saved.emailNotifications;

  function handleSubmit(e: React.SyntheticEvent): void {
    e.preventDefault();
    if (!dirty || pending) return;
    const fd = new FormData();
    fd.set("reviewReminders", String(values.reviewReminders));
    fd.set("weeklyDigest", String(values.weeklyDigest));
    fd.set("emailNotifications", String(values.emailNotifications));
    startTransition(async () => {
      const res = await updateNotificationsAction({}, fd);
      if (res.success) {
        setSaved(values);
        toast.success("Préférences enregistrées");
      } else {
        toast.error(res.error ?? "Erreur lors de l'enregistrement");
      }
    });
  }

  function handleCancel(): void {
    setValues(saved);
  }

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard title="Rappels & emails">
        {NOTIFICATION_SETTINGS.map((setting, i) => {
          const last = i === NOTIFICATION_SETTINGS.length - 1;
          const info =
            setting.info !== null ? (
              <InfoTip title={setting.name}>{setting.info}</InfoTip>
            ) : undefined;
          if (setting.key === "streakReminder") {
            return (
              <ToggleRow
                key={setting.key}
                name={setting.name}
                desc={setting.desc}
                info={info}
                last={last}
              >
                <Switch on={streakReminder} label={setting.name} disabled />
              </ToggleRow>
            );
          }
          const key = setting.key;
          return (
            <ToggleRow key={key} name={setting.name} desc={setting.desc} info={info} last={last}>
              <Switch
                on={values[key]}
                label={setting.name}
                onClick={() => {
                  setValues((v) => ({ ...v, [key]: !v[key] }));
                }}
              />
            </ToggleRow>
          );
        })}
      </SettingsCard>

      <SaveBar dirty={dirty} pending={pending} onCancel={handleCancel} />
    </form>
  );
}
