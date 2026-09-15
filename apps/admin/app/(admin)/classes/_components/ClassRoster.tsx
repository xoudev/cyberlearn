"use client";

import React, { useActionState, useTransition } from "react";
import {
  addMembersAction,
  assignTeacherAction,
  removeMemberAction,
  unassignTeacherAction,
  type AddMembersState,
} from "../_actions/class-actions";

const BORDER = "#2A2560";
const MUTED = "#8B88A8";
const FG = "#F5F5FA";
const DANGER = "#FF4D6D";

/** Who teaches the class and who is in it, with the two ways to change both. */
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
    <div className="admin-roster-grid" style={{ marginTop: 28 }}>
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
    <section style={PANEL}>
      <h2 style={PANEL_TITLE}>Professeurs ({teachers.length})</h2>

      {teachers.length === 0 ? (
        <p style={HINT}>Aucun professeur assigné.</p>
      ) : (
        <ul style={LIST}>
          {teachers.map((t) => (
            <li key={t.id} style={ROW}>
              <span style={{ minWidth: 0 }}>
                <span style={{ color: FG, fontSize: 13 }}>{t.name}</span>
                {t.subject !== null && (
                  <span className="mono" style={{ color: MUTED, fontSize: 11 }}>
                    {" "}
                    · {t.subject}
                  </span>
                )}
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  startRemove(async () => {
                    await unassignTeacherAction(classId, t.id);
                  });
                }}
                style={{ ...SMALL_BTN, color: DANGER, borderColor: DANGER }}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} style={{ marginTop: 14 }}>
        <input type="hidden" name="classId" value={classId} />
        <label style={LABEL}>
          Ajouter
          <select name="teacherId" required style={INPUT}>
            {pool.map((p) => (
              <option key={p.id} value={p.id} style={{ background: "#0A0826" }}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label style={LABEL}>
          Matière
          <input name="subject" placeholder="Réseaux (optionnel)" style={INPUT} />
        </label>
        <button type="submit" disabled={pending || pool.length === 0} style={SUBMIT}>
          {pending ? "…" : "Assigner"}
        </button>
        {pool.length === 0 && (
          <p style={HINT}>Aucun compte n&apos;a le rôle Professeur. Change un rôle d&apos;abord.</p>
        )}
        {state.error !== undefined && <p style={{ ...HINT, color: DANGER }}>{state.error}</p>}
      </form>
    </section>
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
    <section style={PANEL}>
      <h2 style={PANEL_TITLE}>Élèves ({members.length})</h2>

      {members.length === 0 ? (
        <p style={HINT}>Aucun élève.</p>
      ) : (
        <ul style={{ ...LIST, maxHeight: 360, overflowY: "auto" }}>
          {members.map((m) => (
            <li key={m.id} style={ROW}>
              <span style={{ minWidth: 0, overflow: "hidden" }}>
                <span style={{ color: FG, fontSize: 13 }}>{m.name}</span>
                <br />
                <span className="mono" style={{ color: MUTED, fontSize: 10.5 }}>
                  {m.email}
                </span>
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  startRemove(async () => {
                    await removeMemberAction(classId, m.id);
                  });
                }}
                style={{ ...SMALL_BTN, color: DANGER, borderColor: DANGER }}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} style={{ marginTop: 14 }}>
        <input type="hidden" name="classId" value={classId} />
        <label style={LABEL}>
          Emails (un par ligne)
          <textarea
            name="emails"
            rows={4}
            required
            placeholder={"eleve1@ecole.fr\neleve2@ecole.fr"}
            style={{ ...INPUT, resize: "vertical" }}
          />
        </label>
        <button type="submit" disabled={pending} style={SUBMIT}>
          {pending ? "…" : "Ajouter à la classe"}
        </button>

        {state.added !== undefined && (
          <p style={{ ...HINT, color: "#0AFFD4" }}>{state.added} élève(s) ajouté(s).</p>
        )}
        {/* A typo in a pasted list is the normal case; adding nineteen of
            twenty in silence is how it goes unnoticed until someone complains. */}
        {state.unknown !== undefined && state.unknown.length > 0 && (
          <p style={{ ...HINT, color: DANGER }}>Aucun compte pour : {state.unknown.join(", ")}</p>
        )}
        {state.error !== undefined && <p style={{ ...HINT, color: DANGER }}>{state.error}</p>}
      </form>
    </section>
  );
}

const PANEL: React.CSSProperties = { border: `1px solid ${BORDER}`, padding: "16px 18px" };
const PANEL_TITLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: MUTED,
  margin: "0 0 12px",
};
const LIST: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0 };
const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom: `1px solid rgba(42,37,96,0.5)`,
};
const SMALL_BTN: React.CSSProperties = {
  flex: "none",
  padding: "3px 9px",
  background: "transparent",
  border: `1px solid ${BORDER}`,
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const LABEL: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 10,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: MUTED,
};
const INPUT: React.CSSProperties = {
  padding: "7px 9px",
  background: "#05041A",
  border: `1px solid ${BORDER}`,
  color: FG,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  textTransform: "none",
  letterSpacing: 0,
};
const SUBMIT: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "transparent",
  border: `1px solid ${BORDER}`,
  color: "#B8B5D1",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const HINT: React.CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  color: MUTED,
};
