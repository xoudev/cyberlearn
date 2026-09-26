import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { lessonRepository } from "@cyberlearn/db";
import { LessonCard } from "@cyberlearn/ui";
import type { Category, Difficulty, ProgressStatus } from "@cyberlearn/db";
import { LessonsBodySkeleton } from "./_components/lessons-body-skeleton";
import { requireRequestUser } from "@/lib/auth";
import { indexPlacements } from "@/lib/lessons/unlock";
import { availableFirst } from "@/lib/lessons/catalog-order";
import { LessonsSearchBar } from "./_components/lessons-search-bar";
import { resolveLessonCoverSrcMany } from "@/lib/lesson-cover/storage";

export const metadata: Metadata = { title: "Leçons" };

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "ALL" as const, label: "TOUS", dot: "#B8B5D1" },
  { value: "DEV" as const, label: "DEV", dot: "#6E8BFF" },
  { value: "CYBERSEC" as const, label: "CYBERSEC", dot: "#FF4757" },
  { value: "NETWORK" as const, label: "RÉSEAU", dot: "#0AFFD4" },
];

const DIFFICULTIES: { value: Difficulty | "ALL"; label: string }[] = [
  { value: "ALL", label: "NIVEAU · TOUS" },
  { value: "BEGINNER", label: "DÉBUTANT" },
  { value: "INTERMEDIATE", label: "INTERMÉDIAIRE" },
  { value: "ADVANCED", label: "AVANCÉ" },
  { value: "EXPERT", label: "EXPERT" },
];

const STATUSES: { value: ProgressStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "STATUT · TOUS" },
  { value: "NOT_STARTED", label: "NON COMMENCÉS" },
  { value: "IN_PROGRESS", label: "EN COURS" },
  { value: "COMPLETED", label: "TERMINÉS" },
];

const PAGE_SIZE = 9;

// ── URL helpers ────────────────────────────────────────────────────────────────

type RawParams = Record<string, string | string[] | undefined>;

