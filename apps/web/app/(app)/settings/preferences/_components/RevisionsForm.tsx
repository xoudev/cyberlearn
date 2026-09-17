"use client";

import React, { useState, useTransition } from "react";
import { InfoTip } from "@/components/info-tip";
import { Switch, ToggleRow } from "../../_components/SettingsControls";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { updateRevisionsAction } from "../_actions/update-revisions";

/**
 * The switch that turns spaced repetition off, feature and all.
 *
 * Its own card rather than a row under "Apparence & langue": this one changes
 * what the app does, not how it looks, and burying a feature toggle among
 * cosmetic ones is how it stays unfound.
 *
 * It saves on flip rather than behind a Save button. The rest of this page has
 * nothing to save yet, and a lone toggle that needs confirming is a toggle
 * people leave half-set.
 */
export function RevisionsForm({ initial }: { initial: boolean }): React.JSX.Element {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const flip = (): void => {
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("spacedRepetition", String(next));
      const res = await updateRevisionsAction({}, fd);
      if (res.error !== undefined) {
        setOn(!next);
        setError(res.error);
      }
    });
  };

  return (
    <SettingsCard title="Révisions">
      <ToggleRow
        name="Répétition espacée"
        desc={
          on
            ? "Les leçons terminées reviennent à réviser, et tu es prévenu quand c'est le moment."
            : "Coupée. Rien ne revient à réviser et plus aucune notification de révision ne part."
        }
        info={
          <InfoTip title="Répétition espacée">
            Couper la répétition espacée retire l&apos;onglet Révisions, la section du tableau de
            bord et les rappels. Ce que tu avais déjà à réviser n&apos;est pas supprimé : si tu la
            réactives, tu retrouves ta file là où elle s&apos;était arrêtée.
          </InfoTip>
        }
        last
      >
        <Switch on={on} label="Répétition espacée" onClick={flip} disabled={pending} />
      </ToggleRow>
      {error !== null && (
        <p
          role="alert"
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "#FF4D6D",
          }}
        >
          {error}
        </p>
      )}
    </SettingsCard>
  );
}
