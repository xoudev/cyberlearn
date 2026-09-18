"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import {
  updateBadgeAction,
  deleteBadgeAction,
  toggleBadgeActiveAction,
  type BadgeFormState,
} from "../../../_actions/badge-actions";
import type { LessonOption, PathOption } from "../../../new/_components/new-badge-form";
import { Select } from "@cyberlearn/ui";

interface BadgeData {
  id: string;
  refCode: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: string;
  criterionType: string;
  criterionData: unknown;
  xpReward: number;
  isActive: boolean;
  _count: { userBadges: number };
}

interface Props {
  badge: BadgeData;
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
  error?: string;
  hint?: string;
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

// exactOptionalPropertyTypes: pass fieldError only when defined
function fe(v: string | undefined): { error: string } | Record<never, never> {
  return v !== undefined ? { error: v } : {};
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

function extractDefaultCriterionValues(
  type: string,
  data: unknown,
): Record<string, string | boolean> {
  if (typeof data !== "object" || data === null) return {};
  const d = data as Record<string, unknown>;
  switch (type) {
    case "LESSON_COMPLETED":
    case "PATH_COMPLETED":
      return {
        criterion_count: String(typeof d.count === "number" ? d.count : 1),
        criterion_withCertificate: d.withCertificate === true,
      };
    case "XP_THRESHOLD":
      return { criterion_threshold: String(typeof d.threshold === "number" ? d.threshold : 0) };
    case "STREAK_DAYS":
      return { criterion_days: String(typeof d.days === "number" ? d.days : 1) };
    case "CATEGORY_MASTERY":
      return {
        criterion_category: typeof d.category === "string" ? d.category : "",
        criterion_count: String(typeof d.count === "number" ? d.count : 1),
      };
    case "LESSON_SPECIFIC":
      return { criterion_lessonId: typeof d.lessonId === "string" ? d.lessonId : "" };
    case "PERFECT_QUIZ":
      return { criterion_count: String(typeof d.count === "number" ? d.count : 1) };
    case "CUSTOM":
      return { criterion_event: typeof d.event === "string" ? d.event : "" };
    default:
      return {};
  }
}

function CriterionFields({
  type,
  lessons,
  defaults,
  criterionError,
}: {
  type: string;
  lessons: LessonOption[];
  defaults: Record<string, string | boolean>;
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
        <Field label="Nombre de leçons *">
          <input
            name="criterion_count"
            type="number"
            min={1}
            max={9999}
            required
            defaultValue={defaults.criterion_count as string}
            style={INPUT_STYLE}
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
                defaultChecked={defaults.criterion_withCertificate === true}
                style={{ accentColor: "#0AFFD4", width: 16, height: 16 }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8B5D1" }}>
                Obtenir un certificat
              </span>
            </label>
          </Field>
          <Field label="Ou : nombre de parcours">
            <input
              name="criterion_count"
              type="number"
              min={1}
              max={999}
              defaultValue={defaults.criterion_count as string}
              style={INPUT_STYLE}
            />
          </Field>
        </>
      )}

      {type === "XP_THRESHOLD" && (
        <Field label="Seuil XP *">
          <input
            name="criterion_threshold"
            type="number"
            min={1}
            max={1000000}
            required
            defaultValue={defaults.criterion_threshold as string}
            style={INPUT_STYLE}
          />
        </Field>
      )}

      {type === "STREAK_DAYS" && (
        <Field label="Nombre de jours *">
          <input
            name="criterion_days"
            type="number"
            min={1}
            max={365}
            required
            defaultValue={defaults.criterion_days as string}
            style={INPUT_STYLE}
          />
        </Field>
      )}

      {type === "CATEGORY_MASTERY" && (
        <>
          <Field label="Catégorie *">
            <Select
              name="criterion_category"
              required
              defaultValue={(defaults.criterion_category as string) || ""}
              placeholder="Choisir…"
              options={CATEGORY_OPTIONS.map((cat) => ({ value: cat, label: cat }))}
            />
          </Field>
          <Field label="Nombre de leçons *">
            <input
              name="criterion_count"
              type="number"
              min={1}
              max={9999}
              required
              defaultValue={defaults.criterion_count as string}
              style={INPUT_STYLE}
            />
          </Field>
        </>
      )}

      {type === "LESSON_SPECIFIC" && (
        <Field label="Leçon *">
          {lessons.length > 0 ? (
            <Select
              name="criterion_lessonId"
              required
              defaultValue={(defaults.criterion_lessonId as string) || ""}
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
              defaultValue={defaults.criterion_lessonId as string}
              placeholder="UUID de la leçon"
              style={INPUT_STYLE}
            />
          )}
        </Field>
      )}

      {type === "PERFECT_QUIZ" && (
        <Field label="Nombre de quiz parfaits *">
          <input
            name="criterion_count"
            type="number"
            min={1}
            max={999}
            required
            defaultValue={defaults.criterion_count as string}
            style={INPUT_STYLE}
          />
        </Field>
      )}

      {type === "CUSTOM" && (
        <Field label="Événement *">
          <input
            name="criterion_event"
            type="text"
            required
            maxLength={100}
            defaultValue={defaults.criterion_event as string}
            placeholder="placement_test_passed"
            style={INPUT_STYLE}
          />
        </Field>
      )}
    </div>
  );
}

const initialState: BadgeFormState = {};

export function EditBadgeForm({ badge, lessons }: Props): React.ReactElement {
  const [state, action, isPending] = useActionState(updateBadgeAction, initialState);
  const [criterionType, setCriterionType] = useState(badge.criterionType);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const criterionDefaults = extractDefaultCriterionValues(badge.criterionType, badge.criterionData);
  const canDelete = badge._count.userBadges === 0;

  return (
    <div className="admin-page-content" style={{ maxWidth: 780 }}>
      {/* Header */}
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
            Admin / Badges / {badge.refCode}
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
            Éditer le badge
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#44406B",
              margin: "4px 0 0",
            }}
          >
            {String(badge._count.userBadges)} utilisateur(s) ont ce badge
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {/* Toggle active */}
          <form action={toggleBadgeActiveAction}>
            <input type="hidden" name="id" value={badge.id} />
            <button
              type="submit"
              style={{
                padding: "9px 16px",
                background: "transparent",
                border: `1px solid ${badge.isActive ? "#FF4D6D" : "#0AFFD4"}`,
                color: badge.isActive ? "#FF4D6D" : "#0AFFD4",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {badge.isActive ? "Désactiver" : "Activer"}
            </button>
          </form>
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
              textDecoration: "none",
            }}
          >
            ← Retour
          </Link>
        </div>
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

