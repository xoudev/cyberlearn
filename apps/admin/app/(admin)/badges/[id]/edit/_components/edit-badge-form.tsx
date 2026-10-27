"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import {
  updateBadgeAction,
  deleteBadgeAction,
  type BadgeFormState,
} from "../../../_actions/badge-actions";
import type { LessonOption, PathOption } from "../../../new/_components/new-badge-form";
import { Select } from "@cyberlearn/ui";
import { keepFormInput } from "@/lib/form-input";
import {
  ACTIVITY_CRITERION_LABELS,
  ActivityCriterionFields,
  activityCriterionDefaults,
  isActivityCriterion,
} from "../../../_components/activity-criterion-fields";

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

// exactOptionalPropertyTypes: pass fieldError only when defined
function fe(v: string | undefined): { error?: string } {
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
  ...ACTIVITY_CRITERION_LABELS,
};

const CATEGORY_OPTIONS = ["DEV", "CYBERSEC", "NETWORK", "CLOUD", "OSINT"] as const;

function extractDefaultCriterionValues(
  type: string,
  data: unknown,
): Record<string, string | boolean> {
  if (isActivityCriterion(type)) return activityCriterionDefaults(type, data);
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
        <p style={{ margin: 0, fontSize: 12, color: "var(--a-danger)" }}>{criterionError}</p>
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
            className="a-input"
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
                defaultChecked={defaults.criterion_withCertificate === true}
                style={{ accentColor: "var(--a-accent)", width: 18, height: 18 }}
              />
              <span
                style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--a-fg-2)" }}
              >
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
              className="a-input"
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
            className="a-input"
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
            className="a-input"
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
              className="a-input"
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
              className="a-input"
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
            className="a-input"
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
            className="a-input"
          />
        </Field>
      )}

      <ActivityCriterionFields type={type} defaults={defaults} />
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
    <>
      {state.error && (
        <p className="a-form-error" style={{ marginBottom: 24 }}>
          {state.error}
        </p>
      )}

      {/* Edit form */}
      <form action={action} onReset={keepFormInput}>
        <input type="hidden" name="id" value={badge.id} />

        <div className="admin-form-grid-2" style={{ gap: 20 }}>
          <Field label="Ref Code">
            <input
              type="text"
              value={badge.refCode}
              disabled
              className="a-input"
              style={{ fontFamily: "var(--font-mono)", opacity: 0.4, cursor: "not-allowed" }}
            />
          </Field>
          <Field label="Nom *" {...fe(state.fieldErrors?.name)}>
            <input
              name="name"
              type="text"
              required
              maxLength={100}
              defaultValue={badge.name}
              className="a-input"
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
                className="a-textarea"
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
                className="a-input"
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
              className="a-input"
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
            className="a-btn a-btn--primary"
            style={{
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link href="/badges" className="a-btn a-btn--ghost">
            Annuler
          </Link>
        </div>
      </form>

      {/* Danger zone */}
      <div
        style={{
          marginTop: 48,
          padding: "20px 24px",
          border: "1px solid var(--a-danger)",
          background: "var(--a-surface)",
        }}
      >
        <h2 className="a-section-title" style={{ color: "var(--a-danger)", marginBottom: 12 }}>
          Zone dangereuse
        </h2>
        {canDelete ? (
          confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, color: "var(--a-fg-2)", margin: 0 }}>
                Confirmer la suppression ?
              </p>
              <form action={deleteBadgeAction}>
                <input type="hidden" name="id" value={badge.id} />
                <button
                  type="submit"
                  className="a-btn a-btn--danger a-btn--sm"
                  style={{ background: "var(--a-danger)", color: "var(--a-ink)" }}
                >
                  Supprimer
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                }}
                className="a-btn a-btn--ghost a-btn--sm"
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
              className="a-btn a-btn--danger a-btn--sm"
            >
              Supprimer le badge
            </button>
          )
        ) : (
          <p className="a-field-hint" style={{ margin: 0 }}>
            Suppression impossible : {String(badge._count.userBadges)} utilisateur(s) ont déjà ce
            badge. Désactive-le plutôt.
          </p>
        )}
      </div>
    </>
  );
}
