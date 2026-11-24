"use client";

// The button asks before it acts, and shows the action's pending state and
// its answer without leaving the settings.

import { useActionState, useState } from "react";
import { signOutOtherSessions } from "../_actions/sign-out-others";
import { SIGN_OUT_OTHERS_IDLE } from "../_actions/sign-out-others-state";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { S, SANS } from "../../_components/tokens";

const noteStyle: React.CSSProperties = {
  margin: 0,
  color: S.fg2,
  fontFamily: SANS,
  fontSize: 13,
  lineHeight: 1.6,
};

const buttonStyle: React.CSSProperties = {
  minHeight: 44,
  border: `1px solid ${S.borderStrong}`,
  background: "transparent",
  color: S.fg2,
  padding: "0 18px",
  cursor: "pointer",
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: 600,
};

const confirmStyle: React.CSSProperties = {
  ...buttonStyle,
  color: S.danger,
  borderColor: S.danger,
};

/**
 * "Fermer mes autres sessions": for a computer somebody else uses, a phone
 * that was lost. Two steps, the second one naming what it does, because the
 * other devices are signed out for good and cannot be asked.
 */
export function SessionsPanel(): React.JSX.Element {
  const [state, action, pending] = useActionState(signOutOtherSessions, SIGN_OUT_OTHERS_IDLE);
  const [asking, setAsking] = useState(false);

  return (
    <SettingsCard title="Appareils connectés">
      <div style={{ display: "grid", gap: 14 }}>
        <p style={noteStyle}>
          Tu t’es connecté sur un ordinateur que d’autres utilisent, ou tu as perdu ton téléphone ?
          Ferme toutes tes sessions sauf celle-ci. Un appareil déjà ouvert peut rester connecté une
          heure au plus.
        </p>

        {asking ? (
          <form
            action={() => {
              setAsking(false);
              action();
            }}
            style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
          >
            <button style={confirmStyle} type="submit" disabled={pending}>
              Oui, fermer les autres sessions
            </button>
            <button
              style={buttonStyle}
              type="button"
              onClick={() => {
                setAsking(false);
              }}
            >
              Annuler
            </button>
          </form>
        ) : (
          <div>
            <button
              style={buttonStyle}
              type="button"
              disabled={pending}
              onClick={() => {
                setAsking(true);
              }}
            >
              {pending ? "Déconnexion…" : "Fermer mes autres sessions"}
            </button>
          </div>
        )}

        {state.message !== null && !asking ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            style={{ ...noteStyle, color: state.status === "error" ? S.danger : S.success }}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </SettingsCard>
  );
}