      {/* Edit form */}
      <form action={action}>
        <input type="hidden" name="id" value={badge.id} />

        <div className="admin-form-grid-2" style={{ gap: 20 }}>
          <Field label="Ref Code">
            <input
              type="text"
              value={badge.refCode}
              disabled
              style={{ ...INPUT_STYLE, opacity: 0.4, cursor: "not-allowed" }}
            />
          </Field>
          <Field label="Nom *" {...fe(state.fieldErrors?.name)}>
            <input
              name="name"
              type="text"
              required
              maxLength={100}
              defaultValue={badge.name}
              style={INPUT_STYLE}
            />
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Description *" {...fe(state.fieldErrors?.description)}>
              <textarea
                name="description"
                required
                minLength={5}
                maxLength={500}
                rows={3}
                defaultValue={badge.description}
                style={{ ...INPUT_STYLE, resize: "vertical" }}
              />
            </Field>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="URL icône *" {...fe(state.fieldErrors?.iconUrl)}>
              <input
                name="iconUrl"
                type="url"
                required
                defaultValue={badge.iconUrl}
                style={INPUT_STYLE}
              />
            </Field>
          </div>
          <Field label="Rareté *" {...fe(state.fieldErrors?.rarity)}>
            <Select
              name="rarity"
              required
              defaultValue={badge.rarity}
              options={[
                { value: "COMMON", label: "Commun" },
                { value: "RARE", label: "Rare" },
                { value: "EPIC", label: "Épique" },
                { value: "LEGENDARY", label: "Légendaire" },
              ]}
            />
          </Field>
          <Field
            label="Récompense XP"
            {...(state.fieldErrors?.xpReward !== undefined && {
              error: state.fieldErrors.xpReward,
            })}
          >
            <input
              name="xpReward"
              type="number"
              min={0}
              max={10000}
              defaultValue={badge.xpReward}
              style={INPUT_STYLE}
            />
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label="Type de condition *"
              {...(state.fieldErrors?.criterionType !== undefined && {
                error: state.fieldErrors.criterionType,
              })}
            >
              <Select
                name="criterionType"
                required
                value={criterionType}
                onChange={setCriterionType}
                options={Object.entries(CRITERION_LABELS).map(([val, label]) => ({
                  value: val,
                  label,
                }))}
              />
            </Field>
          </div>
          {criterionType && criterionType !== "PERFECT_QUIZ" && criterionType !== "CUSTOM" && (
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
                defaults={criterionType === badge.criterionType ? criterionDefaults : {}}
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
            {isPending ? "Enregistrement…" : "Enregistrer"}
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
              textDecoration: "none",
            }}
          >
            Annuler
          </Link>
        </div>
      </form>

      {/* Danger zone */}
      <div
        style={{
          marginTop: 48,
          padding: "20px 24px",
          border: "1px solid rgba(255,77,109,0.2)",
          borderRadius: 8,
          background: "rgba(255,77,109,0.04)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#FF4D6D",
            margin: "0 0 12px",
          }}
        >
          Zone dangereuse
        </p>
        {canDelete ? (
          confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#B8B5D1",
                  margin: 0,
                }}
              >
                Confirmer la suppression ?
              </p>
              <form action={deleteBadgeAction}>
                <input type="hidden" name="id" value={badge.id} />
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    background: DANGER,
                    border: "none",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Supprimer
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                }}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: `1px solid ${BORDER}`,
                  color: "#6B6890",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(true);
              }}
              style={{
                padding: "9px 18px",
                background: "transparent",
                border: `1px solid rgba(255,77,109,0.4)`,
                color: DANGER,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Supprimer le badge
            </button>
          )
        ) : (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#44406B", margin: 0 }}>
            Suppression impossible : {String(badge._count.userBadges)} utilisateur(s) ont déjà ce
            badge. Désactive-le plutôt.
          </p>
        )}
      </div>
    </div>
  );
}
