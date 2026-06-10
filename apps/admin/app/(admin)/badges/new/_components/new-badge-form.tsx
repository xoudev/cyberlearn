"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import { createBadgeAction, type CreateBadgeState } from "../../_actions/badge-actions";

export interface LessonOption {
  id: string;
  title: string;
  slug: string;
  category: string;
}

export interface PathOption {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  lessons: LessonOption[];
  paths: PathOption[];
}

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

const CRITERION_LABELS: Record<string, string> = {
  LESSON_COMPLETED: "Leçons complétées (N total)",
  PATH_COMPLETED: "Parcours complété",
  XP_THRESHOLD: "Seuil XP atteint",
  STREAK_DAYS: "Jours de streak consécutifs",
  CATEGORY_MASTERY: "Maîtrise d'une catégorie",
  LESSON_SPECIFIC: "Leçon spécifique complétée",
  PERFECT_QUIZ: "Quiz parfaits (N scores de 100 %)",
  CUSTOM: "Personnalisé (événement)",
};

const CATEGORY_OPTIONS = ["DEV", "CYBERSEC", "NETWORK", "CLOUD", "OSINT"] as const;

function CriterionFields({
  type,
  lessons,
  criterionError,
}: {
  type: string;
  lessons: LessonOption[];
  criterionError?: string;
}) {
  if (type === "") return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {criterionError && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: DANGER, margin: 0 }}>
          {criterionError}
        </p>
      )}

      {type === "LESSON_COMPLETED" && (
        <Field
          label="Nombre de leçons *"
          hint="L'utilisateur doit avoir complété N leçons au total."
        >
          <input
            name="criterion_count"
            type="number"
            min={1}
            max={9999}
            required
            style={INPUT_STYLE}
            placeholder="10"
          />
        </Field>
      )}

      {type === "PATH_COMPLETED" && (
        <>
          <Field label="Condition">
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                name="criterion_withCertificate"
                type="checkbox"
                value="1"
                style={{ accentColor: "#0AFFD4", width: 16, height: 16 }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8B5D1" }}>
                Obtenir un certificat (peu importe le parcours)
              </span>
            </label>
          </Field>
          <Field
            label="Ou : nombre de parcours *"
            hint="Si la case ci-dessus est cochée, ce champ est ignoré."
          >
            <input
              name="criterion_count"
              type="number"
              min={1}
              max={999}
              defaultValue={1}
              style={INPUT_STYLE}
            />
          </Field>
        </>
      )}

      {type === "XP_THRESHOLD" && (
        <Field label="Seuil XP *" hint="L'utilisateur doit avoir accumulé au moins N XP au total.">
          <input
            name="criterion_threshold"
            type="number"
            min={1}
            max={1000000}
            required
            style={INPUT_STYLE}
            placeholder="1000"
          />
        </Field>
      )}

      {type === "STREAK_DAYS" && (
        <Field
          label="Nombre de jours *"
          hint="L'utilisateur doit maintenir un streak de N jours consécutifs."
        >
          <input
            name="criterion_days"
            type="number"
            min={1}
            max={365}
            required
            style={INPUT_STYLE}
            placeholder="7"
          />
        </Field>
      )}

      {type === "CATEGORY_MASTERY" && (
        <>
          <Field label="Catégorie *">
            <select
              name="criterion_category"
              required
              defaultValue=""
              style={{ ...INPUT_STYLE, appearance: "none" }}
            >
              <option value="" disabled style={{ background: "#0A0826" }}>
                Choisir…
              </option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat} style={{ background: "#0A0826" }}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Nombre de leçons *"
            hint="L'utilisateur doit avoir complété N leçons dans cette catégorie."
          >
            <input
              name="criterion_count"
              type="number"
              min={1}
              max={9999}
              required
              style={INPUT_STYLE}
              placeholder="5"
            />
          </Field>
        </>
      )}

      {type === "LESSON_SPECIFIC" && (
        <Field
          label="Leçon *"
          hint={
            lessons.length === 0
              ? "Aucune leçon publiée disponible."
              : `${String(lessons.length)} leçon(s) publiée(s)`
          }
        >
          {lessons.length > 0 ? (
            <select
              name="criterion_lessonId"
              required
              defaultValue=""
              style={{ ...INPUT_STYLE, appearance: "none" }}
            >
              <option value="" disabled style={{ background: "#0A0826" }}>
                Choisir une leçon…
              </option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id} style={{ background: "#0A0826" }}>
                  [{l.category}] {l.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="criterion_lessonId"
              type="text"
              required
              placeholder="UUID de la leçon"
              style={INPUT_STYLE}
            />
          )}
        </Field>
      )}

      {type === "PERFECT_QUIZ" && (
        <Field
          label="Nombre de quiz parfaits *"
          hint="L'utilisateur doit obtenir N scores de 100 % aux quiz de parcours."
        >
          <input
            name="criterion_count"
            type="number"
            min={1}
            max={999}
            required
            defaultValue={1}
            style={INPUT_STYLE}
          />
        </Field>
      )}

      {type === "CUSTOM" && (
        <Field
          label="Événement *"
          hint="Attribué quand l'événement se produit. Supporté : placement_test_passed (au moins une catégorie maîtrisée au test de positionnement)."
        >
          <input
            name="criterion_event"
            type="text"
            required
            maxLength={100}
            placeholder="placement_test_passed"
            style={INPUT_STYLE}
          />
        </Field>
      )}
    </div>
  );
}

const initialState: CreateBadgeState = {};

export function NewBadgeForm({ lessons }: Props): React.ReactElement {
  const [state, action, isPending] = useActionState(createBadgeAction, initialState);
  const [criterionType, setCriterionType] = useState("");

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
          {/* ── Identity ── */}
          <Field label="Ref Code *" error={state.fieldErrors?.refCode}>
            <input
              name="refCode"
              type="text"
              required
              placeholder="CL-BDG-042"
              style={INPUT_STYLE}
            />
          </Field>
          <Field label="Nom *" error={state.fieldErrors?.name}>
            <input
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="Premier pas"
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
                placeholder="Description visible par l'utilisateur…"
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

          {/* ── Rarity ── */}
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

          {/* ── XP Reward ── */}
          <Field label="Récompense XP" error={state.fieldErrors?.xpReward}>
            <input
              name="xpReward"
              type="number"
              min={0}
              max={10000}
              defaultValue="0"
              style={INPUT_STYLE}
            />
          </Field>

          {/* ── Criterion type ── */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Type de condition *" error={state.fieldErrors?.criterionType}>
              <select
                name="criterionType"
                required
                value={criterionType}
                onChange={(e) => {
                  setCriterionType(e.target.value);
                }}
                style={{ ...INPUT_STYLE, appearance: "none" }}
              >
                <option value="" disabled style={{ background: "#0A0826" }}>
                  Choisir…
                </option>
                {Object.entries(CRITERION_LABELS).map(([val, label]) => (
                  <option key={val} value={val} style={{ background: "#0A0826" }}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Criterion-specific fields ── */}
          {criterionType && (
            <div
              style={{
                gridColumn: "1 / -1",
                background: "rgba(10,8,38,0.6)",
                border: "1px solid #1F1B47",
                borderLeft: "3px solid #2A2560",
                borderRadius: 8,
                padding: "18px 20px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#44406B",
                  margin: "0 0 14px",
                }}
              >
                Paramètres de la condition
              </p>
              <CriterionFields
                type={criterionType}
                lessons={lessons}
                {...(state.fieldErrors?.criterion !== undefined && {
                  criterionError: state.fieldErrors.criterion,
                })}
              />
            </div>
          )}
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
