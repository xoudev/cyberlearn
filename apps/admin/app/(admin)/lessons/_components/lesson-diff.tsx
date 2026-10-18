import React from "react";
import type { CatalogueChange } from "@cyberlearn/db/catalogue";
import type { LessonDiffHunk, LessonFieldChange, LessonUpdatePreview } from "@cyberlearn/types";

/**
 * What writing a file over the database would change, as the sync page and
 * the import page both show it before anything is written: the passages of a
 * lesson's content, its fields, the warnings that go with it, and the
 * changes a sync makes to a path, an exam or a challenge.
 *
 * No state and no hooks: the sync page renders these on the server, the
 * import page inside its client component.
 */

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function Hunk({ hunk }: { hunk: LessonDiffHunk }): React.ReactElement {
  return (
    <div className="a-diff-hunk">
      <div className="a-diff-head">
        Ligne {hunk.beforeStart} → {hunk.afterStart}
      </div>
      {hunk.lines.map((line, i) => (
        <div key={`${line.kind}-${String(i)}`} className="a-diff-line" data-kind={line.kind}>
          <span className="a-diff-sign" aria-hidden="true">
            {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}
          </span>
          <span className="a-visually-hidden">
            {line.kind === "added" ? "Ajouté : " : line.kind === "removed" ? "Retiré : " : ""}
          </span>
          {line.text === "" ? " " : line.text}
        </div>
      ))}
    </div>
  );
}

/** The changed passages of a lesson's content, each with its context. */
export function DiffHunks({ hunks }: { hunks: LessonDiffHunk[] }): React.ReactElement {
  return (
    <div className="a-diff">
      {hunks.map((h) => (
        <Hunk key={`${String(h.beforeStart)}-${String(h.afterStart)}`} hunk={h} />
      ))}
    </div>
  );
}

/** Changes as a list: a value replaced, something added, taken out, or rewritten. */
export function ChangeList({ changes }: { changes: CatalogueChange[] }): React.ReactElement | null {
  if (changes.length === 0) return null;
  return (
    <dl className="a-sync-fields">
      {changes.map((c, i) => (
        <div key={`${c.label}-${String(i)}`}>
          <dt>{c.label}</dt>
          <dd>
            {c.kind === "changed" ? (
              <>
                <del>{c.before}</del> <span aria-hidden="true">→</span> <ins>{c.after}</ins>
              </>
            ) : c.kind === "added" ? (
              <ins>
                <span className="a-visually-hidden">Ajouté : </span>
                {c.value}
              </ins>
            ) : c.kind === "removed" ? (
              <del>
                <span className="a-visually-hidden">Retiré : </span>
                {c.value}
              </del>
            ) : (
              c.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * How many lines of the content change, as a sentence says it: "3 lignes",
 * or "au plus 3 400 lignes" when the stretch was too long to compare.
 */
export function changedLines(
  update: Pick<LessonUpdatePreview, "added" | "removed" | "hunksOmitted">,
): string {
  const n = update.added + update.removed;
  return `${update.hunksOmitted ? "au plus " : ""}${String(n)} ligne${n > 1 ? "s" : ""}`;
}

/** The counts of a lesson's card: "+2 −1 lignes", "au plus" when not compared line by line. */
export function lineCounts(
  update: Pick<LessonUpdatePreview, "added" | "removed" | "hunksOmitted">,
): string {
  const n = update.added + update.removed;
  return `+${String(update.added)} −${String(update.removed)} ligne${n > 1 ? "s" : ""}${update.hunksOmitted ? " au plus" : ""}`;
}

/** A lesson's fields its file changes, old value then new. */
export function FieldChanges({
  fields,
}: {
  fields: LessonFieldChange[];
}): React.ReactElement | null {
  return (
    <ChangeList
      changes={fields.map((f) => ({
        kind: "changed",
        label: f.label,
        before: f.before,
        after: f.after,
      }))}
    />
  );
}

/**
 * What an update would also replace or leave as it is: edits made in the
 * console, a studio draft open on the lesson, quizzes already answered, a
 * slug the file names differently; and a content too changed for its
 * passages to be shown.
 */
export function LessonUpdateNotes({
  update,
}: {
  update: Pick<
    LessonUpdatePreview,
    "editedInConsoleAt" | "draftSavedAt" | "quizImpacts" | "slugDiffers" | "hunksOmitted"
  >;
}): React.ReactElement {
  return (
    <>
      {update.hunksOmitted ? (
        <p className="a-sync-warn" data-tone="warning">
          Le contenu change sur trop de lignes d&apos;un seul tenant pour être comparé ligne à ligne
          : les passages ne sont pas affichés. Relis le fichier avant de confirmer.
        </p>
      ) : null}
      {update.editedInConsoleAt !== null ? (
        <p className="a-sync-warn" data-tone="warning">
          Modifiée dans l&apos;éditeur le {DATE.format(update.editedInConsoleAt)}, après son dernier
          import ou sa dernière mise à jour depuis un fichier. Ces modifications seront remplacées :
          vérifie les différences.
        </p>
      ) : null}
      {update.draftSavedAt !== null ? (
        <p className="a-sync-warn" data-tone="warning">
          Un brouillon est ouvert sur cette leçon dans le studio (enregistré le{" "}
          {DATE_TIME.format(update.draftSavedAt)}). La mise à jour le garde tel quel : le studio
          signalera que la leçon a changé depuis, et sa publication remplacerait ce contenu.
        </p>
      ) : null}
      {update.quizImpacts.length > 0 ? (
        <p className="a-sync-warn" data-tone="warning">
          Quiz modifiés qui ont déjà des réponses :{" "}
          {update.quizImpacts
            .map(
              (q) =>
                `« ${q.quizId} » (${q.change === "removed" ? "retiré" : "options ou réponse changées"}, ${String(q.answers)} réponse${q.answers > 1 ? "s" : ""})`,
            )
            .join(", ")}
          . Ces réponses et leur note restent celles de l&apos;ancienne version.
        </p>
      ) : null}
      {update.slugDiffers !== null ? (
        <p className="a-sync-warn" data-tone="info">
          Le fichier déclare le slug « {update.slugDiffers.file} », la leçon a «{" "}
          {update.slugDiffers.database} ». Le slug ne change pas : les liens vers la leçon
          casseraient.
        </p>
      ) : null}
    </>
  );
}
