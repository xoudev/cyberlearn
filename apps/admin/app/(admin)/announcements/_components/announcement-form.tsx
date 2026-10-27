"use client";

// "use client" justified: the audience controls follow the kind picked, and
// the send is two steps - count, then confirm that count - held in state.

import React, { useState, useTransition } from "react";
import type { UserRole } from "@cyberlearn/db";
import { ANNOUNCEMENT_LIMITS, audienceLabel, type AnnouncementInput } from "@/lib/announcement";
import { ROLE_LABEL, ROLES } from "@/lib/roles";
import { Card } from "../../_components/admin-ui";
import {
  countAnnouncementRecipientsAction,
  sendAnnouncementAction,
} from "../_actions/announcement-actions";

export interface AnnouncementClassOption {
  id: string;
  name: string;
  school: string;
  promotion: string;
  members: number;
}

type AudienceKind = AnnouncementInput["audience"]["kind"];

type Stage =
  | { step: "edit" }
  | { step: "confirm"; recipients: number }
  | { step: "sent"; sent: number; title: string };

const CHECK_STYLE: React.CSSProperties = { accentColor: "var(--a-accent)", width: 16, height: 16 };

const OPTION_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 44,
  cursor: "pointer",
};

const KINDS: readonly { value: AudienceKind; label: string }[] = [
  { value: "ALL", label: "Tous les comptes" },
  { value: "ROLES", label: "Par rôle" },
  { value: "CLASSES", label: "Par classe" },
];

function plural(count: number, word: string): string {
  return `${count.toLocaleString("fr-FR")} ${word}${count > 1 ? "s" : ""}`;
}

