"use client";

import React, { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MultiSelect, type MultiSelectOption } from "@cyberlearn/ui";
import { Card, Tag } from "../../../_components/admin-ui";
import { CONTENT_STATUS, type ContentStatus } from "../../../_components/content-status";
import {
  setLessonPathsAction,
  setLessonPrerequisitesAction,
  type LessonLinksResult,
} from "../../_actions/lesson-links-actions";

/**
 * Where a lesson sits in the catalogue: the paths it is in, at which place and
 * in which module, and the lessons it requires. Both are saved here, each on
 * its own, apart from the studio above: neither goes through the draft.
 *
 * Client-side because the two lists are edited in place; the page reads
 * everything they show.
 */

export interface LessonMembership {
  pathId: string;
  refCode: string;
  title: string;
  status: ContentStatus;
  /** A teacher's path, shown but not edited from here. */
  isClassPath: boolean;
  /** 1-based, among the path's lessons. */
  position: number;
  moduleTitle: string | null;
}

export interface PlacementOption {
  id: string;
  refCode: string;
  title: string;
  status?: ContentStatus;
}

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  const set = new Set(a);
  return a.length === b.length && b.every((id) => set.has(id));
}

function pathOption(path: PlacementOption): MultiSelectOption {
  return {
    value: path.id,
    label: path.title,
    hint:
      path.status === undefined || path.status === "PUBLISHED"
        ? path.refCode
        : `${path.refCode} · ${CONTENT_STATUS[path.status].label.toLowerCase()}`,
  };
}

function lessonOption(lesson: PlacementOption): MultiSelectOption {
  return { value: lesson.id, label: lesson.title, hint: lesson.refCode };
}

/** One save button, its pending state and the line that reports how it went. */
function useSave(): {
  pending: boolean;
  result: LessonLinksResult | null;
  run: (save: () => Promise<LessonLinksResult>) => void;
  clear: () => void;
} {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<LessonLinksResult | null>(null);
  return {
    pending,
    result,
    run: (save) => {
      setResult(null);
      startTransition(async () => {
        const outcome = await save();
        setResult(outcome);
        if (outcome.ok === true) router.refresh();
      });
    },
    clear: () => {
      setResult(null);
    },
  };
}

function SaveLine({
  result,
  done,
}: {
  result: LessonLinksResult | null;
  done: string;
}): React.ReactElement | null {
  if (result === null) return null;
  if (result.error !== undefined) {
    return (
      <span role="alert" className="a-field-hint" style={{ color: "var(--a-danger)" }}>
        {result.error}
      </span>
    );
  }
  return (
    <span role="status" className="a-field-hint" style={{ color: "var(--a-accent)" }}>
      {done}
    </span>
  );
}

