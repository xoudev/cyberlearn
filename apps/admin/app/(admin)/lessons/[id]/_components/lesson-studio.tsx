"use client";

import React, { useCallback, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { LessonBase, LessonContent, LessonVersionSource } from "@cyberlearn/db";
import type { LessonEditorProblem } from "@cyberlearn/lib/mdx-check";
import { Select } from "@cyberlearn/ui";
import {
  useDraftAutosave,
  useSaveShortcut,
  useUnsavedChangesGuard,
  type AutosaveResult,
} from "@cyberlearn/ui/lesson-studio";
import { MdxEditorPanel, useLessonPreview } from "@cyberlearn/ui/mdx-editor";
import { CONTENT_STATUS_OPTIONS, type ContentStatus } from "../../../_components/content-status";
import { refreshLessonPreviewAction } from "../../_actions/preview-actions";
import { updateLessonStatusAction } from "../../_actions/lesson-actions";
import { CoverUploadField } from "../../_components/cover-upload-field";
import {
  discardLessonDraftAction,
  publishLessonChangesAction,
  restoreLessonVersionAction,
  saveLessonDraftAction,
} from "../actions";
import {
  autosaveLabel,
  draftContentOf,
  fieldsOf,
  initialStudioState,
  sameContent,
  studioReducer,
  VERSION_SOURCE_LABEL,
  type StudioDraftContent,
  type StudioField,
  type StudioFields,
} from "./studio-state";
import { notifyResult } from "@/lib/notify";
import {
  LESSON_DRAFT_LIMITS,
  LESSON_LIMITS,
  LESSON_SLUG_HINT,
  LESSON_SLUG_PATTERN,
} from "@/lib/lesson-limits";

/**
 * The lesson studio: the lesson's fields down a rail, the editor and the
 * site's preview beside them, the whole width of the window.
 *
 * What is typed goes to the lesson's draft after each pause (useDraftAutosave)
 * or at once on ⌘S, never to the lesson: learners keep reading what was
 * published until « Publier les changements », which applies the form's
 * rules and the MDX check to the draft, copies it into the lesson and keeps a
 * version. A version restores into the draft, to be published like any edit.
 *
 * Every field is controlled, through studioReducer, and there is no <form>:
 * nothing for React 19 to reset once an action has answered.
 */

export interface StudioVersion {
  id: string;
  version: number;
  source: LessonVersionSource;
  title: string;
  /** Already formatted, by the server. */
  publishedAt: string;
  publishedBy: string | null;
}

export interface StudioDraft {
  content: LessonContent;
  savedAt: string;
}

/** The code the lesson's first path would give it, offered and never applied by itself. */
export interface RefCodeSuggestion {
  refCode: string;
  pathTitle: string;
  position: number;
}

const CATEGORY_OPTIONS = [
  { value: "CYBERSEC", label: "Cybersécurité" },
  { value: "NETWORK", label: "Réseau" },
  { value: "DEV", label: "Développement" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "BEGINNER", label: "◆ ◇ ◇ ◇ Débutant" },
  { value: "INTERMEDIATE", label: "◆ ◆ ◇ ◇ Intermédiaire" },
  { value: "ADVANCED", label: "◆ ◆ ◆ ◇ Avancé" },
  { value: "EXPERT", label: "◆ ◆ ◆ ◆ Expert" },
] as const;

const LEAVE_WARNING =
  "Des modifications ne sont pas encore enregistrées dans le brouillon. Quitter la page quand même ?";

function isCategory(value: string): value is LessonContent["category"] {
  return CATEGORY_OPTIONS.some((option) => option.value === value);
}

function isDifficulty(value: string): value is LessonContent["difficulty"] {
  return DIFFICULTY_OPTIONS.some((option) => option.value === value);
}

function isContentStatus(value: string): value is ContentStatus {
  return CONTENT_STATUS_OPTIONS.some((option) => option.value === value);
}

function FieldError({ message }: { message: string | undefined }): React.ReactElement | null {
  if (message === undefined) return null;
  return (
    <span role="alert" className="a-field-hint a-studio-field-error">
      {message}
    </span>
  );
}

export function LessonStudio({
  lessonId,
  status,
  published,
  draft,
  base,
  lessonChanged = null,
  currentVersion,
  versions,
  coverPreviews,
  lessonUrlPrefix,
  refCodeSuggestion,
}: {
  lessonId: string;
  status: ContentStatus;
  /** The lesson as learners read it. */
  published: LessonContent;
  /** The draft the page opened on, if one was saved. */
  draft: StudioDraft | null;
  /**
   * The lesson the fields start from (the draft's base, or `published`): a
   * draft this studio starts keeps it, for the publish to check against.
   */
  base: LessonBase;
  /**
   * Set when the draft was started from a lesson that has changed since (a
   * sync or an import wrote its file over it, someone else published): the
   * sentence the studio opens on, as its publish would refuse.
   */
  lessonChanged?: string | null;
  currentVersion: number;
  versions: readonly StudioVersion[];
  /** Signed previews of the covers the server knows: the published one, the draft's. */
  coverPreviews: Readonly<Record<string, string>>;
  /** The lesson's address on the learner site, up to the slug. */
  lessonUrlPrefix: string;
  refCodeSuggestion: RefCodeSuggestion | null;
}): React.ReactElement {
  const router = useRouter();
  const [state, dispatch] = useReducer(studioReducer, null, () =>
    initialStudioState(fieldsOf(published), fieldsOf(draft?.content ?? published), lessonChanged),
  );
  const { fields, fieldErrors } = state;

  // The draft's updatedAt as this studio last saw it: every save and the
  // publish are conditional on it (lessonDraftRepository). Null while there
  // is no draft: the next save starts one.
  const stamp = useRef<string | null>(draft?.savedAt ?? null);
  // The lesson the fields started from, which a draft this studio starts
  // keeps: what the page loaded, then what each publish or discard left. Not
  // the page's prop: a refresh brings the lesson as it is now, while the
  // fields stay what they were.
  const baseRef = useRef<LessonBase>(base);
  const [hasDraft, setHasDraft] = useState(draft !== null);
  const [problems, setProblems] = useState<readonly LessonEditorProblem[] | undefined>(undefined);
  const [editingRefCode, setEditingRefCode] = useState(false);
  // Remounts the cover field when its cover is replaced from outside it.
  const [coverEpoch, setCoverEpoch] = useState(0);
  // Previews of covers the page signed none for: uploaded here, or those of a
  // restored version or of the lesson a discard went back to.
  const [knownPreviews, setKnownPreviews] = useState<Readonly<Record<string, string>>>({});
  const [lessonStatus, setLessonStatus] = useState<ContentStatus>(status);
  const latestFields = useRef(fields);
  latestFields.current = fields;

  const preview = useLessonPreview(refreshLessonPreviewAction);
  const [busy, startTask] = useTransition();

  const save = useCallback(
    async (content: StudioDraftContent): Promise<AutosaveResult> => {
      const result = await saveLessonDraftAction({
        lessonId,
        expectedUpdatedAt: stamp.current,
        base: baseRef.current,
        content,
      });
      if (!result.ok) {
        return result.conflict === true
          ? { ok: false, error: result.error, conflict: true }
          : { ok: false, error: result.error };
      }
      stamp.current = result.savedAt;
      setHasDraft(true);
      setProblems(result.problems);
      return { ok: true, savedAt: new Date(result.savedAt) };
    },
    [lessonId],
  );

  const draftContent = useMemo(() => draftContentOf(fields), [fields]);
  const autosave = useDraftAutosave({
    value: draftContent,
    save,
    savedAt: draft === null ? null : new Date(draft.savedAt),
    // A save sent during a publish or a discard would carry the stamp from
    // before it and land after it: refused, or refusing the publish. What is
    // typed meanwhile is saved once it is over.
    paused: busy,
  });

  const saveNow = useCallback(() => {
    if (busy) {
      toast.info("Un instant : le brouillon s'enregistrera dès la fin de l'opération en cours.");
      return;
    }
    const wasDirty = autosave.dirty;
    void autosave.flush().then((ok) => {
      if (ok) toast.success(wasDirty ? "Brouillon enregistré." : "Le brouillon est déjà à jour.");
    });
  }, [autosave, busy]);
  useSaveShortcut(saveNow);
  useUnsavedChangesGuard(autosave.dirty, LEAVE_WARNING);

  const edit = (field: StudioField, value: string): void => {
    dispatch({ type: "edit", field, value });
  };

  /** The cover field keeps its own state: it starts again only when its cover changes. */
  const replaceCover = (next: StudioFields, coverPreview?: string | null): void => {
    if (next.coverImageUrl !== "" && typeof coverPreview === "string") {
      setKnownPreviews((known) => ({ ...known, [next.coverImageUrl]: coverPreview }));
    }
    if (next.coverImageUrl !== latestFields.current.coverImageUrl) setCoverEpoch((n) => n + 1);
  };

  /** The fields as the lesson now holds them, after a publish or a draft found unchanged. */
  const settle = (content: LessonContent, nextBase: LessonBase, sent: StudioFields): void => {
    const now = fieldsOf(content);
    // Typed during the publish: kept, and saved into a new draft after the pause.
    const untouched = sameContent(latestFields.current, sent);
    if (untouched) replaceCover(now);
    dispatch({ type: "published", published: now, replaceFields: untouched });
    stamp.current = null;
    baseRef.current = nextBase;
    setHasDraft(false);
    setProblems([]);
    autosave.markSaved(draftContentOf(now), null);
  };

  const publish = (force: boolean): void => {
    startTask(async () => {
      const sent = latestFields.current;
      if (!(await autosave.flush())) {
        dispatch({
          type: "refused",
          error: "Le brouillon n'a pas pu être enregistré : rien n'a été publié.",
        });
        return;
      }
      if (stamp.current === null) {
        dispatch({
          type: "refused",
          error: "Rien à publier : la leçon est déjà telle qu'elle est en ligne.",
        });
        return;
      }
      const result = await publishLessonChangesAction({
        lessonId,
        expectedUpdatedAt: stamp.current,
        force,
      });
      if (result.ok) {
        settle(result.content, result.base, sent);
        toast.success(`Version ${String(result.version)} publiée.`);
        router.refresh();
        return;
      }
      if (result.discarded !== undefined) {
        settle(result.discarded.content, result.discarded.base, sent);
        toast.info(result.error);
        router.refresh();
        return;
      }
      if (result.problems !== undefined) setProblems(result.problems);
      dispatch({
        type: "refused",
        error: result.error,
        fieldErrors: result.fieldErrors,
        conflict: result.conflict,
      });
      if (result.fieldErrors?.refCode !== undefined) setEditingRefCode(true);
    });
  };

  const discard = (): void => {
    if (
      !window.confirm(
        "Abandonner le brouillon ? La leçon reste telle qu'elle est publiée, et ce qui a été écrit depuis est perdu.",
      )
    ) {
      return;
    }
    startTask(async () => {
      await autosave.cancel();
      const result = await discardLessonDraftAction({ lessonId });
      if (!notifyResult(result, { success: "Brouillon abandonné." }) || !result.ok) return;
      // The lesson as it is now, which a sync may have changed since the
      // page loaded: the fields go back to it, and the next draft starts there.
      const now = fieldsOf(result.content);
      replaceCover(now, result.coverPreview);
      dispatch({ type: "discarded", published: now });
      stamp.current = null;
      baseRef.current = result.base;
      setHasDraft(false);
      setProblems([]);
      autosave.markSaved(draftContentOf(now), null);
      router.refresh();
    });
  };

  const restore = (version: StudioVersion): void => {
    if (
      !sameContent(fields, state.published) &&
      !window.confirm(
        `Remplacer le brouillon par la version ${String(version.version)} ? Ce qu'il contient maintenant sera perdu.`,
      )
    ) {
      return;
    }
    startTask(async () => {
      const result = await restoreLessonVersionAction({ lessonId, versionId: version.id });
      if (!result.ok) {
        notifyResult(result);
        return;
      }
      const restored = fieldsOf(result.content);
      replaceCover(restored, result.coverPreview);
      dispatch({ type: "replace", fields: restored });
      toast.success(
        `Version ${String(result.version)} remise dans le brouillon : publie les changements pour la remettre en ligne.`,
      );
    });
  };

  const changeStatus = (next: string): void => {
    if (!isContentStatus(next) || next === lessonStatus) return;
    const previous = lessonStatus;
    setLessonStatus(next);
    startTask(async () => {
      const result = await updateLessonStatusAction(lessonId, next);
      const label = CONTENT_STATUS_OPTIONS.find((option) => option.value === next)?.label ?? next;
      if (
        notifyResult(result, {
          success: `Statut mis à jour : ${label.toLowerCase()}.`,
          error: "Le statut n'a pas pu être changé.",
        })
      ) {
        router.refresh();
      } else {
        setLessonStatus(previous);
      }
    });
  };

  const changed = !sameContent(fields, state.published);
  const conflicted = autosave.status === "conflict";
  const canPublish = changed && !busy && !conflicted;
  const label = autosaveLabel({
    status: autosave.status,
    savedAt: autosave.savedAt,
    hasDraft,
    error: autosave.error,
  });
  const refCodeOpen = editingRefCode || fieldErrors.refCode !== undefined;

  return (
    <div className="a-studio">
      <div className="a-studio-bar">
        <span
          role="status"
          className="a-studio-state"
          data-state={autosave.status}
          data-draft={hasDraft ? "true" : "false"}
        >
          {label}
        </span>
        <span className="a-studio-version">
          En ligne : version {String(currentVersion)}
          {changed ? " · le brouillon en diffère" : ""}
        </span>
        <span className="a-studio-actions">
          <span className="a-studio-shortcut" aria-hidden="true">
            ⌘S / Ctrl+S : enregistrer
          </span>
          <button
            type="button"
            className="a-btn a-btn--ghost a-btn--sm"
            disabled={busy || (!hasDraft && !autosave.dirty)}
            onClick={discard}
          >
            Abandonner le brouillon
          </button>
          <button
            type="button"
            className="a-btn a-btn--primary a-btn--sm"
            disabled={!canPublish}
            title={
              changed ? undefined : "Le brouillon reprend la leçon telle qu'elle est en ligne."
            }
            onClick={() => {
              publish(false);
            }}
          >
            {busy ? "Un instant…" : "Publier les changements"}
          </button>
        </span>
      </div>

      {(state.error !== null || autosave.status === "conflict") && (
        <div className="a-form-error a-studio-alert" role="alert">
          <span>{state.error ?? autosave.error}</span>
          {fieldErrors.contentMdx !== undefined && (
            <span className="a-studio-alert-detail">{fieldErrors.contentMdx}</span>
          )}
          <span className="a-studio-alert-actions">
            {state.conflict === "lesson" && (
              <button
                type="button"
                className="a-btn a-btn--danger a-btn--sm"
                disabled={busy}
                onClick={() => {
                  publish(true);
                }}
              >
                Publier quand même
              </button>
            )}
            {(state.conflict === "draft" || conflicted) && (
              <button
                type="button"
                className="a-btn a-btn--ghost a-btn--sm"
                onClick={() => {
                  window.location.reload();
                }}
              >
                Recharger la page
              </button>
            )}
            {state.error !== null && (
              <button
                type="button"
                className="a-btn a-btn--ghost a-btn--sm"
                onClick={() => {
                  dispatch({ type: "dismiss" });
                }}
              >
                Fermer
              </button>
            )}
          </span>
        </div>
      )}

      <div className="a-studio-body">
        <aside className="a-studio-rail" aria-label="Fiche de la leçon">
          <div className="a-field">
            <span className="a-label">Ref code</span>
            {refCodeOpen ? (
              <input
                aria-label="Ref code"
                className="a-input"
                value={fields.refCode}
                maxLength={LESSON_DRAFT_LIMITS.refCodeMax}
                placeholder="CL-LSN-01001-V01"
                onChange={(event) => {
                  edit("refCode", event.target.value);
                }}
              />
            ) : (
              <div className="a-studio-code">
                <span className="a-mono">{fields.refCode}</span>
                <button
                  type="button"
                  className="a-btn a-btn--ghost a-btn--sm"
                  onClick={() => {
                    setEditingRefCode(true);
                  }}
                >
                  Modifier
                </button>
              </div>
            )}
            {refCodeSuggestion !== null && refCodeSuggestion.refCode !== fields.refCode && (
              <span className="a-field-hint">
                Code proposé d&apos;après le parcours {refCodeSuggestion.pathTitle}, position{" "}
                {refCodeSuggestion.position} : <b>{refCodeSuggestion.refCode}</b>{" "}
                <button
                  type="button"
                  className="a-btn a-btn--ghost a-btn--sm"
                  onClick={() => {
                    edit("refCode", refCodeSuggestion.refCode);
                  }}
                >
                  Utiliser ce code
                </button>
              </span>
            )}
            {fields.refCode !== state.published.refCode && (
              <span className="a-field-hint">
                En ligne : <b>{state.published.refCode}</b> jusqu&apos;à la publication. Le fichier
                de la leçon et les manifestes de parcours qui citent l&apos;ancien code sont à
                mettre à jour dans le dépôt.
              </span>
            )}
            <FieldError message={fieldErrors.refCode} />
          </div>

          <label className="a-field">
            <span className="a-label">Slug</span>
            <input
              className="a-input"
              value={fields.slug}
              maxLength={LESSON_LIMITS.slugMax}
              pattern={LESSON_SLUG_PATTERN}
              title={LESSON_SLUG_HINT}
              placeholder="mon-slug"
              onChange={(event) => {
                edit("slug", event.target.value);
              }}
            />
            <span className="a-field-hint a-studio-url">
              {lessonUrlPrefix.replace(/^https?:\/\//u, "")}
              <b>{fields.slug}</b>
            </span>
            <FieldError message={fieldErrors.slug} />
          </label>

          <label className="a-field">
            <span className="a-label">
              Titre{" "}
              <span className="a-label-optional">
                {LESSON_LIMITS.titleMin}–{LESSON_LIMITS.titleMax} caractères
              </span>
            </span>
            <input
              className="a-input"
              value={fields.title}
              maxLength={LESSON_LIMITS.titleMax}
              onChange={(event) => {
                edit("title", event.target.value);
              }}
            />
            <FieldError message={fieldErrors.title} />
          </label>

          <label className="a-field">
            <span className="a-label">
              Description{" "}
              <span className="a-label-optional">
                {LESSON_LIMITS.descriptionMin}–{LESSON_LIMITS.descriptionMax} caractères
              </span>
            </span>
            <textarea
              className="a-textarea"
              rows={4}
              value={fields.description}
              maxLength={LESSON_LIMITS.descriptionMax}
              onChange={(event) => {
                edit("description", event.target.value);
              }}
            />
            <FieldError message={fieldErrors.description} />
          </label>

          <div className="a-studio-pair">
            <div className="a-field">
              <span className="a-label">Catégorie</span>
              <Select
                aria-label="Catégorie"
                value={fields.category}
                options={CATEGORY_OPTIONS}
                onChange={(value) => {
                  if (isCategory(value)) edit("category", value);
                }}
              />
              <FieldError message={fieldErrors.category} />
            </div>
            <div className="a-field">
              <span className="a-label">Difficulté</span>
              <Select
                aria-label="Difficulté"
                value={fields.difficulty}
                options={DIFFICULTY_OPTIONS}
                onChange={(value) => {
                  if (isDifficulty(value)) edit("difficulty", value);
                }}
              />
              <FieldError message={fieldErrors.difficulty} />
            </div>
          </div>

          <div className="a-studio-pair">
            <label className="a-field">
              <span className="a-label">Durée (min)</span>
              <input
                className="a-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={LESSON_LIMITS.minutesMax}
                value={fields.estimatedMinutes}
                onChange={(event) => {
                  edit("estimatedMinutes", event.target.value);
                }}
              />
              <FieldError message={fieldErrors.estimatedMinutes} />
            </label>
            <label className="a-field">
              <span className="a-label">Récompense XP</span>
              <input
                className="a-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={LESSON_LIMITS.xpMax}
                step={10}
                value={fields.xpReward}
                onChange={(event) => {
                  edit("xpReward", event.target.value);
                }}
              />
              <FieldError message={fieldErrors.xpReward} />
            </label>
          </div>

          <div className="a-field">
            <span className="a-label">
              Couverture <span className="a-label-optional">bucket privé · URL signée</span>
            </span>
            <CoverUploadField
              key={coverEpoch}
              initialMarker={fields.coverImageUrl === "" ? null : fields.coverImageUrl}
              initialPreview={
                coverPreviews[fields.coverImageUrl] ?? knownPreviews[fields.coverImageUrl] ?? null
              }
              keepPrevious
              onChange={(marker, coverPreview) => {
                if (marker !== "" && coverPreview !== null) {
                  setKnownPreviews((known) => ({ ...known, [marker]: coverPreview }));
                }
                edit("coverImageUrl", marker);
              }}
            />
            <FieldError message={fieldErrors.coverImageUrl} />
          </div>

          <div className="a-field">
            <span className="a-label">Statut de la leçon</span>
            <Select
              aria-label="Statut de la leçon"
              value={lessonStatus}
              options={CONTENT_STATUS_OPTIONS}
              disabled={busy}
              onChange={changeStatus}
            />
            <span className="a-field-hint">
              Appliqué tout de suite, à la version en ligne : le brouillon reste un brouillon
              jusqu&apos;à « Publier les changements ».
            </span>
          </div>

          <section className="a-studio-versions" aria-labelledby="studio-versions">
            <h2 id="studio-versions" className="a-label">
              Versions
            </h2>
            {versions.length === 0 ? (
              <p className="a-field-hint">
                Aucune version gardée : la première publication depuis le studio gardera aussi ce
                que la leçon contient aujourd&apos;hui.
              </p>
            ) : (
              <ol className="a-studio-version-list">
                {versions.map((version) => (
                  <li
                    key={version.id}
                    data-current={version.version === currentVersion ? "true" : "false"}
                  >
                    <span className="a-studio-version-head">
                      <b>v{String(version.version)}</b>
                      <span>{VERSION_SOURCE_LABEL[version.source]}</span>
                      {version.version === currentVersion && <span>En ligne</span>}
                    </span>
                    <span className="a-field-hint">
                      {version.publishedAt}
                      {version.publishedBy !== null ? ` · ${version.publishedBy}` : ""}
                    </span>
                    <span className="a-studio-version-title">{version.title}</span>
                    <button
                      type="button"
                      className="a-btn a-btn--ghost a-btn--sm"
                      disabled={busy}
                      onClick={() => {
                        restore(version);
                      }}
                    >
                      Restaurer dans le brouillon
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>

        <div className="a-studio-editor">
          <MdxEditorPanel
            fill
            value={fields.contentMdx}
            onChange={(value) => {
              edit("contentMdx", value);
            }}
            preview={preview}
            problems={problems}
            onSave={saveNow}
          />
        </div>
      </div>
    </div>
  );
}