function toggled<T>(set: ReadonlySet<T>, value: T, on: boolean): Set<T> {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

/**
 * The announcement form: a title, a message, an optional page of the site to
 * open, and who receives it. "Compter les destinataires" asks the server how
 * many accounts that is; the send button then names that number, and the
 * fields stay locked until it is sent or "Modifier" puts them back.
 */
export function AnnouncementForm({
  classes,
}: {
  classes: readonly AnnouncementClassOption[];
}): React.ReactElement {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [kind, setKind] = useState<AudienceKind>("ALL");
  const [roles, setRoles] = useState<ReadonlySet<UserRole>>(() => new Set());
  const [classIds, setClassIds] = useState<ReadonlySet<string>>(() => new Set());
  const [stage, setStage] = useState<Stage>({ step: "edit" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  const schools = new Map<string, AnnouncementClassOption[]>();
  for (const option of classes) {
    schools.set(option.school, [...(schools.get(option.school) ?? []), option]);
  }

  function audience(): AnnouncementInput["audience"] {
    switch (kind) {
      case "ALL":
        return { kind: "ALL" };
      case "ROLES":
        return { kind: "ROLES", roles: ROLES.filter((role) => roles.has(role)) };
      case "CLASSES":
        return {
          kind: "CLASSES",
          classIds: classes.map((c) => c.id).filter((id) => classIds.has(id)),
        };
    }
  }

  function input(): AnnouncementInput {
    return { title, body, actionUrl, audience: audience() };
  }

  function count(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await countAnnouncementRecipientsAction(input());
      if (result.ok) setStage({ step: "confirm", recipients: result.recipients });
      else setError(result.error);
    });
  }

  function send(recipients: number): void {
    setError(null);
    startTransition(async () => {
      const result = await sendAnnouncementAction({ ...input(), confirmedRecipients: recipients });
      if (result.ok) {
        setStage({ step: "sent", sent: result.sent, title });
        setTitle("");
        setBody("");
        setActionUrl("");
        return;
      }
      setError(result.error);
      // A count that moved is shown for confirming again; anything else goes
      // back to the fields.
      setStage(
        result.recipients !== undefined && result.recipients > 0
          ? { step: "confirm", recipients: result.recipients }
          : { step: "edit" },
      );
    });
  }

  const confirming = stage.step === "confirm";

  return (
    <Card title="Nouvelle annonce" pad>
      <form onSubmit={count} className="a-form">
        <fieldset
          disabled={confirming || pending}
          className="a-form"
          style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}
        >
          <label className="a-field">
            <span className="a-label">Titre</span>
            <input
              name="title"
              required
              minLength={ANNOUNCEMENT_LIMITS.titleMin}
              maxLength={ANNOUNCEMENT_LIMITS.titleMax}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              placeholder="Maintenance samedi matin"
              className="a-input"
            />
            <span className="a-field-hint">
              {title.length} / {ANNOUNCEMENT_LIMITS.titleMax} · le titre de la notification.
            </span>
          </label>

          <label className="a-field">
            <span className="a-label">Message</span>
            <textarea
              name="body"
              required
              maxLength={ANNOUNCEMENT_LIMITS.bodyMax}
              rows={4}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              placeholder="Le site sera indisponible samedi de 8 h à 9 h."
              className="a-textarea"
            />
            <span className="a-field-hint">
              {body.length} / {ANNOUNCEMENT_LIMITS.bodyMax.toLocaleString("fr-FR")}
            </span>
          </label>

          <label className="a-field">
            <span className="a-label">
              Lien<span className="a-label-optional"> · optionnel</span>
            </span>
            <input
              name="actionUrl"
              maxLength={ANNOUNCEMENT_LIMITS.linkMax}
              value={actionUrl}
              onChange={(e) => {
                setActionUrl(e.target.value);
              }}
              placeholder="/paths"
              className="a-input"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="a-field-hint">
              Une page du site, qui commence par « / » (/paths, /lessons/mon-slug) : la notification
              l&apos;ouvre. Si l&apos;app n&apos;a pas cet écran, la notification s&apos;y lit sans
              rien ouvrir.
            </span>
          </label>

          <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
            <legend className="a-label" style={{ marginBottom: 8 }}>
              Destinataires
            </legend>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {KINDS.map((option) => (
                <label key={option.value} style={OPTION_STYLE}>
                  <input
                    type="radio"
                    name="kind"
                    value={option.value}
                    checked={kind === option.value}
                    disabled={option.value === "CLASSES" && classes.length === 0}
                    onChange={() => {
                      setKind(option.value);
                    }}
                    style={CHECK_STYLE}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {kind === "ALL" && (
            <span className="a-field-hint">
              Chaque compte de la plateforme, sauf ceux qui sont bannis.
            </span>
          )}

          {kind === "ROLES" && (
            <div style={{ display: "grid", gap: 6 }}>
              {ROLES.map((role) => (
                <label key={role} style={OPTION_STYLE}>
                  <input
                    type="checkbox"
                    name="roles"
                    value={role}
                    checked={roles.has(role)}
                    onChange={(e) => {
                      setRoles(toggled(roles, role, e.target.checked));
                    }}
                    style={CHECK_STYLE}
                  />
                  {ROLE_LABEL[role]}
                </label>
              ))}
              <span className="a-field-hint">Les comptes bannis ne la reçoivent pas.</span>
            </div>
          )}

          {kind === "CLASSES" && (
            <div style={{ display: "grid", gap: 12 }}>
              {[...schools.entries()].map(([school, options]) => (
                <fieldset key={school} style={{ border: "none", margin: 0, padding: 0 }}>
                  <legend className="a-label" style={{ marginBottom: 6 }}>
                    {school}
                  </legend>
                  <div style={{ display: "grid", gap: 6 }}>
                    {options.map((option) => (
                      <label key={option.id} style={OPTION_STYLE}>
                        <input
                          type="checkbox"
                          name="classIds"
                          value={option.id}
                          checked={classIds.has(option.id)}
                          onChange={(e) => {
                            setClassIds(toggled(classIds, option.id, e.target.checked));
                          }}
                          style={CHECK_STYLE}
                        />
                        <span>
                          {option.name}
                          <span style={{ color: "var(--a-muted)" }}>
                            {" "}
                            · {option.promotion} · {plural(option.members, "membre")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <span className="a-field-hint">
                Les élèves membres de ces classes, chacun une fois. Leurs professeurs n&apos;en font
                pas partie : choisis le rôle Professeur pour les prévenir. Les comptes bannis ne la
                reçoivent pas.
              </span>
            </div>
          )}
        </fieldset>

        {confirming ? (
          <div className="a-stack-tight">
            <p className="a-form-notice">
              L&apos;annonce « {title.trim()} » partira à {plural(stage.recipients, "compte")}
              {` (${audienceLabel(audience(), classNames)}). `}
              Elle arrive dans les notifications du site et de l&apos;app, et ne s&apos;annule pas.
            </p>
            <div className="a-row-actions">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  send(stage.recipients);
                }}
                className="a-btn a-btn--primary"
              >
                {pending ? "Envoi…" : `Envoyer à ${plural(stage.recipients, "compte")}`}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setStage({ step: "edit" });
                }}
                className="a-btn a-btn--ghost"
              >
                Modifier
              </button>
            </div>
          </div>
        ) : (
          <div className="a-row-actions">
            <button type="submit" disabled={pending} className="a-btn a-btn--primary">
              {pending ? "…" : "Compter les destinataires"}
            </button>
          </div>
        )}

        {error !== null && (
          <p className="a-form-error" role="alert">
            {error}
          </p>
        )}
        {stage.step === "sent" && error === null && (
          <p className="a-form-notice" role="status">
            L&apos;annonce « {stage.title.trim()} » est partie à {plural(stage.sent, "compte")}.
          </p>
        )}
      </form>
    </Card>
  );
}
