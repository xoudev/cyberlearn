"use client";

import React, { useActionState } from "react";
import {
  createClassAction,
  createEstablishmentAction,
  createPromotionAction,
  type ActionState,
} from "../../_actions/class-actions";
import { Card } from "../../../_components/admin-ui";

/**
 * The three creation forms, built from the console's own kit.
 *
 * They used to carry their own BORDER and MUTED constants and their own field
 * and button styles, which is why this corner of the console did not look like
 * the rest of it. Every input here is .a-input, every label .a-label, every
 * button .a-btn - the same ones the login form and the lesson editor use.
 */

interface Field {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}

interface SelectSpec {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

export function ComposeForms({
  establishments,
}: {
  establishments: { id: string; name: string; promotions: { id: string; name: string }[] }[];
}): React.ReactElement {
  const promotions = establishments.flatMap((e) =>
    e.promotions.map((p) => ({ ...p, establishment: e.name })),
  );

  return (
    <div className="admin-compose-grid">
      <ComposeForm
        step={1}
        title="Établissement"
        submitLabel="Créer l'établissement"
        action={createEstablishmentAction}
        fields={[
          { name: "name", label: "Nom", placeholder: "Lycée Jean Moulin", required: true },
          {
            name: "slug",
            label: "Slug",
            placeholder: "jean-moulin",
            required: true,
            hint: "Minuscules, chiffres et tirets.",
          },
          { name: "city", label: "Ville", placeholder: "Lyon" },
        ]}
      />

      <ComposeForm
        step={2}
        title="Promo"
        submitLabel="Créer la promo"
        action={createPromotionAction}
        blockedBy={establishments.length === 0 ? "Crée d'abord un établissement." : undefined}
        select={{
          name: "establishmentId",
          label: "Établissement",
          options: establishments.map((e) => ({ value: e.id, label: e.name })),
        }}
        fields={[
          { name: "name", label: "Nom", placeholder: "BTS SIO 2025-2026", required: true },
          {
            name: "slug",
            label: "Slug",
            placeholder: "sio-2025",
            required: true,
            hint: "Unique au sein de l'établissement.",
          },
          { name: "startYear", label: "Année de début", placeholder: "2025" },
        ]}
      />

      <ComposeForm
        step={3}
        title="Classe"
        submitLabel="Créer la classe"
        action={createClassAction}
        blockedBy={promotions.length === 0 ? "Crée d'abord une promo." : undefined}
        select={{
          name: "promotionId",
          label: "Promo",
          options: promotions.map((p) => ({
            value: p.id,
            label: `${p.establishment} · ${p.name}`,
          })),
        }}
        fields={[
          { name: "name", label: "Nom", placeholder: "SIO1-A", required: true },
          {
            name: "slug",
            label: "Slug",
            placeholder: "sio1-a",
            required: true,
            hint: "Unique au sein de la promo.",
          },
          { name: "description", label: "Description", placeholder: "Optionnel" },
        ]}
      />
    </div>
  );
}

function ComposeForm({
  step,
  title,
  submitLabel,
  action,
  fields,
  select,
  blockedBy,
}: {
  step: number;
  title: string;
  submitLabel: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Field[];
  select?: SelectSpec;
  /** The reason this step cannot run yet, shown instead of a dead form. */
  blockedBy?: string | undefined;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState(action, {});
  const blocked = blockedBy !== undefined;

  return (
    <Card title={`${String(step)}. ${title}`} pad>
      {/* Saying why beats greying out in silence: a disabled form with no
          explanation is indistinguishable from a broken one. */}
      {blocked ? (
        <p className="a-form-notice">{blockedBy}</p>
      ) : (
        <form action={formAction} className="a-form">
          {select && (
            <label className="a-field">
              <span className="a-label">{select.label}</span>
              <select name={select.name} required className="a-select">
                {select.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {fields.map((f) => (
            <label key={f.name} className="a-field">
              <span className="a-label">
                {f.label}
                {f.required !== true && <span className="a-label-optional"> · optionnel</span>}
              </span>
              <input
                name={f.name}
                placeholder={f.placeholder}
                required={f.required === true}
                className="a-input"
              />
              {f.hint !== undefined && <span className="a-field-hint">{f.hint}</span>}
            </label>
          ))}

          <button type="submit" disabled={pending} className="a-btn a-btn--primary">
            {pending ? "…" : submitLabel}
          </button>

          {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
          {state.ok === true && <p className="a-form-notice">Créé.</p>}
        </form>
      )}
    </Card>
  );
}
