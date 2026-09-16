"use client";

import React, { useActionState, useTransition } from "react";
import {
  setClassArchivedAction,
  updateClassAction,
  type ActionState,
} from "../_actions/class-actions";
import { Card } from "../../_components/admin-ui";

/**
 * The class's own fields, on the page that already shows everything else
 * about it.
 *
 * setClassArchivedAction has existed since classes did, and nothing called it:
 * a class could be created and filled, never renamed and never retired. The
 * form sits behind a <details> because the page is read far more often than it
 * is edited - the roster is what someone came for.
 */
export function ClassDetailsForm({
  classId,
  name,
  slug,
  description,
  archived,
}: {
  classId: string;
  name: string;
  slug: string;
  description: string | null;
  archived: boolean;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateClassAction, {});
  const [archiving, startArchive] = useTransition();

  return (
    <Card title="Informations" pad>
      <details className="a-disclosure">
        <summary className="a-disclosure-head">
          <span className="a-disclosure-title">Modifier la classe</span>
          <span className="mono a-disclosure-meta">{slug}</span>
        </summary>

        <form action={formAction} className="a-form a-disclosure-body">
          <input type="hidden" name="id" value={classId} />

          <label className="a-field">
            <span className="a-label">Nom</span>
            <input name="name" defaultValue={name} required className="a-input" />
          </label>

          <label className="a-field">
            <span className="a-label">Slug</span>
            <input name="slug" defaultValue={slug} required className="a-input" />
            <span className="a-field-hint">Unique au sein de la promo.</span>
          </label>

          <label className="a-field">
            <span className="a-label">
              Description<span className="a-label-optional"> · optionnel</span>
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={description ?? ""}
              className="a-textarea"
            />
          </label>

          <div className="a-row-actions">
            <button type="submit" disabled={pending} className="a-btn a-btn--primary">
              {pending ? "…" : "Enregistrer"}
            </button>

            {/* Archive rather than delete: a class carries who was in it, and
                that is history rather than clutter. */}
            <button
              type="button"
              disabled={archiving}
              onClick={() => {
                startArchive(async () => {
                  await setClassArchivedAction(classId, !archived);
                });
              }}
              className={`a-btn a-btn--sm ${archived ? "a-btn--ghost" : "a-btn--danger"}`}
            >
              {archiving ? "…" : archived ? "Restaurer la classe" : "Archiver la classe"}
            </button>
          </div>

          {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
          {state.ok === true && <p className="a-form-notice">Enregistré.</p>}
        </form>
      </details>
    </Card>
  );
}
