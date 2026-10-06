"use client";

// "use client" justified: useActionState, and a challenge's points field that
// follows its checkbox.

import React, { useActionState, useState } from "react";
import { Select } from "@cyberlearn/ui";
import {
  TEAM_SCOPE_LABELS,
  TOURNAMENT_LIMITS,
  type TournamentPhase,
  type TournamentTeamScope,
} from "@cyberlearn/lib/challenges/tournament";
import { Card } from "../../_components/admin-ui";
import type { TournamentFormState } from "../_actions/tournament-actions";

/**
 * The tournament form, to compose one or to edit it. Before the start every
 * field is open; once it runs, the title, the description and the end; once
 * over, the title and the description. A field that cannot change is shown
 * disabled, with the reason, rather than hidden.
 */

export interface ClassOption {
  id: string;
  name: string;
  school: string;
  promotion: string;
}

export interface ChallengeOption {
  id: string;
  title: string;
  refCode: string;
  type: string;
  isActive: boolean;
  defaultPoints: number;
}

export interface TournamentFormValues {
  title: string;
  description: string;
  /** datetime-local values, in Paris time. */
  startsAt: string;
  endsAt: string;
  teamScope: TournamentTeamScope;
  classIds: string[];
  challenges: { challengeId: string; points: number }[];
}

const CHECK_STYLE: React.CSSProperties = { accentColor: "#0AFFD4", width: 16, height: 16 };

