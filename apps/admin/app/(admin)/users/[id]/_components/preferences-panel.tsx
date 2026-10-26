import React from "react";
import type { ConsoleProfile } from "@cyberlearn/db";
import { GOAL_CHOICES, LEVEL_CHOICES } from "@cyberlearn/lib/paths/suggest";
import { Card, Tag } from "../../../_components/admin-ui";
import { USER_CARDS } from "../../_components/columns";

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "Public, sous son pseudo",
  ANONYMOUS: "Anonyme",
  HIDDEN: "Masqué",
};

const THEME_LABEL: Record<string, string> = {
  dark: "Sombre",
  light: "Clair",
  system: "Celui de l'appareil",
};

function OnOff({ on }: { on: boolean }): React.ReactElement {
  return on ? <Tag tone="accent">Oui</Tag> : <span className="mono a-field-hint">Non</span>;
}

/**
 * The account's settings, read only: what it shows of itself, what it gets
 * by e-mail, what it said it came for. Support reads them to answer "why
 * am I not on the leaderboard" or "I get no mail"; changing them is the
 * learner's.
 */
export function PreferencesPanel({
  preferences,
}: {
  preferences: ConsoleProfile["preferences"];
}): React.ReactElement {
  if (preferences === null) {
    return (
      <Card title={USER_CARDS.preferences} pad>
        <p className="a-field-hint">
          Aucune préférence enregistrée : elles se créent à la fin de la première étape de
          l&apos;inscription. Les valeurs par défaut s&apos;appliquent, dont un classement anonyme.
        </p>
      </Card>
    );
  }

  const goals = preferences.learningGoals
    .map((goal) => GOAL_CHOICES.find((choice) => choice.value === goal)?.label ?? goal)
    .join(" · ");
  const level = LEVEL_CHOICES.find((choice) => choice.value === preferences.startingLevel)?.label;
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Profil public", value: <OnOff on={preferences.publicProfile} /> },
    {
      label: "Classement",
      value: (
        <span className="mono a-field-hint">
          {VISIBILITY_LABEL[preferences.leaderboardVisibility] ?? preferences.leaderboardVisibility}
        </span>
      ),
    },
    { label: "Classement entre amis", value: <OnOff on={preferences.friendsLeaderboard} /> },
    { label: "E-mails de la plateforme", value: <OnOff on={preferences.emailNotifications} /> },
    { label: "Révisions", value: <OnOff on={preferences.spacedRepetition} /> },
    { label: "Rappels de révision", value: <OnOff on={preferences.reviewReminders} /> },
    { label: "Résumé de la semaine", value: <OnOff on={preferences.weeklyDigest} /> },
    { label: "Rappel de série", value: <OnOff on={preferences.streakReminder} /> },
    {
      label: "Thème",
      value: (
        <span className="mono a-field-hint">
          {THEME_LABEL[preferences.theme] ?? preferences.theme}
        </span>
      ),
    },
    {
      label: "Objectifs",
      value: <span className="a-field-hint">{goals === "" ? "Non renseignés" : goals}</span>,
    },
    {
      label: "Point de départ",
      value: <span className="a-field-hint">{level ?? "Non renseigné"}</span>,
    },
  ];

  return (
    <Card title={USER_CARDS.preferences}>
      {rows.map((row) => (
        <div key={row.label} className="a-defrow">
          <span className="a-defrow-label">{row.label}</span>
          {row.value}
        </div>
      ))}
    </Card>
  );
}
