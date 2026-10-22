import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { lessonRepository } from "@cyberlearn/db";
import type { Difficulty, ProgressStatus } from "@cyberlearn/db";
import { LessonsBodySkeleton } from "./_components/lessons-body-skeleton";
import { CatalogueLessonCard } from "./_components/catalogue-lesson-card";
import { requireRequestUser } from "@/lib/auth";
import { indexPlacements } from "@cyberlearn/lib/paths/unlock";
import { unlocksEveryLesson } from "@/lib/lessons/access";
import { availableFirst } from "@/lib/lessons/catalog-order";
import { catalogHref, parseCatalogFilters, type RawParams } from "@/lib/lessons/catalog-filters";
import { CatalogFilterSelect } from "./_components/catalog-filter-select";
import { LessonsSearchBar } from "./_components/lessons-search-bar";
import { resolveLessonCoverSrcMany } from "@/lib/lesson-cover/storage";
import { EmptyState } from "@/components/empty-state";
import "./lessons-catalogue.css";

export const metadata: Metadata = { title: "Leçons" };

const CATEGORIES: { value: "ALL" | "DEV" | "CYBERSEC" | "NETWORK"; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "DEV", label: "Dev" },
  { value: "CYBERSEC", label: "Cybersec" },
  { value: "NETWORK", label: "Réseau" },
];
const DIFFICULTIES: { value: Difficulty | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous les niveaux" },
  { value: "BEGINNER", label: "Débutant" },
  { value: "INTERMEDIATE", label: "Intermédiaire" },
  { value: "ADVANCED", label: "Avancé" },
  { value: "EXPERT", label: "Expert" },
];
const STATUSES: { value: ProgressStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "NOT_STARTED", label: "Non commencées" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminées" },
];
const PAGE_SIZE = 9;

interface PageProps {
  searchParams: Promise<RawParams>;
}

export default async function LessonsPage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const p = await searchParams;
  return (
    <div className="page-container lessons-catalogue learning-catalogue">
      <Suspense fallback={<LessonsBodySkeleton />}>
        <LessonsBody p={p} />
      </Suspense>
    </div>
  );
}

