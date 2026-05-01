"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { createBadgeAction, type CreateBadgeState } from "../_actions/badge-actions";

export const dynamic = "force-dynamic";

const BORDER = "#2A2560";
const DANGER = "#FF4D6D";

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#6B6890",
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(5,4,26,0.8)",
  border: `1px solid ${BORDER}`,
  color: "#F5F5FA",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  padding: "11px 14px",
  outline: "none",
  boxSizing: "border-box",
};

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {hint && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#44406B",
            margin: "0 0 6px",
          }}
        >
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: DANGER, margin: "4px 0 0" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const initialState: CreateBadgeState = {};

export default function NewBadgePage(): React.ReactElement {
  const [state, action, isPending] = useActionState(createBadgeAction, initialState);

  return (
    <div className="admin-page-content" style={{ maxWidth: 780 }}>
      <div className="admin-page-header">
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B6890",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ width: 14, height: 1, background: DANGER, display: "inline-block" }} />
            Admin / Badges / Nouveau
          </div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 24,
              fontWeight: 700,
              color: "#F5F5FA",
              margin: 0,
            }}
          >
            Créer un badge
          </h1>
        </div>
        <Link
          href="/badges"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6B6890",
            border: `1px solid ${BORDER}`,
            padding: "9px 16px",
          }}
        >
          ← Retour
        </Link>
      </div>

      {state.error && (
        <div
          style={{
            padding: "13px 16px",
            background: "rgba(255,77,109,0.08)",
            border: "1px solid rgba(255,77,109,0.35)",
            borderLeft: `3px solid ${DANGER}`,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: DANGER,
            marginBottom: 24,
          }}
        >
          {state.error}
        </div>
      )}

      <form action={action}>
        <div className="admin-form-grid-2" style={{ gap: 20 }}>
          <Field label="Ref Code *" error={state.fieldErrors?.refCode}>
            <input
              name="refCode"
              type="text"
              required
              placeholder="CL-BDG-001"
              style={INPUT_STYLE}
            />
          </Field>
          <Field label="Nom *" error={state.fieldErrors?.name}>
            <input
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="Première connexion"
              style={INPUT_STYLE}
            />
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Description *" error={state.fieldErrors?.description}>
              <textarea
                name="description"
                required
                minLength={5}
                maxLength={500}
                rows={3}
                placeholder="Description du badge…"
                style={{ ...INPUT_STYLE, resize: "vertical" }}
              />
            </Field>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="URL icône *" error={state.fieldErrors?.iconUrl}>
              <input
                name="iconUrl"
                type="url"
                required
                placeholder="https://…/badge.svg"
                style={INPUT_STYLE}
              />
            </Field>
          </div>
          <Field label="Rareté *" error={state.fieldErrors?.rarity}>
            <select
              name="rarity"
              required
              defaultValue=""
              style={{ ...INPUT_STYLE, appearance: "none" }}
            >
              <option value="" disabled style={{ background: "#0A0826" }}>
                Choisir…
              </option>
              <option value="COMMON" style={{ background: "#0A0826" }}>
                Commun
              </option>
              <option value="UNCOMMON" style={{ background: "#0A0826" }}>
                Peu commun
              </option>
              <option value="RARE" style={{ background: "#0A0826" }}>
                Rare
              </option>
              <option value="EPIC" style={{ background: "#0A0826" }}>
                Épique
              </option>
              <option value="LEGENDARY" style={{ background: "#0A0826" }}>
                Légendaire
              </option>
            </select>
          </Field>
          <Field label="Type de critère *" error={state.fieldErrors?.criterionType}>
            <select
              name="criterionType"
              required
              defaultValue=""
              style={{ ...INPUT_STYLE, appearance: "none" }}
            >
              <option value="" disabled style={{ background: "#0A0826" }}>
                Choisir…
              </option>
              <option value="LESSON_COMPLETED" style={{ background: "#0A0826" }}>
                Leçon complétée
              </option>
              <option value="PATH_COMPLETED" style={{ background: "#0A0826" }}>
                Parcours complété
              </option>
              <option value="XP_THRESHOLD" style={{ background: "#0A0826" }}>
                Seuil XP
              </option>
              <option value="STREAK_DAYS" style={{ background: "#0A0826" }}>
                Jours de streak
              </option>
              <option value="LESSON_COUNT" style={{ background: "#0A0826" }}>
                Nombre de leçons
              </option>
              <option value="PERFECT_QUIZ" style={{ background: "#0A0826" }}>
                Quiz parfait
              </option>
              <option value="FIRST_LOGIN" style={{ background: "#0A0826" }}>
                Première connexion
              </option>
              <option value="MANUAL" style={{ background: "#0A0826" }}>
                Manuel
              </option>
            </select>
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label="Données du critère (JSON) *"
              error={state.fieldErrors?.criterionData}
              hint='Ex: {"count": 5} ou {"xpThreshold": 1000} ou {"lessonId": "uuid"}'
            >
              <input
                name="criterionData"
                type="text"
                required
                placeholder='{"count": 1}'
                style={INPUT_STYLE}
              />
            </Field>
          </div>
          <Field label="Récompense XP" error={state.fieldErrors?.xpReward}>
            <input
              name="xpReward"
              type="number"
              min={0}
              max={10000}
              defaultValue="0"
              placeholder="0"
              style={INPUT_STYLE}
            />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: "13px 28px",
              background: "#0024FF",
              border: "1px solid #0024FF",
              color: "#fff",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Création…" : "Créer le badge"}
          </button>
          <Link
            href="/badges"
            style={{
              padding: "13px 24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "transparent",
              border: `1px solid ${BORDER}`,
              color: "#6B6890",
            }}
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