export function LessonPlacement({
  lessonId,
  isClassLesson,
  memberships,
  pathOptions,
  prerequisiteIds,
  lessonOptions,
}: {
  lessonId: string;
  isClassLesson: boolean;
  memberships: readonly LessonMembership[];
  pathOptions: readonly PlacementOption[];
  prerequisiteIds: readonly string[];
  lessonOptions: readonly PlacementOption[];
}): React.ReactElement {
  const pathsLabel = useId();
  const prerequisitesLabel = useId();

  const savedPaths = memberships.filter((m) => !m.isClassPath).map((m) => m.pathId);
  const [pathIds, setPathIds] = useState<string[]>(savedPaths);
  const [requires, setRequires] = useState<string[]>([...prerequisiteIds]);
  const pathSave = useSave();
  const prerequisiteSave = useSave();

  const pathsDirty = !sameMembers(pathIds, savedPaths);
  const prerequisitesDirty = !sameMembers(requires, prerequisiteIds);

  return (
    <Card title="Parcours et prérequis">
      <div className="a-card-pad admin-form-grid-2" style={{ alignItems: "start" }}>
        <div className="a-field">
          <span className="a-label" id={pathsLabel}>
            Parcours
          </span>
          {isClassLesson ? (
            <span className="a-field-hint">
              Une leçon de classe n&apos;entre pas dans un parcours du catalogue.
            </span>
          ) : (
            <>
              <MultiSelect
                aria-labelledby={pathsLabel}
                options={pathOptions.map(pathOption)}
                value={pathIds}
                onChange={(next) => {
                  setPathIds(next);
                  pathSave.clear();
                }}
                placeholder="Dans aucun parcours"
                searchPlaceholder="Titre ou refCode du parcours…"
                summary={(count) => `${String(count)} parcours`}
              />
              <span className="a-field-hint">
                Ajoutée à un parcours, la leçon en devient la dernière, dans son dernier module.
                Retirée, les leçons qui la suivaient remontent d&apos;un rang.
              </span>
            </>
          )}

          {memberships.length === 0 ? (
            <span className="a-field-hint">Cette leçon n&apos;est dans aucun parcours.</span>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {memberships.map((m) => (
                <li
                  key={m.pathId}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    gap: "4px 10px",
                    padding: "8px 10px",
                    border: "1px solid var(--a-border)",
                    background: "var(--a-surface-2)",
                    fontSize: 13,
                  }}
                >
                  <Link href={`/paths/${m.pathId}/edit`} className="a-row-link">
                    <span className="a-row-link-title">{m.title}</span>
                  </Link>
                  <span className="a-mono" style={{ color: "var(--a-info)", fontSize: 11.5 }}>
                    {m.refCode}
                  </span>
                  <span className="a-mono" style={{ color: "var(--a-muted)", fontSize: 11.5 }}>
                    Position {String(m.position)}
                    {m.moduleTitle !== null ? ` · ${m.moduleTitle}` : " · sans module"}
                  </span>
                  <Tag tone={CONTENT_STATUS[m.status].tone}>{CONTENT_STATUS[m.status].label}</Tag>
                  {m.isClassPath && <Tag tone="purple">Parcours de classe</Tag>}
                </li>
              ))}
            </ul>
          )}

          {!isClassLesson && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="a-btn a-btn--primary a-btn--sm"
                disabled={!pathsDirty || pathSave.pending}
                onClick={() => {
                  pathSave.run(() => setLessonPathsAction(lessonId, pathIds));
                }}
              >
                {pathSave.pending ? "Enregistrement…" : "Enregistrer les parcours"}
              </button>
              <SaveLine result={pathSave.result} done="Parcours enregistrés." />
            </div>
          )}
        </div>

        <div className="a-field">
          <span className="a-label" id={prerequisitesLabel}>
            Prérequis
          </span>
          <MultiSelect
            aria-labelledby={prerequisitesLabel}
            options={lessonOptions.map(lessonOption)}
            value={requires}
            onChange={(next) => {
              setRequires(next);
              prerequisiteSave.clear();
            }}
            placeholder="Aucun prérequis"
            searchPlaceholder="Titre ou refCode de la leçon…"
            summary={(count) => `${String(count)} prérequis`}
          />
          <span className="a-field-hint">
            Enregistrés avec la leçon, repris par l&apos;import et la synchronisation, mais sans
            verrou pour l&apos;apprenant : sur le site comme dans l&apos;app, seule la place de la
            leçon dans son parcours décide de son ouverture. La synchronisation avec le dépôt
            réécrit les prérequis depuis le fichier de la leçon : une modification faite ici dure
            tant que le fichier ne dit pas autre chose.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="a-btn a-btn--primary a-btn--sm"
              disabled={!prerequisitesDirty || prerequisiteSave.pending}
              onClick={() => {
                prerequisiteSave.run(() => setLessonPrerequisitesAction(lessonId, requires));
              }}
            >
              {prerequisiteSave.pending ? "Enregistrement…" : "Enregistrer les prérequis"}
            </button>
            <SaveLine result={prerequisiteSave.result} done="Prérequis enregistrés." />
          </div>
        </div>
      </div>
    </Card>
  );
}
