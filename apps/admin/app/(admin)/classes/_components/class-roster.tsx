"use client";

import React, { useActionState, useTransition } from "react";
import {
  addMembersAction,
  assignTeacherAction,
  removeMemberAction,
  revokeInvitationAction,
  unassignTeacherAction,
  type AddMembersState,
} from "../_actions/class-actions";
import { Card, EmptyState } from "../../_components/admin-ui";
import { MemberPicker, type PickableUser } from "./member-picker";

// Who teaches the class and who is in it, with every way to change both.
//
// Built from the console's kit rather than from its own constants. This file
// used to declare BORDER, MUTED, FG and DANGER and then nine style objects -
// PANEL, ROW, SMALL_BTN, INPUT, SUBMIT and the rest - which is why this screen
// did not look like the pages either side of it. It is .a-card, .a-table,
// .a-field and .a-btn now, the same ones the users list uses.

/** An address holding a place in the class until it has an account. */
export interface PendingInvitation {
  id: string;
  email: string;
  invitedBy: string;
  expiresAt: string;
  expired: boolean;
}

export function ClassRoster({
  classId,
  teachers,
  members,
  teacherPool,
  candidates,
  invitations,
}: {
  classId: string;
  teachers: { id: string; name: string; subject: string | null }[];
  members: { id: string; name: string; email: string; role: string; joinedAt: string }[];
  teacherPool: { id: string; label: string }[];
  candidates: PickableUser[];
  invitations: PendingInvitation[];
}): React.ReactElement {
  return (
    <div className="admin-roster-grid">
      <Teachers classId={classId} teachers={teachers} pool={teacherPool} />
      {/* The invitations sit under the members because they are the same list
          at an earlier stage - a place held for someone who has not arrived. */}
      <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
        <Members classId={classId} members={members} candidates={candidates} />
        <Invitations classId={classId} invitations={invitations} />
      </div>
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
  candidates,
}: {
  classId: string;
  members: { id: string; name: string; email: string; role: string; joinedAt: string }[];
  candidates: PickableUser[];
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<AddMembersState, FormData>(
    addMembersAction,
    {},
  );
  const [removing, startRemove] = useTransition();

  return (
    <Card title={`Élèves · ${String(members.length)}`} pad>
      {members.length === 0 ? (
        <EmptyState
          title="Aucun élève"
          text="Choisis des comptes existants, ou colle des adresses pour inviter."
        />
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

      <div style={{ marginTop: 16 }}>
        <MemberPicker classId={classId} candidates={candidates} />
      </div>

      <form action={formAction} className="a-form" style={{ marginTop: 22 }}>
        <input type="hidden" name="classId" value={classId} />

        <label className="a-field">
          <span className="a-label">Ou colle une liste d&apos;adresses</span>
          <textarea
            name="emails"
            rows={4}
            required
            placeholder={"eleve1@ecole.fr\neleve2@ecole.fr"}
            className="a-textarea"
          />
          <span className="a-field-hint">
            Une adresse par ligne. Celles qui ont un compte rejoignent la classe tout de suite ; les
            autres reçoivent une invitation et prendront leur place à l&apos;inscription.
          </span>
        </label>

        <button type="submit" disabled={pending} className="a-btn a-btn--primary">
          {pending ? "…" : "Ajouter ou inviter"}
        </button>

        {state.added !== undefined && state.added > 0 && (
          <p className="a-form-notice">
            {state.added} élève{state.added > 1 ? "s" : ""} ajouté{state.added > 1 ? "s" : ""}.
          </p>
        )}
        {state.invited !== undefined && state.invited.length > 0 && (
          <p className="a-form-notice">
            {state.invited.length} invitation{state.invited.length > 1 ? "s" : ""} envoyée
            {state.invited.length > 1 ? "s" : ""} : {state.invited.join(", ")}
          </p>
        )}
        {/* Renewals are not mailed. Re-pasting a roster is how the three missing
            students get added, and the seventeen already invited should not get
            the same message again for it. */}
        {state.renewed !== undefined && state.renewed.length > 0 && (
          <p className="a-form-notice">
            Déjà invité{state.renewed.length > 1 ? "s" : ""}, validité prolongée :{" "}
            {state.renewed.join(", ")}
          </p>
        )}
        {/* The place is held either way; what failed is the telling. */}
        {state.mailFailed !== undefined && state.mailFailed.length > 0 && (
          <p className="a-form-error">
            Invitation enregistrée mais e-mail non envoyé : {state.mailFailed.join(", ")}
          </p>
        )}
        {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
      </form>
    </Card>
  );
}

function Invitations({
  classId,
  invitations,
}: {
  classId: string;
  invitations: PendingInvitation[];
}): React.ReactElement | null {
  const [revoking, startRevoke] = useTransition();

  // Nothing pending is not an empty state worth a box: the way to create one is
  // in the card above, and an empty card here would only ask to be filled.
  if (invitations.length === 0) return null;

  return (
    <Card title={`Invitations en attente · ${String(invitations.length)}`} pad>
      <div className="a-table-wrap">
        <table className="a-table">
          <tbody>
            {invitations.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className="mono">{i.email}</span>
                  <br />
                  <span className="a-field-hint">
                    {/* An expiry is a fact about the invitation, so a lapsed one
                        is shown rather than swept away - otherwise it looks like
                        it was never sent. */}
                    {i.expired ? "Expirée le" : "Valable jusqu'au"} {i.expiresAt} · par{" "}
                    {i.invitedBy}
                  </span>
                </td>
                <td align="right">
                  <button
                    type="button"
                    disabled={revoking}
                    onClick={() => {
                      startRevoke(async () => {
                        await revokeInvitationAction(classId, i.id);
                      });
                    }}
                    className="a-btn a-btn--danger a-btn--sm"
                  >
                    Révoquer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
