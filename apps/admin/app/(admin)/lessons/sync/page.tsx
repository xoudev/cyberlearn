import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  EmptyState,
  GhostLink,
  KpiCard,
  PageHeader,
  Tag,
  type Tone,
} from "../../_components/admin-ui";
import { lessonSyncOverview, type LessonUpdate } from "@/lib/services/lesson-sync.service";
import {
  pathSyncOverview,
  type PathSyncOverview,
  type PathSyncState,
} from "@/lib/services/repository-import.service";
import type { DiffHunk } from "@/lib/text-diff";
import { RunAllButton, RunOneButton } from "./_components/sync-controls";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Synchroniser avec le dépôt" };
export const dynamic = "force-dynamic";
// Reads and compares every lesson file: a few seconds, more than the default.
export const maxDuration = 60;

const STATUS: Record<string, { label: string; tone: Tone }> = {
  PUBLISHED: { label: "Publiée", tone: "accent" },
  DRAFT: { label: "Brouillon", tone: "neutral" },
  ARCHIVED: { label: "Archivée", tone: "warning" },
};

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

function Hunk({ hunk }: { hunk: DiffHunk }): React.ReactElement {
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

function UpdateCard({ u }: { u: LessonUpdate }): React.ReactElement {
  const status = STATUS[u.status] ?? { label: u.status, tone: "neutral" as const };
  return (
    <section className="a-card a-sync-card">
      <div className="a-card-head a-sync-card-head">
        <div className="a-sync-card-title">
          <div className="a-sync-meta">
            <span className="a-sync-ref">{u.refCode}</span>
            <Tag tone={status.tone}>{status.label}</Tag>
          </div>
          <Link href={`/lessons/${u.lessonId}/edit`} className="a-sync-name">
            {u.title}
          </Link>
          <div className="a-sync-file">
            content/lessons/{u.file} · +{u.added} −{u.removed} ligne
            {u.added + u.removed > 1 ? "s" : ""}
          </div>
        </div>
        <RunOneButton kind="update" target={{ refCode: u.refCode, hash: u.hash, title: u.title }} />
      </div>
      <div className="a-card-pad a-sync-body">
        {u.editedInConsoleAt !== null ? (
          <p className="a-sync-warn" data-tone="warning">
            Modifiée dans l&apos;éditeur le {DATE.format(u.editedInConsoleAt)}, après son dernier
            import ou sa dernière mise à jour depuis le dépôt. Ces modifications seront remplacées :
            vérifie les différences.
          </p>
        ) : null}
        {u.quizImpacts.length > 0 ? (
          <p className="a-sync-warn" data-tone="warning">
            Quiz modifiés qui ont déjà des réponses :{" "}
            {u.quizImpacts
              .map(
                (q) =>
                  `« ${q.quizId} » (${q.change === "removed" ? "retiré" : "options ou réponse changées"}, ${String(q.answers)} réponse${q.answers > 1 ? "s" : ""})`,
              )
              .join(", ")}
            . Ces réponses et leur note restent celles de l&apos;ancienne version.
          </p>
        ) : null}
        {u.slugDiffers !== null ? (
          <p className="a-sync-warn" data-tone="info">
            Le fichier déclare le slug « {u.slugDiffers.file} », la leçon a «{" "}
            {u.slugDiffers.database} ». Le slug ne change pas : les liens vers la leçon casseraient.
          </p>
        ) : null}
        {u.fields.length > 0 ? (
          <dl className="a-sync-fields">
            {u.fields.map((f) => (
              <div key={f.field}>
                <dt>{f.label}</dt>
                <dd>
                  <del>{f.before}</del> <span aria-hidden="true">→</span> <ins>{f.after}</ins>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {u.hunks.length > 0 ? (
          <details className="a-sync-details">
            <summary>
              Voir les différences du contenu ({u.hunks.length} passage
              {u.hunks.length > 1 ? "s" : ""})
            </summary>
            <div className="a-diff">
              {u.hunks.map((h) => (
                <Hunk key={`${String(h.beforeStart)}-${String(h.afterStart)}`} hunk={h} />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function pathState(p: PathSyncState): { label: string; tone: Tone } {
  if (p.database === null) return { label: "Nouveau", tone: "info" };
  if (!p.upToDate) return { label: "À synchroniser", tone: "warning" };
  return { label: "À jour", tone: "accent" };
}

function PathsSection({ overview }: { overview: PathSyncOverview }): React.ReactElement | null {
  if (!overview.available) {
    return (
      <EmptyState
        title="Manifestes des parcours introuvables"
        text="Ce déploiement n'embarque pas content/paths. Vérifie outputFileTracingIncludes dans apps/admin/next.config.ts."
      />
    );
  }
  if (overview.paths.length === 0 && overview.errors.length === 0) return null;
  const pending = overview.paths.filter((p) => !p.upToDate);
  return (
    <section className="a-card a-sync-extra">
      <div className="a-card-head">
        <h2 className="a-card-title">Parcours du dépôt</h2>
        <Link href="/paths" className="a-card-link">
          Tous les parcours →
        </Link>
      </div>
      <div className="a-card-pad a-sync-body">
        <p className="a-sync-file">
          Chaque manifeste de content/paths décrit un parcours, ses modules et l&apos;ordre de ses
          leçons. Importe d&apos;abord les leçons : seules celles déjà en base sont rattachées, les
          autres le seront à la prochaine synchronisation.
        </p>
        {overview.errors.length > 0 ? (
          <ul className="a-sync-failures" role="alert">
            {overview.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        {pending.length > 0 && overview.errors.length === 0 ? (
          <RunAllButton
            kind="path"
            targets={pending.map((p) => ({ refCode: p.refCode, title: p.title }))}
          />
        ) : null}
        <ul className="a-sync-plain">
          {overview.paths.map((p) => {
            const state = pathState(p);
            const status = p.database ? (STATUS[p.database.status] ?? null) : null;
            return (
              <li key={p.refCode}>
                <span className="a-sync-ref">{p.refCode}</span>{" "}
                {p.database ? (
                  <Link href={`/paths/${p.database.id}/edit`}>{p.title}</Link>
                ) : (
                  p.title
                )}{" "}
                <Tag tone={state.tone}>{state.label}</Tag>{" "}
                {status ? <Tag tone={status.tone}>{status.label}</Tag> : null}{" "}
                <span className="a-sync-file">
                  content/paths/{p.file} · {p.modules} module{p.modules > 1 ? "s" : ""} ·{" "}
                  {p.importedLessons}/{p.lessons} leçons en base
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default async function LessonSyncPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const [overview, paths] = await Promise.all([lessonSyncOverview(), pathSyncOverview()]);

  return (
    <main className="admin-page-content">
      <PageHeader
        eyebrow="Contenu"
        title="Synchroniser avec le dépôt"
        description="Les leçons de content/lessons et les parcours de content/paths, comparés à la base. Rien n'est écrit sans confirmation, et rien n'est publié : les nouvelles leçons et les nouveaux parcours arrivent en brouillon. Le slug, le statut et l'image de couverture d'une leçon existante ne changent jamais."
        actions={<GhostLink href="/lessons">Retour aux leçons</GhostLink>}
      />

      {!overview.available ? (
        <EmptyState
          title="Fichiers du dépôt introuvables"
          text="Ce déploiement n'embarque pas content/lessons. Vérifie outputFileTracingIncludes dans apps/admin/next.config.ts."
        />
      ) : (
        <>
          <div className="a-kpi-grid a-sync-kpis">
            <KpiCard
              label="À mettre à jour"
              value={String(overview.updates.length)}
              tone="warning"
            />
            <KpiCard label="Déjà à jour" value={String(overview.unchanged)} tone="accent" />
            <KpiCard
              label="Pas encore importées"
              value={String(overview.notImported.length)}
              tone="info"
            />
            <KpiCard
              label="Parcours à synchroniser"
              value={String(paths.paths.filter((p) => !p.upToDate).length)}
              tone="info"
            />
            <KpiCard
              label="Fichiers illisibles"
              value={String(overview.unreadable.length)}
              tone="danger"
            />
          </div>

          {overview.notImported.length > 0 ? (
            <section className="a-card a-sync-extra">
              <div className="a-card-head">
                <h2 className="a-card-title">Nouvelles leçons du dépôt</h2>
              </div>
              <div className="a-card-pad a-sync-body">
                <p className="a-sync-file">
                  Importées en brouillon avec les mêmes contrôles que l&apos;import d&apos;un
                  fichier, dans l&apos;ordre de leurs prérequis. Publie-les ensuite depuis la liste
                  des leçons.
                </p>
                <RunAllButton
                  kind="import"
                  targets={overview.notImported.map((n) => ({
                    refCode: n.refCode,
                    title: n.title,
                  }))}
                />
                <ul className="a-sync-plain">
                  {overview.notImported.map((n) => (
                    <li key={n.file}>
                      <span className="a-sync-ref">{n.refCode}</span> {n.title}{" "}
                      <span className="a-sync-file">content/lessons/{n.file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <PathsSection overview={paths} />

          {overview.updates.length === 0 ? (
            <EmptyState
              title="Tout est à jour"
              text="Chaque leçon importée correspond à son fichier dans le dépôt."
            />
          ) : (
            <>
              <RunAllButton
                kind="update"
                targets={overview.updates.map((u) => ({
                  refCode: u.refCode,
                  hash: u.hash,
                  title: u.title,
                }))}
              />
              <div className="a-sync-list">
                {overview.updates.map((u) => (
                  <UpdateCard key={u.lessonId} u={u} />
                ))}
              </div>
            </>
          )}

          {overview.unreadable.length > 0 ? (
            <section className="a-card a-sync-extra">
              <div className="a-card-head">
                <h2 className="a-card-title">Fichiers illisibles</h2>
              </div>
              <ul className="a-card-pad a-sync-plain">
                {overview.unreadable.map((u) => (
                  <li key={u.file}>
                    <span className="a-sync-file">content/lessons/{u.file}</span> {u.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
