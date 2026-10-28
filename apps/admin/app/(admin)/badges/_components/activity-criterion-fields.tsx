import React from "react";
import { Select } from "@cyberlearn/ui";

/**
 * The criteria of what is played outside lessons (challenges, duels,
 * tournaments, the daily recall), shared by the forms that create and edit a
 * badge. Their meaning is computeBadgeProgress's (@cyberlearn/lib); the
 * action that saves them is badge-actions.ts.
 */

export const ACTIVITY_CRITERION_LABELS: Record<string, string> = {
  CHALLENGES_SOLVED: "Défis résolus",
  DUELS_PLAYED: "Duels joués",
  DUELS_WON: "Duels gagnés",
  TOURNAMENTS_PLAYED: "Tournois joués",
  TOURNAMENT_RANK: "Place d'équipe en tournoi",
  DAILY_RECALLS: "Rappels du jour faits",
};

/** What the count field asks for, per criterion. */
const COUNT_FIELD: Record<string, { label: string; hint: string }> = {
  CHALLENGES_SOLVED: {
    label: "Nombre de défis *",
    hint: "Défis du catalogue résolus, flag ou script validé.",
  },
  DUELS_PLAYED: {
    label: "Nombre de duels *",
    hint: "Duels terminés, quel que soit le résultat : victoire, défaite ou égalité.",
  },
  DUELS_WON: { label: "Nombre de victoires *", hint: "Duels terminés et gagnés." },
  TOURNAMENTS_PLAYED: {
    label: "Nombre de tournois *",
    hint: "Tournois où le joueur a validé au moins un flag qui compte encore.",
  },
  TOURNAMENT_RANK: {
    label: "Nombre de tournois *",
    hint: "Combien de fois l'équipe doit finir à cette place ou mieux. Donné après la fin du tournoi, la nuit suivante au plus tard.",
  },
  DAILY_RECALLS: {
    label: "Nombre de rappels *",
    hint: "Rappels du jour rendus et crédités ; un jour sans question ne compte pas.",
  },
};

const CHALLENGE_FILTER_OPTIONS = [
  { value: "ALL", label: "Tous les défis" },
  { value: "WITHOUT_HINTS", label: "Sans révéler d'indice" },
  { value: "WEEKLY", label: "Défi de la semaine, résolu cette semaine-là" },
];

const RANK_OPTIONS = [
  { value: "1", label: "1re place (victoire)" },
  { value: "3", label: "Podium (top 3)" },
];

export function isActivityCriterion(type: string): boolean {
  return type in ACTIVITY_CRITERION_LABELS;
}

function numberOr(value: unknown, fallback: number): string {
  return String(typeof value === "number" ? value : fallback);
}

/** The form's starting values for a badge saved with one of these criteria. */
export function activityCriterionDefaults(type: string, data: unknown): Record<string, string> {
  if (!isActivityCriterion(type) || typeof data !== "object" || data === null) return {};
  const count: unknown = Object.getOwnPropertyDescriptor(data, "count")?.value;
  const only: unknown = Object.getOwnPropertyDescriptor(data, "only")?.value;
  const top: unknown = Object.getOwnPropertyDescriptor(data, "top")?.value;
  return {
    criterion_count: numberOr(count, 1),
    criterion_only: typeof only === "string" ? only : "ALL",
    criterion_top: numberOr(top, 1),
  };
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="a-field">
      <label className="a-label">{label}</label>
      <p className="a-field-hint" style={{ margin: 0 }}>
        {hint}
      </p>
      {children}
    </div>
  );
}

/** The fields of one of these criteria; nothing for any other type. */
export function ActivityCriterionFields({
  type,
  defaults = {},
}: {
  type: string;
  defaults?: Record<string, string | boolean>;
}): React.ReactElement | null {
  const count = COUNT_FIELD[type];
  if (count === undefined) return null;
  const text = (key: string, fallback: string): string => {
    const value = defaults[key];
    return typeof value === "string" && value !== "" ? value : fallback;
  };

  return (
    <>
      {type === "CHALLENGES_SOLVED" && (
        <FieldBlock label="Quels défis *" hint="Les défis que le badge compte.">
          <Select
            name="criterion_only"
            required
            defaultValue={text("criterion_only", "ALL")}
            options={CHALLENGE_FILTER_OPTIONS}
          />
        </FieldBlock>
      )}
      {type === "TOURNAMENT_RANK" && (
        <FieldBlock
          label="Place *"
          hint="La place de l'équipe du joueur au classement final ; les ex aequo partagent la leur."
        >
          <Select
            name="criterion_top"
            required
            defaultValue={text("criterion_top", "1")}
            options={RANK_OPTIONS}
          />
        </FieldBlock>
      )}
      <FieldBlock label={count.label} hint={count.hint}>
        <input
          name="criterion_count"
          type="number"
          min={1}
          max={999}
          required
          defaultValue={text("criterion_count", "1")}
          className="a-input"
        />
      </FieldBlock>
    </>
  );
}
