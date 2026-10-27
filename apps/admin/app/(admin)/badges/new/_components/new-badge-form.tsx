"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import { createBadgeAction, type CreateBadgeState } from "../../_actions/badge-actions";
import { Select } from "@cyberlearn/ui";
import { keepFormInput } from "@/lib/form-input";

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
    <div className="a-field">
      <label className="a-label">{label}</label>
      {hint && (
        <p className="a-field-hint" style={{ margin: 0 }}>
          {hint}
        </p>
      )}
      {children}
      {error && <p style={{ margin: 0, fontSize: 12, color: "var(--a-danger)" }}>{error}</p>}
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
        <p style={{ margin: 0, fontSize: 12, color: "var(--a-danger)" }}>{criterionError}</p>
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
            className="a-input"
            placeholder="10"
          />
        </Field>
      )}

      {type === "PATH_COMPLETED" && (
        <>
          <Field label="Condition">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
                cursor: "pointer",
              }}
            >
              <input
                name="criterion_withCertificate"
                type="checkbox"
                value="1"
                style={{ accentColor: "var(--a-accent)", width: 18, height: 18 }}
              />
              <span
                style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--a-fg-2)" }}
              >
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
              className="a-input"
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
            className="a-input"
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
            className="a-input"
            placeholder="7"
          />
        </Field>
      )}

      {type === "CATEGORY_MASTERY" && (
        <>
          <Field label="Catégorie *">
            <Select
              name="criterion_category"
              required
              defaultValue=""
              placeholder="Choisir…"
              options={CATEGORY_OPTIONS.map((cat) => ({ value: cat, label: cat }))}
            />
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
              className="a-input"
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
            <Select
              name="criterion_lessonId"
              required
              defaultValue=""
              placeholder="Choisir une leçon…"
              options={lessons.map((l) => ({
                value: l.id,
                label: l.title,
                hint: l.category,
              }))}
            />
          ) : (
            <input
              name="criterion_lessonId"
              type="text"
              required
              placeholder="UUID de la leçon"
              className="a-input"
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
            className="a-input"
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
            className="a-input"
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
    <>
      {state.error && (
        <p className="a-form-error" style={{ marginBottom: 24 }}>
          {state.error}
        </p>
      )}

      <form action={action} onReset={keepFormInput}>
        <div className="admin-form-grid-2" style={{ gap: 20 }}>
          {/* ── Identity ── */}
          <Field label="Ref Code *" error={state.fieldErrors?.refCode}>
            <input
              name="refCode"
              type="text"
              required
              placeholder="CL-BDG-042"
              className="a-input"
            />
          </Field>
          <Field label="Nom *" error={state.fieldErrors?.name}>
            <input
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="Premier pas"
              className="a-input"
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
                className="a-textarea"
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
                className="a-input"
              />
            </Field>
          </div>

          {/* ── Rarity ── */}
          <Field label="Rareté *" error={state.fieldErrors?.rarity}>
            <Select
              placeholder="Choisir…"
              name="rarity"
              required
              defaultValue=""
              options={[
                { value: "COMMON", label: "Commun" },
                { value: "RARE", label: "Rare" },
                { value: "EPIC", label: "Épique" },
                { value: "LEGENDARY", label: "Légendaire" },
              ]}
            />
          </Field>

          {/* ── XP Reward ── */}
          <Field label="Récompense XP" error={state.fieldErrors?.xpReward}>
            <input
              name="xpReward"
              type="number"
              min={0}
              max={10000}
              defaultValue="0"
              className="a-input"
            />
          </Field>

          {/* ── Criterion type ── */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Type de condition *" error={state.fieldErrors?.criterionType}>
              <Select
                name="criterionType"
                required
                value={criterionType}
                onChange={setCriterionType}
                placeholder="Choisir…"
                options={Object.entries(CRITERION_LABELS).map(([val, label]) => ({
                  value: val,
                  label,
                }))}
              />
            </Field>
          </div>

          {/* ── Criterion-specific fields ── */}
          {criterionType && (
            <div
              style={{
                gridColumn: "1 / -1",
                background: "var(--a-surface)",
                border: "1px solid var(--a-border)",
                borderLeft: "3px solid var(--a-border-2)",
                padding: "18px 20px",
              }}
            >
              <h2 className="a-section-title" style={{ marginBottom: 14 }}>
                Paramètres de la condition
              </h2>
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
            className="a-btn a-btn--primary"
            style={{
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Création…" : "Créer le badge"}
          </button>
          <Link href="/badges" className="a-btn a-btn--ghost">
            Annuler
          </Link>
        </div>
      </form>
    </>
  );
}
