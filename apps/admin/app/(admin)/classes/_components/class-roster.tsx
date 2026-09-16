"use client";

import React, { useActionState, useTransition } from "react";
import {
  addMembersAction,
  assignTeacherAction,
  removeMemberAction,
  unassignTeacherAction,
  type AddMembersState,
} from "../_actions/class-actions";
import { Card, EmptyState } from "../../_components/admin-ui";

/**
 * Who teaches the class and who is in it, with the two ways to change both.
 *
 * Built from the console's kit rather than from its own constants. This file
 * used to declare BORDER, MUTED, FG and DANGER and then nine style objects -
 * PANEL, ROW, SMALL_BTN, INPUT, SUBMIT and the rest - which is why this screen
 * did not look like the pages either side of it. It is .a-card, .a-table,
 * .a-field and .a-btn now, the same ones the users list uses.
 */
export function ClassRoster({
  classId,
  teachers,
  members,
  teacherPool,
}: {
  classId: string;
  teachers: { id: string; name: string; subject: string | null }[];
  members: { id: string; name: string; email: string; role: string; joinedAt: string }[];
  teacherPool: { id: string; label: string }[];
}): React.ReactElement {
  return (
    <div className="admin-roster-grid">
      <Teachers classId={classId} teachers={teachers} pool={teacherPool} />
      <Members classId={classId} members={members} />
    </div>
  );
}

function Teachers({
  classId,
  teachers,
  pool,
}: {
  classId: string;
  teachers: { id: string; name: string; subject: string | null }[];
  pool: { id: string; label: string }[];
}): React.ReactElement {
  const [state, formAction, pending] = useActionState(assignTeacherAction, {});
  const [removing, startRemove] = useTransition();

  return (
    <Card title={`Professeurs · ${String(teachers.length)}`} pad>
      {teachers.length === 0 ? (
        <EmptyState title="Aucun professeur" text="Assigne un compte ayant le rôle Professeur." />
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="mono">{t.subject ?? "—"}</td>
                  <td align="right">
                    <button
                      type="button"
                      disabled={removing}
                      onClick={() => {
                        startRemove(async () => {
                          await unassignTeacherAction(classId, t.id);
                        });
                      }}
                      className="a-btn a-btn--danger a-btn--sm"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* A pool of zero is not a form to disable, it is a different situation:
          nothing can be assigned until an account holds the role, and the fix
          is on another page. */}
      {pool.length === 0 ? (
        <p className="a-form-notice">
          Aucun compte n&apos;a le rôle Professeur. Change un rôle depuis Utilisateurs.
        </p>
      ) : (
        <form action={formAction} className="a-form" style={{ marginTop: 16 }}>
          <input type="hidden" name="classId" value={classId} />

          <label className="a-field">
            <span className="a-label">Professeur</span>
            <select name="teacherId" required className="a-select">
              {pool.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="a-field">
            <span className="a-label">
              Matière<span className="a-label-optional"> · optionnel</span>
            </span>
            <input name="subject" placeholder="Réseaux" className="a-input" />
            <span className="a-field-hint">
              C&apos;est la raison d&apos;être de plusieurs professeurs sur une classe : le roster
              se lit « Tina (Réseaux), Marc (Cybersécurité) ».
            </span>
          </label>

          <button type="submit" disabled={pending} className="a-btn a-btn--primary">
            {pending ? "…" : "Assigner"}
          </button>

          {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
        </form>
      )}
    </Card>
  );
}

function Members({
  classId,
  members,
}: {
  classId: string;
  members: { id: string; name: string; email: string; role: string; joinedAt: string }[];
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<AddMembersState, FormData>(
    addMembersAction,
    {},
  );
  const [removing, startRemove] = useTransition();

  return (
    <Card title={`Élèves · ${String(members.length)}`} pad>
      {members.length === 0 ? (
        <EmptyState title="Aucun élève" text="Colle des adresses e-mail ci-dessous." />
      ) : (
        <div className="a-table-wrap" style={{ maxHeight: 340, overflowY: "auto" }}>
          <table className="a-table">
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.name}
                    <br />
                    <span className="mono a-field-hint">{m.email}</span>
                  </td>
                  <td align="right">
                    <button
                      type="button"
                      disabled={removing}
                      onClick={() => {
                        startRemove(async () => {
                          await removeMemberAction(classId, m.id);
                        });
                      }}
                      className="a-btn a-btn--danger a-btn--sm"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={formAction} className="a-form" style={{ marginTop: 16 }}>
        <input type="hidden" name="classId" value={classId} />

        <label className="a-field">
          <span className="a-label">Ajouter des élèves</span>
          <textarea
            name="emails"
            rows={4}
            required
            placeholder={"eleve1@ecole.fr\neleve2@ecole.fr"}
            className="a-textarea"
          />
          <span className="a-field-hint">
            Une adresse par ligne. Chaque élève ajouté reçoit une notification et un e-mail.
          </span>
        </label>

        <button type="submit" disabled={pending} className="a-btn a-btn--primary">
          {pending ? "…" : "Ajouter à la classe"}
        </button>

        {state.added !== undefined && (
          <p className="a-form-notice">
            {state.added} élève{state.added > 1 ? "s" : ""} ajouté{state.added > 1 ? "s" : ""}.
          </p>
        )}
        {/* A typo in a pasted list is the normal case; adding nineteen of
            twenty in silence is how it goes unnoticed until someone complains. */}
        {state.unknown !== undefined && state.unknown.length > 0 && (
          <p className="a-form-error">Aucun compte pour : {state.unknown.join(", ")}</p>
        )}
        {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
      </form>
    </Card>
  );
}