export function TournamentForm({
  phase,
  initial,
  classes,
  challenges,
  headStart,
  action,
  submitLabel,
}: {
  phase: TournamentPhase;
  initial: TournamentFormValues;
  classes: ClassOption[];
  challenges: ChallengeOption[];
  /** By challenge, how many players already solved it in the catalogue. */
  headStart?: Record<string, number>;
  action: (prev: TournamentFormState, formData: FormData) => Promise<TournamentFormState>;
  submitLabel: string;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState(action, {});
  const [picked, setPicked] = useState(() => new Set(initial.challenges.map((c) => c.challengeId)));
  const pointsOf = new Map(initial.challenges.map((c) => [c.challengeId, c.points]));
  const composing = phase === "UPCOMING";
  const lockedReason =
    phase === "RUNNING"
      ? "Le tournoi a commencé : ses classes et ses défis ne changent plus, les scores reposent dessus."
      : "Le tournoi est terminé.";

  const schools = new Map<string, ClassOption[]>();
  for (const option of classes) {
    schools.set(option.school, [...(schools.get(option.school) ?? []), option]);
  }

  return (
    <form action={formAction} className="a-form" style={{ display: "grid", gap: 18 }}>
      <Card title="Le tournoi" pad>
        <div className="a-form">
          <label className="a-field">
            <span className="a-label">Titre</span>
            <input
              name="title"
              required
              minLength={3}
              maxLength={TOURNAMENT_LIMITS.titleMax}
              defaultValue={initial.title}
              placeholder="CTF de la Toussaint"
              className="a-input"
            />
          </label>
          <label className="a-field">
            <span className="a-label">
              Description<span className="a-label-optional"> · optionnel</span>
            </span>
            <textarea
              name="description"
              maxLength={TOURNAMENT_LIMITS.descriptionMax}
              rows={3}
              defaultValue={initial.description}
              placeholder="Ce que les élèves lisent en ouvrant le tournoi."
              className="a-input"
              style={{ resize: "vertical" }}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="a-field">
              <span className="a-label">Début</span>
              <input
                name="startsAt"
                type="datetime-local"
                required={composing}
                disabled={!composing}
                defaultValue={initial.startsAt}
                className="a-input"
              />
            </label>
            <label className="a-field">
              <span className="a-label">Fin</span>
              <input
                name="endsAt"
                type="datetime-local"
                required={phase !== "FINISHED"}
                disabled={phase === "FINISHED"}
                defaultValue={initial.endsAt}
                className="a-input"
              />
            </label>
          </div>
          <span className="a-field-hint">
            Heure de Paris. Un tournoi dure de {String(TOURNAMENT_LIMITS.minMinutes)} minutes à{" "}
            {String(TOURNAMENT_LIMITS.maxDays)} jours ; ses défis restent cachés jusqu&apos;au
            début.
          </span>
        </div>
      </Card>

      <Card title="Les équipes" pad>
        <div className="a-form">
          {!composing ? <p className="a-form-notice">{lockedReason}</p> : null}
          <label className="a-field">
            <span className="a-label">Qui joue contre qui</span>
            <Select
              name="teamScope"
              defaultValue={initial.teamScope}
              disabled={!composing}
              options={(["CLASS", "ESTABLISHMENT"] as const).map((value) => ({
                value,
                label: TEAM_SCOPE_LABELS[value],
              }))}
            />
            <span className="a-field-hint">
              Un défi rapporte ses points à une équipe la première fois qu&apos;un de ses membres en
              trouve le flag. École contre école : les classes d&apos;une même école font équipe.
            </span>
          </label>
          {classes.length === 0 ? (
            <p className="a-form-notice">Aucune classe : compose-en d&apos;abord dans Classes.</p>
          ) : (
            [...schools.entries()].map(([school, options]) => (
              <fieldset key={school} style={{ border: "none", margin: 0, padding: 0 }}>
                <legend className="a-label" style={{ marginBottom: 6 }}>
                  {school}
                </legend>
                <div style={{ display: "grid", gap: 6 }}>
                  {options.map((option) => (
                    <label
                      key={option.id}
                      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        name="classIds"
                        value={option.id}
                        defaultChecked={initial.classIds.includes(option.id)}
                        disabled={!composing}
                        style={CHECK_STYLE}
                      />
                      <span>
                        {option.name}
                        <span style={{ color: "var(--a-muted, #8A86A8)" }}>
                          {" "}
                          · {option.promotion}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))
          )}
        </div>
      </Card>

      <Card title="Les défis" pad>
        <div className="a-form">
          <span className="a-field-hint">
            Les défis qui se valident par un flag (CTF, Python). Un défi désactivé dans le catalogue
            n&apos;est jouable que dans le tournoi : personne ne l&apos;a vu avant.
          </span>
          {challenges.length === 0 ? (
            <p className="a-form-notice">
              Aucun défi à flag : crée-en d&apos;abord dans Challenges.
            </p>
          ) : (
            challenges.map((option) => {
              const solvedBefore = headStart?.[option.id] ?? 0;
              return (
                <div
                  key={option.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) 110px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    name="challengeIds"
                    value={option.id}
                    aria-label={`Inclure ${option.title}`}
                    checked={picked.has(option.id)}
                    disabled={!composing}
                    onChange={(e) => {
                      const next = new Set(picked);
                      if (e.target.checked) next.add(option.id);
                      else next.delete(option.id);
                      setPicked(next);
                    }}
                    style={CHECK_STYLE}
                  />
                  <span style={{ display: "grid", gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{option.title}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: "#8A86A8" }}>
                      {option.refCode} · {option.type}
                      {option.isActive ? "" : " · réservé au tournoi"}
                      {solvedBefore > 0
                        ? ` · déjà résolu dans le catalogue par ${String(solvedBefore)} joueur${solvedBefore > 1 ? "s" : ""}`
                        : ""}
                    </span>
                  </span>
                  <input
                    name={`points:${option.id}`}
                    type="number"
                    min={TOURNAMENT_LIMITS.pointsMin}
                    max={TOURNAMENT_LIMITS.pointsMax}
                    step={10}
                    aria-label={`Points de ${option.title}`}
                    defaultValue={pointsOf.get(option.id) ?? option.defaultPoints}
                    disabled={!composing || !picked.has(option.id)}
                    className="a-input"
                  />
                </div>
              );
            })
          )}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={pending} className="a-btn a-btn--primary">
          {pending ? "…" : submitLabel}
        </button>
        {state.error !== undefined ? <p className="a-form-error">{state.error}</p> : null}
        {state.ok === true ? <p className="a-form-notice">Enregistré.</p> : null}
      </div>
    </form>
  );
}
