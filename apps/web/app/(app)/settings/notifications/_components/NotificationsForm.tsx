"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { InfoTip } from "@/components/info-tip";
import { SaveBar, Switch, ToggleRow } from "../../_components/SettingsControls";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { updateNotificationsAction } from "../_actions/update-notifications";

interface NotificationsFormProps {
  initialReviewReminders: boolean;
  initialWeeklyDigest: boolean;
  /** Display-only: the toggle is disabled until streak emails ship. */
  streakReminder: boolean;
}

export function NotificationsForm({
  initialReviewReminders,
  initialWeeklyDigest,
  streakReminder,
}: NotificationsFormProps): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const [reviewReminders, setReviewReminders] = useState(initialReviewReminders);
  const [weeklyDigest, setWeeklyDigest] = useState(initialWeeklyDigest);
  const [saved, setSaved] = useState({
    reviewReminders: initialReviewReminders,
    weeklyDigest: initialWeeklyDigest,
  });

  const dirty = reviewReminders !== saved.reviewReminders || weeklyDigest !== saved.weeklyDigest;

  function handleSubmit(e: React.SyntheticEvent): void {
    e.preventDefault();
    if (!dirty || pending) return;
    const fd = new FormData();
    fd.set("reviewReminders", String(reviewReminders));
    fd.set("weeklyDigest", String(weeklyDigest));
    startTransition(async () => {
      const res = await updateNotificationsAction({}, fd);
      if (res.success) {
        setSaved({ reviewReminders, weeklyDigest });
        toast.success("Préférences enregistrées");
      } else {
        toast.error(res.error ?? "Erreur lors de l'enregistrement");
      }
    });
  }

  function handleCancel(): void {
    setReviewReminders(saved.reviewReminders);
    setWeeklyDigest(saved.weeklyDigest);
  }

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard title="Rappels & emails">
        <ToggleRow
          name="Rappels de révision"
          desc="Email quand une mission attend une révision."
          info={
            <InfoTip title="Rappels de révision">
              On t&apos;envoie un email quand une leçon doit être révisée (répétition espacée) pour
              ancrer ce que tu as appris.
            </InfoTip>
          }
        >
          <Switch
            on={reviewReminders}
            label="Rappels de révision"
            onClick={() => {
              setReviewReminders((v) => !v);
            }}
          />
        </ToggleRow>

        <ToggleRow
          name="Alerte de série"
          desc="Préviens-moi avant de perdre ma série quotidienne."
          info={
            <InfoTip title="Alerte de série">
              Prochainement — l&apos;envoi de cette alerte est en cours de préparation.
            </InfoTip>
          }
        >
          <Switch on={streakReminder} label="Alerte de série" disabled />
        </ToggleRow>

        <ToggleRow
          name="Nouveautés produit"
          desc="Nouveaux parcours, fonctionnalités, événements CTF."
          last
        >
          <Switch
            on={weeklyDigest}
            label="Nouveautés produit"
            onClick={() => {
              setWeeklyDigest((v) => !v);
            }}
          />
        </ToggleRow>
      </SettingsCard>

      <SaveBar dirty={dirty} pending={pending} onCancel={handleCancel} />
    </form>
  );
}