async function LessonsBody({ p }: { p: RawParams }): Promise<React.ReactElement> {
  const filters = parseCatalogFilters(p);
  const { category: activeCategory, page } = filters;
  // Counts share the current search, level and status, but each counts its own category.
  const shared = {
    difficulty: filters.difficulty,
    progressStatus: filters.status,
    search: filters.q,
  };
  const authUser = await requireRequestUser();
  const [{ total, lessons: matchingLessons }, categoryCounts] = await Promise.all([
    lessonRepository.findManyWithProgress(authUser.id, {
      ...shared,
      category: activeCategory,
      paginate: false,
    }),
    lessonRepository.countByCategory(authUser.id, shared),
  ]);
  const allCount = Object.values(categoryCounts).reduce((sum, n) => sum + n, 0);

  // Availability is resolved before pagination; signed covers are limited to the visible page.
  const [pathContexts, unlockAll] = await Promise.all([
    lessonRepository.findPathContexts(
      authUser.id,
      matchingLessons.map((l) => l.id),
    ),
    unlocksEveryLesson(authUser.id),
  ]);
  const placements = indexPlacements(pathContexts.paths, pathContexts.completedLessonIds, {
    unlockAll,
    waivedLessonIds: pathContexts.waivedLessonIds,
  });
  const lessons = availableFirst(matchingLessons, placements).slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const coverSrcs = await resolveLessonCoverSrcMany(lessons.map((l) => l.coverImageUrl));
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);
  const inProgressCount = matchingLessons.filter((l) => l.progressStatus === "IN_PROGRESS").length;
  const completedCount = matchingLessons.filter((l) => l.progressStatus === "COMPLETED").length;
  const hasFilters = [filters.category, filters.difficulty, filters.status, filters.q].some(
    (value) => Boolean(value),
  );

  return (
    <>
      <header className="catalogue-heading">
        <div>
          <p className="catalogue-heading__index">Apprendre / Leçons</p>
          <h1>
            Une notion.
            <br />
            <em>À toi de jouer.</em>
          </h1>
          <p className="catalogue-heading__description">
            Un protocole à comprendre, une faille à repérer, du code à écrire. Choisis ce que tu
            veux travailler aujourd’hui.
          </p>
        </div>
        <aside className="catalogue-summary" aria-label="Leçons correspondant aux filtres">
          <div className="catalogue-summary__count">
            <strong>{String(total).padStart(2, "0")}</strong>
            <span>{hasFilters ? "leçons dans ta sélection" : "leçons au catalogue"}</span>
          </div>
          <div className="catalogue-summary__stats">
            <span>
              <b>{inProgressCount}</b> en cours
            </span>
            <span>
              <b>{completedCount}</b> terminées
            </span>
          </div>
          <p className="catalogue-summary__note">
            Les leçons accessibles apparaissent en premier. Celles à débloquer te renvoient vers
            leur parcours.
          </p>
        </aside>
      </header>

      <div className="catalogue-tools">
        <nav className="catalogue-tools__domains" aria-label="Domaine des leçons">
          <span className="catalogue-tools__label">Domaine</span>
          <div className="lessons-catalogue__domains">
            {CATEGORIES.map((c) => {
              const active =
                c.value === "ALL" ? activeCategory === undefined : activeCategory === c.value;
              const count = c.value === "ALL" ? allCount : (categoryCounts[c.value] ?? 0);
              return (
                <Link
                  key={c.value}
                  href={catalogHref(filters, { category: c.value === "ALL" ? null : c.value })}
                  className="catalogue-domain"
                  aria-current={active ? "true" : undefined}
                >
                  {c.label}
                  <b>{count}</b>
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="lessons-catalogue__refine">
          <CatalogFilterSelect
            label="Niveau"
            value={filters.difficulty ?? "ALL"}
            options={DIFFICULTIES.map((d) => ({
              ...d,
              href: catalogHref(filters, { difficulty: d.value === "ALL" ? null : d.value }),
            }))}
          />
          <CatalogFilterSelect
            label="Statut"
            value={filters.status ?? "ALL"}
            options={STATUSES.map((s) => ({
              ...s,
              href: catalogHref(filters, { status: s.value === "ALL" ? null : s.value }),
            }))}
          />
          <LessonsSearchBar />
        </div>
      </div>

      <div className="catalogue-results">
        <h2>{hasFilters ? "Ta sélection" : "Toutes les leçons"}</h2>
        <p>
          {total} résultat{total > 1 ? "s" : ""}
        </p>
        {hasFilters && (
          <Link href="/lessons" className="catalogue-results__link">
            Réinitialiser les filtres
          </Link>
        )}
      </div>

      {lessons.length === 0 ? (
        <LessonsEmpty />
      ) : (
        <div className="lessons-catalogue__grid">
          {lessons.map((lesson, i) => {
            const placement = placements.get(lesson.id);
            const locked = placement?.state === "locked";
            return (
              <Link
                key={lesson.id}
                href={locked ? `/paths/${placement.path.slug}` : `/lessons/${lesson.slug}`}
                className="lessons-catalogue__card-link"
                aria-label={
                  locked
                    ? `${lesson.title}. Leçon verrouillée, à débloquer dans le parcours ${placement.path.title}`
                    : lesson.title
                }
              >
                <CatalogueLessonCard
                  title={lesson.title}
                  description={lesson.description}
                  difficulty={lesson.difficulty}
                  category={lesson.category}
                  durationMinutes={lesson.estimatedMinutes}
                  xpReward={lesson.xpReward}
                  status={lesson.progressStatus ?? "NOT_STARTED"}
                  refCode={lesson.refCode}
                  coverSrc={coverSrcs[i] ?? null}
                  quizScore={lesson.quizScore}
                  lockedPath={locked ? placement.path.title : null}
                />
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="lessons-catalogue__pagination" aria-label="Pagination des leçons">
          <span>
            Affichage{" "}
            <b>
              {startIdx}–{endIdx}
            </b>{" "}
            sur <b>{total}</b>
          </span>
          <div>
            {page > 1 && (
              <PageBtn href={catalogHref(filters, { page: String(page - 1) })}>← Précédent</PageBtn>
            )}
            {buildPageRange(page, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${String(i)}`}>…</span>
              ) : (
                <PageBtn
                  key={n}
                  href={catalogHref(filters, { page: String(n) })}
                  active={n === page}
                >
                  {String(n).padStart(2, "0")}
                </PageBtn>
              ),
            )}
            {page < totalPages && (
              <PageBtn href={catalogHref(filters, { page: String(page + 1) })}>Suivant →</PageBtn>
            )}
          </div>
        </nav>
      )}
    </>
  );
}

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n++) pages.push(n);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function PageBtn({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link className="catalogue-domain" href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

function LessonsEmpty(): React.ReactElement {
  return (
    <EmptyState
      title="Aucune leçon trouvée"
      message="Modifie tes filtres ou ta recherche pour trouver une leçon."
    >
      <Link href="/lessons" className="btn btn--ghost btn--sm">
        Réinitialiser les filtres
      </Link>
    </EmptyState>
  );
}
