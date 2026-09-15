"use client";

import React, { useActionState, useState } from "react";
import {
  createClassAction,
  createEstablishmentAction,
  createPromotionAction,
  type ActionState,
} from "../_actions/class-actions";

const BORDER = "#2A2560";
const MUTED = "#8B88A8";

/**
 * The three creation forms, side by side rather than on three separate pages.
 *
 * Setting a school up means doing all three in one sitting - establishment,
 * intake, class - and a wizard spread over three routes would make that a
 * navigation exercise. Each form disables itself until the level above it
 * exists, which is the only ordering constraint there is.
 */
export function ComposeForms({
  establishments,
}: {
  establishments: { id: string; name: string; promotions: { id: string; name: string }[] }[];
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const promotions = establishments.flatMap((e) =>
    e.promotions.map((p) => ({ ...p, establishment: e.name })),
  );

  return (
    <div style={{ marginTop: 20 }}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: open ? "#05041A" : MUTED,
          background: open ? "var(--cosmetic-accent, #0AFFD4)" : "transparent",
          border: `1px dashed ${BORDER}`,
          padding: "8px 12px",
          cursor: "pointer",
        }}
      >
        {open ? "Fermer" : "+ Créer"}
      </button>

      {open && (
        <div className="admin-compose-grid" style={{ marginTop: 16 }}>
          <Form
            title="Établissement"
            action={createEstablishmentAction}
            fields={[
              { name: "name", label: "Nom", placeholder: "Lycée Jean Moulin", required: true },
              { name: "slug", label: "Slug", placeholder: "jean-moulin", required: true },
              { name: "city", label: "Ville", placeholder: "Lyon" },
            ]}
          />

          <Form
            title="Promo"
            action={createPromotionAction}
            disabled={establishments.length === 0}
            disabledHint="Crée d'abord un établissement."
            select={{
              name: "establishmentId",
              label: "Établissement",
              options: establishments.map((e) => ({ value: e.id, label: e.name })),
            }}
            fields={[
              { name: "name", label: "Nom", placeholder: "BTS SIO 2025-2026", required: true },
              { name: "slug", label: "Slug", placeholder: "sio-2025", required: true },
              { name: "startYear", label: "Année de début", placeholder: "2025" },
            ]}
          />

          <Form
            title="Classe"
            action={createClassAction}
            disabled={promotions.length === 0}
            disabledHint="Crée d'abord une promo."
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
              { name: "slug", label: "Slug", placeholder: "sio1-a", required: true },
              { name: "description", label: "Description", placeholder: "Optionnel" },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function Form({
  title,
  action,
  fields,
  select,
  disabled = false,
  disabledHint,
}: {
  title: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: { name: string; label: string; placeholder?: string; required?: boolean }[];
  select?: { name: string; label: string; options: { value: string; label: string }[] };
  disabled?: boolean;
  disabledHint?: string;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form
      action={formAction}
      style={{ border: `1px solid ${BORDER}`, padding: "14px 16px", opacity: disabled ? 0.45 : 1 }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      {select && (
        <label style={LABEL}>
          {select.label}
          <select name={select.name} required disabled={disabled} style={INPUT}>
            {select.options.map((o) => (
              <option key={o.value} value={o.value} style={{ background: "#0A0826" }}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {fields.map((f) => (
        <label key={f.name} style={LABEL}>
          {f.label}
          <input
            name={f.name}
            placeholder={f.placeholder}
            required={f.required ?? false}
            disabled={disabled}
            style={INPUT}
          />
        </label>
      ))}

      <button type="submit" disabled={disabled || pending} style={SUBMIT}>
        {pending ? "…" : "Créer"}
      </button>

      {disabled && disabledHint !== undefined && <p style={HINT}>{disabledHint}</p>}
      {state.error !== undefined && <p style={{ ...HINT, color: "#FF4D6D" }}>{state.error}</p>}
      {state.ok === true && <p style={{ ...HINT, color: "#0AFFD4" }}>Créé.</p>}
    </form>
  );
}

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
  color: "#F5F5FA",
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
