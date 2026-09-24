"use client";

import React, { useActionState, useState, useTransition } from "react";
import {
  createResourceAction,
  deleteResourceAction,
  type ResourceState,
} from "../_actions/resource-actions";
import { Select } from "@cyberlearn/ui";

/**
 * The material a teacher has prepared for a class, and the form that adds more.
 *
 * Nothing is filtered on this side: a corrigé a teacher cannot re-read before
 * handing it out is a corrigé they cannot check. What is held back is marked as
 * held back, with the condition spelled out, so the state of every row is
 * readable at a glance rather than inferred from a date.
 */

export interface TeacherResourceRow {
  id: string;
  title: string;
  url: string | null;
  hasBody: boolean;
  /** Pre-formatted by the server, which owns the locale. */
  releaseLabel: string | null;
  released: boolean;
  afterCompletion: boolean;
  assignmentTitle: string | null;
}

export interface ResourceAssignmentOption {
  id: string;
  title: string;
}

export function ClassResources({
  classId,
  resources,
  assignments,
}: {
  classId: string;
  resources: TeacherResourceRow[];
  assignments: ResourceAssignmentOption[];
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<ResourceState, FormData>(
    createResourceAction,
    {},
  );
  const [removing, startRemove] = useTransition();
  const [linkedAssignment, setLinkedAssignment] = useState("");

  return (
    <div className="cls-work-block">
      <p className="cls-subhead">
        Corrigés et ressources{resources.length > 0 && ` · ${String(resources.length)}`}
      </p>

      {resources.length === 0 ? (
        <p className="cls-empty">
          Rien de partagé pour l&apos;instant. Un corrigé peut être écrit tout de suite et
          n&apos;apparaître qu&apos;après l&apos;échéance.
        </p>
      ) : (
        <ul className="cls-work">
          {resources.map((r) => (
            <li key={r.id} className="cls-work__row" data-state={r.released ? "done" : "todo"}>
              <span className="cls-work__mark" aria-hidden="true">
                {r.released ? "✓" : "🔒"}
              </span>
              <span className="cls-work__body">
                {r.url !== null ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="cls-work__title"
                  >
                    {r.title} ↗
                  </a>
                ) : (
                  <span className="cls-work__title">{r.title}</span>
                )}
                <span className="cls-work__note">
                  {r.assignmentTitle !== null && `Corrigé de « ${r.assignmentTitle} » · `}
                  {r.released
                    ? "visible par la classe"
                    : r.releaseLabel !== null
                      ? `visible le ${r.releaseLabel}`
                      : "non publié"}
                  {r.afterCompletion && " · une fois la leçon faite"}
                </span>
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  startRemove(async () => {
                    await deleteResourceAction(r.id);
                  });
                }}
                className="cls-work__remove"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="cls-assign">
        <summary className="cls-assign__head">Partager un corrigé ou une ressource</summary>

        <form action={formAction} className="cls-assign__form">
          <input type="hidden" name="classId" value={classId} />

          <label className="cls-field">
            <span className="cls-field__label">Titre</span>
            <input
              name="title"
              required
              minLength={2}
              maxLength={200}
              placeholder="Corrigé du TP 3"
              className="cls-input"
            />
          </label>

          <label className="cls-field">
            <span className="cls-field__label">Contenu (Markdown) · optionnel</span>
            <textarea name="body" rows={6} className="cls-input cls-input--code" />
          </label>

          <label className="cls-field">
            <span className="cls-field__label">Lien · optionnel</span>
            <input
              name="url"
              type="url"
              maxLength={2000}
              placeholder="https://…"
              className="cls-input"
            />
            <span className="cls-field__hint">
              Pour ce qui vit dans un fichier ailleurs. Il faut au moins un contenu ou un lien.
            </span>
          </label>

          <div className="cls-grid2">
            <label className="cls-field">
              <span className="cls-field__label">Corrigé de · optionnel</span>
              <Select
                name="assignmentId"
                aria-label="Leçon liée"
                value={linkedAssignment}
                options={[
                  { value: "", label: "Aucune leçon" },
                  ...assignments.map((a) => ({ value: a.id, label: a.title })),
                ]}
                onChange={setLinkedAssignment}
              />
            </label>

            <label className="cls-field">
              <span className="cls-field__label">Visible à partir du · optionnel</span>
              <input type="date" name="releasedAt" className="cls-input" />
              <span className="cls-field__hint">Vide : visible tout de suite.</span>
            </label>
          </div>

          {/* Only offered once a lesson is picked: without one there is nothing
              to complete, and a condition that can never be satisfied would
              quietly hide the resource forever. */}
          {linkedAssignment !== "" && (
            <label className="cls-check">
              <input type="checkbox" name="afterCompletion" value="true" />
              <span>Seulement pour les élèves qui ont terminé la leçon</span>
            </label>
          )}

          <button type="submit" disabled={pending} className="cls-btn">
            {pending ? "…" : "Partager avec la classe"}
          </button>

          {state.error !== undefined && (
            <p className="cls-alert" data-tone="bad">
              {state.error}
            </p>
          )}
          {state.ok === true && <p className="cls-alert">Partagé.</p>}
        </form>
      </details>
    </div>
  );
}