function str(params: RawParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

function buildUrl(params: RawParams, updates: Record<string, string | null>): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined) next.set(k, val);
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
    if (k !== "page") next.delete("page");
  }
  const qs = next.toString();
  return `/lessons${qs ? `?${qs}` : ""}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<RawParams>;
}

export default async function LessonsPage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const p = await searchParams;
  return (
    <div className="page-container">
      {/* ── Breadcrumb (static, renders immediately) ─────────────────────── */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "#7F7BA9",
          marginBottom: 22,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "var(--cosmetic-accent)" }}>$</span>
        <span>~/</span>
        <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
        <span style={{ color: "#2A2560" }}>/</span>
        <span style={{ color: "#F5F5FA", fontWeight: 500 }}>leçons</span>
        {/* Blinking cursor */}
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: "var(--cosmetic-accent)",
            boxShadow: "0 0 8px var(--cosmetic-accent)",
            marginLeft: 4,
            verticalAlign: "-2px",
            animation: "blink 1s step-end infinite",
          }}
          aria-hidden="true"
        />
      </div>
      <Suspense fallback={<LessonsBodySkeleton />}>
        <LessonsBody p={p} />
      </Suspense>
    </div>
  );
}

async function LessonsBody({ p }: { p: RawParams }): Promise<React.ReactElement> {
  const rawCategory = str(p, "category");
  const rawDifficulty = str(p, "difficulty");
  const rawStatus = str(p, "status");
  const rawSearch = str(p, "q") ?? "";
  const rawPage = parseInt(str(p, "page") ?? "1", 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const activeCategory = rawCategory as Category | undefined;
  const activeDifficulty = rawDifficulty as Difficulty | undefined;
  const activeStatus = rawStatus as ProgressStatus | undefined;

  const authUser = await requireRequestUser();

  const [{ total, lessons: matchingLessons }, categoryCounts] = await Promise.all([
    lessonRepository.findManyWithProgress(authUser.id, {
      ...(activeCategory !== undefined ? { category: activeCategory } : {}),
      ...(activeDifficulty !== undefined ? { difficulty: activeDifficulty } : {}),
      ...(activeStatus !== undefined ? { progressStatus: activeStatus } : {}),
      ...(rawSearch.length > 0 ? { search: rawSearch } : {}),
      paginate: false,
    }),
    lessonRepository.countByCategory(authUser.id),
  ]);

  // Resolve availability across the matching catalogue before paginating.
  // Sign cover URLs only for the cards on the resulting page.
  const pathContexts = await lessonRepository.findPathContexts(
    authUser.id,
    matchingLessons.map((l) => l.id),
  );
  const placements = indexPlacements(pathContexts.paths, pathContexts.completedLessonIds);
  const lessons = availableFirst(matchingLessons, placements).slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const coverSrcs = await resolveLessonCoverSrcMany(lessons.map((l) => l.coverImageUrl));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  // Over every matching lesson, as `total` next to them is: counted over the
  // page on screen, the strip said "1 en cours" while the dashboard said 2.
  const inProgressCount = matchingLessons.filter((l) => l.progressStatus === "IN_PROGRESS").length;
  const completedCount = matchingLessons.filter((l) => l.progressStatus === "COMPLETED").length;

  return (
    <>
      {/* ── Header: two-column grid ──────────────────────────────────────── */}
      <div className="catalog-header-grid">
        {/* Left: title + subtitle */}
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(42px, 5vw, 68px)",
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#F5F5FA",
              margin: "0 0 14px",
            }}
          >
            {total}{" "}
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(135deg, #0024FF 0%, var(--cosmetic-accent) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              missions
            </em>
            <br />
            disponibles
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 16,
              color: "#B8B5D1",
              margin: 0,
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            Filtre par domaine, niveau ou statut. Chaque leçon te fait progresser dans ton parcours
            et alimente ton XP.
          </p>
        </div>

        {/* Right: meta stats */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}
        >
          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#7F7BA9",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>
              <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>{total}</b> total
            </span>
            <span style={{ color: "#2A2560" }}>/</span>
            <span>
              <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>{inProgressCount}</b>{" "}
              en cours
            </span>
            <span style={{ color: "#2A2560" }}>/</span>
            <span>
              <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>{completedCount}</b>{" "}
              terminées
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#7F7BA9",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>TRIER · ACCESSIBLES D’ABORD</span>
            <span style={{ color: "#2A2560" }}>/</span>
            <span>VUE · GRILLE</span>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="filter-bar" style={{ alignItems: "center" }}>
        {/* Category pills with colored dots */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#7F7BA9",
              marginRight: 6,
            }}
          >
            › DOMAINE
          </span>
          {CATEGORIES.map((c) => {
            const isActive =
              c.value === "ALL" ? activeCategory === undefined : activeCategory === c.value;
            const count = c.value !== "ALL" ? (categoryCounts[c.value] ?? 0) : total;
            return (
              <CategoryPill
                key={c.value}
                href={buildUrl(p, { category: c.value === "ALL" ? null : c.value })}
                active={isActive}
                dot={c.dot}
                count={count}
              >
                {c.label}
              </CategoryPill>
            );
          })}
        </div>

        {/* Difficulty select (link-based) */}
        <DifficultySelect params={p} active={activeDifficulty} />

        {/* Status select (link-based) */}
        <StatusSelect params={p} active={activeStatus} />

        {/* Search */}
        <LessonsSearchBar initialQuery={rawSearch} />
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {lessons.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="lessons-catalog-grid">
          {lessons.map((lesson, i) => {
            const placement = placements.get(lesson.id);
            const locked = placement?.state === "locked";
            return (
              <Link
                key={lesson.id}
                // A locked card leads to the path that opens it, not to a page
                // that would only bounce back here.
                href={locked ? `/paths/${placement.path.slug}` : `/lessons/${lesson.slug}`}
                className={locked ? "lesson-locked" : undefined}
                aria-label={
                  locked
                    ? `${lesson.title}. Leçon verrouillée, à débloquer dans le parcours ${placement.path.title}`
                    : undefined
                }
                style={
                  locked ? undefined : { display: "block", height: "100%", textDecoration: "none" }
                }
              >
                <LessonCard
                  title={lesson.title}
                  slug={lesson.slug}
                  description={lesson.description}
                  difficulty={
                    lesson.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
                  }
                  category={lesson.category as "CYBERSEC" | "DEV" | "NETWORK"}
                  durationMinutes={lesson.estimatedMinutes}
                  xpReward={lesson.xpReward}
                  status={
                    (lesson.progressStatus ?? "NOT_STARTED") as
                      | "NOT_STARTED"
                      | "IN_PROGRESS"
                      | "COMPLETED"
                  }
                  refCode={lesson.refCode}
                  coverSrc={coverSrcs[i] ?? null}
                  quizScore={lesson.quizScore}
                  variant="catalog"
                />
                {locked && (
                  <span className="lesson-locked__chip">
                    <svg viewBox="0 0 12 14" width={10} height={11} fill="none" aria-hidden="true">
                      <rect
                        x="1"
                        y="6"
                        width="10"
                        height="7"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="lesson-locked__path">{placement.path.title}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Footer strip - pagination ────────────────────────────────────── */}
      {totalPages > 1 && (
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            // wrap so the page-number cluster drops below the count on narrow
            // screens instead of the "SUIV" button spilling past the strip edge
            flexWrap: "wrap",
            gap: 12,
            padding: "14px 20px",
            border: "1px solid #2A2560",
            background: "rgba(5,4,26,0.5)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#7F7BA9",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>
            Affichage{" "}
            <b style={{ color: "#F5F5FA" }}>
              {startIdx}–{endIdx}
            </b>{" "}
            sur <b style={{ color: "#F5F5FA" }}>{total}</b>
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {page > 1 && <PageBtn href={buildUrl(p, { page: String(page - 1) })}>← PRÉC</PageBtn>}
            {buildPageRange(page, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${String(i)}`} style={{ padding: "0 6px", color: "#2A2560" }}>
                  …
                </span>
              ) : (
                <PageBtn key={n} href={buildUrl(p, { page: String(n) })} active={n === page}>
                  {String(n).padStart(2, "0")}
                </PageBtn>
              ),
            )}
            {page < totalPages && (
              <PageBtn href={buildUrl(p, { page: String(page + 1) })}>SUIV →</PageBtn>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Page range helper ─────────────────────────────────────────────────────────

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n++) pages.push(n);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CategoryPill({
  href,
  active,
  dot,
  count,
  children,
}: {
  href: string;
  active: boolean;
  dot: string;
  count: number;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 34,
        padding: "0 14px",
        background: active
          ? "color-mix(in srgb, var(--cosmetic-accent) 5%, transparent)"
          : "transparent",
        border: active ? "1px solid var(--cosmetic-accent)" : "1px solid #2A2560",
        color: active ? "var(--cosmetic-accent)" : "#B8B5D1",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        textDecoration: "none",
        borderRadius: 0,
        boxShadow: active
          ? "0 0 0 1px color-mix(in srgb, var(--cosmetic-accent) 25%, transparent), 0 0 18px color-mix(in srgb, var(--cosmetic-accent) 18%, transparent)"
          : "none",
        transition: "all 180ms ease",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }}
        aria-hidden="true"
      />
      <span>{children}</span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: active ? "var(--cosmetic-accent)" : "#3F3D5C",
          padding: "1px 6px",
          border: `1px solid ${active ? "color-mix(in srgb, var(--cosmetic-accent) 35%, transparent)" : "#2A2560"}`,
          letterSpacing: "0.04em",
        }}
      >
        {count}
      </span>
    </Link>
  );
}

function SelectPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 34,
        padding: "0 14px",
        background: active
          ? "color-mix(in srgb, var(--cosmetic-accent) 5%, transparent)"
          : "#05041A",
        border: active ? "1px solid var(--cosmetic-accent)" : "1px solid #2A2560",
        color: active ? "var(--cosmetic-accent)" : "#B8B5D1",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textDecoration: "none",
        borderRadius: 0,
        whiteSpace: "nowrap",
        transition: "all 180ms ease",
      }}
    >
      {children}
    </Link>
  );
}

function DifficultySelect({
  params,
  active,
}: { params: RawParams; active: Difficulty | undefined }): React.ReactElement {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          minWidth: 160,
        }}
      >
        {/* Active label */}
        <SelectPill href={buildUrl(params, { difficulty: null })} active={active === undefined}>
          {DIFFICULTIES.find((d) => d.value === (active ?? "ALL"))?.label ?? "NIVEAU · TOUS"}
        </SelectPill>
      </div>
    </div>
  );
}

function StatusSelect({
  params,
  active,
}: { params: RawParams; active: ProgressStatus | undefined }): React.ReactElement {
  return (
    <div style={{ position: "relative" }}>
      <SelectPill href={buildUrl(params, { status: null })} active={active === undefined}>
        {STATUSES.find((s) => s.value === (active ?? "ALL"))?.label ?? "STATUT · TOUS"}
      </SelectPill>
    </div>
  );
}

function PageBtn({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      style={{
        padding: "6px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: active ? "var(--cosmetic-accent)" : "#B8B5D1",
        background: active
          ? "color-mix(in srgb, var(--cosmetic-accent) 5%, transparent)"
          : "transparent",
        border: active ? "1px solid var(--cosmetic-accent)" : "1px solid #2A2560",
        borderRadius: 0,
        textDecoration: "none",
        transition: "all 180ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Link>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "96px 0",
      }}
    >
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <rect x="8" y="20" width="56" height="40" stroke="#2A2560" strokeWidth="2" />
        <line x1="8" y1="20" x2="8" y2="60" stroke="#0024FF" strokeWidth="3" />
        <path d="M22 36h28M22 44h18" stroke="#2A2560" strokeWidth="2" strokeLinecap="round" />
        <circle cx="58" cy="58" r="11" fill="#07051E" stroke="#2A2560" strokeWidth="2" />
        <path d="M54 58h8M58 54v8" stroke="#3F3D5C" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#F5F5FA", margin: 0 }}>
          Aucune leçon trouvée
        </p>
        <p style={{ marginTop: 6, fontSize: 13, color: "#7F7BA9" }}>
          Modifie tes filtres ou ta recherche pour explorer d&apos;autres leçons.
        </p>
      </div>
      <Link
        href="/lessons"
        style={{
          padding: "10px 20px",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "linear-gradient(135deg, #0024FF, var(--cosmetic-accent))",
          color: "#030219",
          borderRadius: 0,
          textDecoration: "none",
        }}
      >
        Réinitialiser les filtres
      </Link>
    </div>
  );
}
