"use client";

import React, { useState, useTransition } from "react";
import { SPACED_REPETITION_SETTING } from "@cyberlearn/lib/settings/notifications";
import { InfoTip } from "@/components/info-tip";
import { Switch, ToggleRow } from "../../_components/SettingsControls";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { updateRevisionsAction } from "../_actions/update-revisions";

/**
 * The switch that turns spaced repetition off, feature and all.
 *
 * Its own card, titled after what it changes: what the app does, not how it
 * looks.
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
        name={SPACED_REPETITION_SETTING.name}
        desc={on ? SPACED_REPETITION_SETTING.descOn : SPACED_REPETITION_SETTING.descOff}
        info={
          <InfoTip title={SPACED_REPETITION_SETTING.name}>{SPACED_REPETITION_SETTING.info}</InfoTip>
        }
        last
      >
        <Switch on={on} label={SPACED_REPETITION_SETTING.name} onClick={flip} disabled={pending} />
      </ToggleRow>
      {error !== null && (
        <p
          role="alert"
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-interface), sans-serif",
            fontSize: 13,
            color: "var(--color-state-danger)",
          }}
        >
          {error}
        </p>
      )}
    </SettingsCard>
  );
}
