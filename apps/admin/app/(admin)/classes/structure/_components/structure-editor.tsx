"use client";

import React, { useActionState, useTransition } from "react";
import {
  setEstablishmentArchivedAction,
  setPromotionArchivedAction,
  updateEstablishmentAction,
  updatePromotionAction,
  type ActionState,
} from "../../_actions/class-actions";
import { Card, EmptyState, Tag } from "../../../_components/admin-ui";

/**
 * The school tree, editable.
 *
 * Everything above a class was write-once: an establishment typed with a typo
 * stayed typed with a typo, and the only way round it was a second row beside
 * the first. A school renames itself, an intake is mis-slugged, a year ends -
 * all three are ordinary, and none of them had a control.
 *
 * Forms sit behind a <details> rather than a modal or a page per row. Opening
 * one is free, closing it loses nothing, several can be open at once, and it
 * is the browser's own disclosure - no state to hold and nothing to get stuck.
 */

export interface StructurePromotion {
  id: string;
  name: string;
  slug: string;
  startYear: number | null;
  archived: boolean;
  classCount: number;
}

export interface StructureEstablishment {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  archived: boolean;
  promotions: StructurePromotion[];
}

export function StructureEditor({
  establishments,
}: {
  establishments: StructureEstablishment[];
}): React.ReactElement {
  if (establishments.length === 0) {
    return (
      <EmptyState
        title="Aucun établissement"
        text="Crée un établissement, puis une promo, puis une classe."
      />
    );
  }

  return (
    <div className="a-stack">
      {establishments.map((e) => (
        <EstablishmentCard key={e.id} establishment={e} />
      ))}
    </div>
  );
}

function EstablishmentCard({
  establishment: e,
}: {
  establishment: StructureEstablishment;
}): React.ReactElement {
  return (
    <Card
      title={
        <>
          {e.name}
          {e.archived && (
            <>
              {" "}
              <Tag tone="neutral">Archivé</Tag>
            </>
          )}
        </>
      }
      action={
        <ArchiveButton
          archived={e.archived}
          onToggle={(next) => setEstablishmentArchivedAction(e.id, next)}
          labels={{ archive: "Archiver l'établissement", restore: "Restaurer" }}
        />
      }
      pad
    >
      {/* Archiving a school reaches everything under it without writing a row
          of theirs, so this is the one place where the consequence is not
          visible in the thing you clicked. It gets said out loud. */}
      {e.archived && (
        <p className="a-form-notice">
          Ses promos et ses classes sont retirées de CyberLearn tant qu&apos;il est archivé, sans
          perdre leur propre état : les restaurer rend exactement ce qui était actif.
        </p>
      )}

      <EstablishmentForm establishment={e} />

      <h3 className="a-subhead">Promos · {e.promotions.length}</h3>

      {e.promotions.length === 0 ? (
        <p className="a-field-hint">Aucune promo. Ajoute-en une depuis « Créer ».</p>
      ) : (
        <div className="a-stack-tight">
          {e.promotions.map((p) => (
            <PromotionRow key={p.id} promotion={p} />
          ))}
        </div>
      )}
    </Card>
  );
}

function EstablishmentForm({
  establishment: e,
}: {
  establishment: StructureEstablishment;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateEstablishmentAction,
    {},
  );

  return (
    <details className="a-disclosure">
      <summary className="a-disclosure-head">
        <span className="a-disclosure-title">Modifier l&apos;établissement</span>
        <span className="mono a-disclosure-meta">
          {e.slug}
          {e.city !== null && ` · ${e.city}`}
        </span>
      </summary>

      <form action={formAction} className="a-form a-disclosure-body">
        <input type="hidden" name="id" value={e.id} />
        <Field name="name" label="Nom" defaultValue={e.name} required />
        <Field
          name="slug"
          label="Slug"
          defaultValue={e.slug}
          required
          hint="Minuscules, chiffres et tirets. Unique sur toute la plateforme."
        />
        <Field name="city" label="Ville" defaultValue={e.city ?? ""} />
        <Submit pending={pending} label="Enregistrer" state={state} />
      </form>
    </details>
  );
}

function PromotionRow({ promotion: p }: { promotion: StructurePromotion }): React.ReactElement {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePromotionAction,
    {},
  );

  return (
    <details className="a-disclosure">
      <summary className="a-disclosure-head">
        <span className="a-disclosure-title">{p.name}</span>
        <span className="mono a-disclosure-meta">
          {p.slug}
          {p.startYear !== null && ` · ${String(p.startYear)}`} · {p.classCount} classe
          {p.classCount > 1 ? "s" : ""}
        </span>
        <Tag tone={p.archived ? "neutral" : "accent"}>{p.archived ? "Archivée" : "Active"}</Tag>
      </summary>

      <form action={formAction} className="a-form a-disclosure-body">
        <input type="hidden" name="id" value={p.id} />
        <Field name="name" label="Nom" defaultValue={p.name} required />
        <Field
          name="slug"
          label="Slug"
          defaultValue={p.slug}
          required
          hint="Unique au sein de l'établissement."
        />
        <Field
          name="startYear"
          label="Année de début"
          defaultValue={p.startYear === null ? "" : String(p.startYear)}
          hint="Sert à trier les promos en cours en premier."
        />
        <div className="a-row-actions">
          <Submit pending={pending} label="Enregistrer" state={state} />
          <ArchiveButton
            archived={p.archived}
            onToggle={(next) => setPromotionArchivedAction(p.id, next)}
            labels={{ archive: "Archiver la promo", restore: "Restaurer" }}
          />
        </div>
      </form>
    </details>
  );
}

// ── Small shared pieces ───────────────────────────────────────────────────────

function Field({
  name,
  label,
  defaultValue,
  required = false,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  hint?: string;
}): React.ReactElement {
  return (
    <label className="a-field">
      <span className="a-label">
        {label}
        {!required && <span className="a-label-optional"> · optionnel</span>}
      </span>
      <input name={name} defaultValue={defaultValue} required={required} className="a-input" />
      {hint !== undefined && <span className="a-field-hint">{hint}</span>}
    </label>
  );
}

function Submit({
  pending,
  label,
  state,
}: {
  pending: boolean;
  label: string;
  state: ActionState;
}): React.ReactElement {
  return (
    <>
      <button type="submit" disabled={pending} className="a-btn a-btn--primary">
        {pending ? "…" : label}
      </button>
      {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
      {state.ok === true && <p className="a-form-notice">Enregistré.</p>}
    </>
  );
}

function ArchiveButton({
  archived,
  onToggle,
  labels,
}: {
  archived: boolean;
  onToggle: (next: boolean) => Promise<{ ok: boolean }>;
  labels: { archive: string; restore: string };
}): React.ReactElement {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await onToggle(!archived);
        });
      }}
      className={`a-btn a-btn--sm ${archived ? "a-btn--ghost" : "a-btn--danger"}`}
    >
      {pending ? "…" : archived ? labels.restore : labels.archive}
    </button>
  );
}
