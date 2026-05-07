import React, { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";

// Strips mdxFlowExpression / mdxTextExpression nodes (prose JS like {variable}) from the
// unist tree while leaving mdxJsxAttributeValueExpression nodes intact. This lets
// blockJS:false preserve JSX attribute expressions (options={[...]}, correct={1}) without
// also evaluating untrusted inline expressions that would throw ReferenceErrors at runtime.
function remarkStripProseExpressions() {
  return (tree: unknown): void => {
    // SAFETY: unist Root always has { children?: unknown[] }; we only access .type and .children.
    stripNode(tree as { type?: string; children?: unknown[] });
  };
}
function stripNode(node: { type?: string; children?: unknown[] }): void {
  if (!node.children) return;
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];
    if (typeof child !== "object" || child === null) continue;
    const c = child as { type?: string; children?: unknown[] };
    if (c.type === "mdxFlowExpression" || c.type === "mdxTextExpression") {
      node.children.splice(i, 1);
    } else {
      stripNode(c);
    }
  }
}
import { requireRequestUser } from "@/lib/auth";
import { extractToc, splitMdxSections } from "@cyberlearn/lib";
import { lessonRepository, ratingRepository, qaRepository, prisma } from "@cyberlearn/db";
import { LessonRating } from "./_components/lesson-rating";
import { LessonQA } from "./_components/lesson-qa";
import { NextBar } from "./_components/next-bar";
import { FirstBlood } from "./_components/first-blood";
import { CodeBlock } from "./_components/code-block";
import { LessonStepper } from "./_components/lesson-stepper";
import { SectionPane } from "./_components/section-pane";
import { Quiz } from "./_components/quiz";
import { CodePlayground } from "./_components/code-playground";
import { SimulatedTerminal } from "./_components/simulated-terminal";
import { LessonVideo } from "./_components/lesson-video";
import { LessonImage } from "./_components/lesson-image";
import { ExternalLink } from "./_components/external-link";
import { Callout } from "./_components/callout";
import { Diagram } from "./_components/diagram";

// ── Design meta maps — aligned with catalog.css / lesson-v2.css ───────────────

const DIFF_META = {
  BEGINNER: {
    label: "Débutant",
    color: "#0AFFD4",
    bg: "rgba(10,255,212,0.1)",
    border: "rgba(10,255,212,0.4)",
  },
  INTERMEDIATE: {
    label: "Intermédiaire",
    color: "#6E8BFF",
    bg: "rgba(0,36,255,0.12)",
    border: "rgba(0,36,255,0.5)",
  },
  ADVANCED: {
    label: "Avancé",
    color: "#FF4757",
    bg: "rgba(255,71,87,0.1)",
    border: "rgba(255,71,87,0.4)",
  },
  EXPERT: {
    label: "Expert",
    color: "#FFB020",
    bg: "rgba(255,176,32,0.1)",
    border: "rgba(255,176,32,0.4)",
  },
} as const;

const CAT_META = {
  CYBERSEC: {
    label: "Cybersec",
    slug: "cybersec",
    color: "#FF4757",
    bg: "rgba(255,71,87,0.1)",
    border: "rgba(255,71,87,0.4)",
  },
  DEV: {
    label: "Dev",
    slug: "dev",
    color: "#6E8BFF",
    bg: "rgba(0,36,255,0.12)",
    border: "rgba(0,36,255,0.5)",
  },
  NETWORK: {
    label: "Réseaux",
    slug: "network",
    color: "#0AFFD4",
    bg: "rgba(10,255,212,0.1)",
    border: "rgba(10,255,212,0.4)",
  },
} as const;

type DiffKey = keyof typeof DIFF_META;
type CatKey = keyof typeof CAT_META;

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LessonPage({ params }: Props): Promise<React.ReactElement> {
  const { slug } = await params;

  const authUser = await requireRequestUser();

  const lesson = await lessonRepository.findBySlug(slug);
  if (!lesson) notFound();

  const [existing, nextLesson, ratingData, userRating, questions] = await Promise.all([
    lessonRepository.findProgress(authUser.id, lesson.id),
    prisma.lesson.findFirst({
      where: { status: "PUBLISHED", publishedAt: { gt: lesson.publishedAt ?? new Date(0) } },
      select: {
        slug: true,
        title: true,
        difficulty: true,
        category: true,
        xpReward: true,
        estimatedMinutes: true,
      },
      orderBy: { publishedAt: "asc" },
    }),
    ratingRepository.findLessonStats(lesson.id),
    ratingRepository.findUserLessonRating(authUser.id, lesson.id),
    qaRepository.findQuestionsByLesson(lesson.id),
  ]);

  if (!existing) {
    await lessonRepository.upsertProgress({
      userId: authUser.id,
      lessonId: lesson.id,
      status: "IN_PROGRESS",
      attempts: 1,
    });
  }

  const progressStatus = existing?.status ?? "IN_PROGRESS";
  const isCompleted = progressStatus === "COMPLETED";

  const catKey = lesson.category as CatKey;
  const diffKey = lesson.difficulty as DiffKey;
  const cat = CAT_META[catKey];
  const diff = DIFF_META[diffKey];

  const toc = extractToc(lesson.contentMdx);
  const sections = toc.filter((t) => t.level === 2);
  const mdxSections = splitMdxSections(lesson.contentMdx);

  return (
    <div className="lesson-page">
      {/* ── Terminal breadcrumb ───────────────────────────────────────────── */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12,
          color: "#6B6890",
          letterSpacing: "0.04em",
          padding: "6px 14px",
          border: "1px solid #2A2560",
          background: "rgba(5,4,26,0.6)",
          marginBottom: 40,
        }}
      >
        <span style={{ color: "#0AFFD4", fontWeight: 700 }}>$</span>
        <Link
          href="/lessons"
          className="breadcrumb-link"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          leçons
        </Link>
        <span style={{ color: "#1F1B47" }}>/</span>
        <Link
          href={`/lessons?category=${catKey}`}
          className="breadcrumb-link"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          <b style={{ color: "#F5F5FA", fontWeight: 500 }}>{cat.slug}</b>
        </Link>
        <span style={{ color: "#1F1B47" }}>/</span>
        <span style={{ color: "#0AFFD4" }}>{lesson.slug}.lesson</span>
      </div>

      {/* ── Hero + Mission Briefing ───────────────────────────────────────── */}
      <div className="lesson-hero-grid">
        {/* Left: angular tags + title + lede */}
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            <AngularTag color={cat.color} bg={cat.bg} border={cat.border}>
              {cat.label}
            </AngularTag>
            <AngularTag color={diff.color} bg={diff.bg} border={diff.border}>
              {diff.label}
            </AngularTag>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display, sans-serif)",
              fontWeight: 800,
              fontSize: "clamp(48px, 6vw, 80px)",
              lineHeight: 0.95,
              letterSpacing: "-0.035em",
              color: "#F5F5FA",
              margin: "0 0 22px",
            }}
          >
            <TitleWithAccent title={lesson.title} accentColor={cat.color} />
          </h1>

          <p
            style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: 17,
              color: "#B8B5D1",
              lineHeight: 1.55,
              maxWidth: 560,
              margin: 0,
            }}
          >
            {lesson.description}
          </p>
        </div>

        {/* Right: Mission Briefing card */}
        <div className="briefing-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: "1px solid #2A2560",
              background: "rgba(10,255,212,0.04)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              color: "#0AFFD4",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="briefing-dot" />
              mission briefing
            </span>
            <span style={{ color: "#3F3D5C", letterSpacing: "0.08em", textTransform: "none" }}>
              id · {lesson.refCode.slice(-8)}
            </span>
          </div>

          <div
            style={{
              padding: "24px 24px 20px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "22px 24px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <BriefingRow label="Durée">
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 600,
                  fontSize: 22,
                  letterSpacing: "0.02em",
                  color: "#F5F5FA",
                  lineHeight: 1,
                }}
              >
                {String(lesson.estimatedMinutes).padStart(2, "0")}:00
              </span>
            </BriefingRow>

            <BriefingRow label="Récompense">
              <span
                style={{
                  fontFamily: "var(--font-display, sans-serif)",
                  fontWeight: 700,
                  fontSize: 20,
                  color: "#0AFFD4",
                  lineHeight: 1,
                }}
              >
                +{lesson.xpReward} XP
              </span>
            </BriefingRow>

            <BriefingRow label="Difficulté">
              <span
                style={{
                  fontFamily: "var(--font-display, sans-serif)",
                  fontWeight: 700,
                  fontSize: 20,
                  color: diff.color,
                  lineHeight: 1,
                }}
              >
                {diff.label}
              </span>
            </BriefingRow>

            <BriefingRow label="Statut">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 600,
                  fontSize: 11,
                  color: isCompleted ? "#0AFFD4" : "#FFB547",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "currentColor",
                    boxShadow: "0 0 6px currentColor",
                  }}
                />
                {isCompleted ? "Terminée" : "En cours"}
              </span>
            </BriefingRow>

            {sections.length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    color: "#3F3D5C",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: "#0AFFD4" }}>›</span>
                  Progression · {isCompleted ? sections.length : 0}/{sections.length} sections
                </span>
                <div
                  style={{
                    height: 3,
                    background: "rgba(5,4,26,0.9)",
                    border: "1px solid #2A2560",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: isCompleted ? "100%" : "0%",
                      background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
                      boxShadow: "0 0 10px rgba(10,255,212,0.6)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stepper: timeline + MDX sections + rail + nav ─────────────────── */}
      <LessonStepper
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        xpReward={lesson.xpReward}
        isCompleted={isCompleted}
        sections={sections}
        railExtra={
          <Suspense fallback={null}>
            <FirstBlood lessonId={lesson.id} variant="rail" />
          </Suspense>
        }
      >
        {mdxSections.map((src, i) => (
          // SAFETY: index key is stable — sections don't reorder after page load
          <SectionPane key={i} index={i}>
            <MDXRemote
              source={src}
              components={{
                pre: CodeBlock,
                Quiz,
                CodePlayground,
                SimulatedTerminal,
                LessonVideo,
                LessonImage,
                ExternalLink,
                Callout,
                Diagram,
              }}
              options={{
                parseFrontmatter: true,
                // blockJS: false — next-mdx-remote's default blockJS:true strips all JSX
                // expression props (options={[...]}, correct={1}), breaking Quiz/CodePlayground.
                // remarkStripProseExpressions replaces the prose-expression safety: it strips
                // mdxFlowExpression/mdxTextExpression nodes ({variable} in prose) while leaving
                // mdxJsxAttributeValueExpression nodes intact. Content is admin-only so this
                // is safe (requireAdmin() on all mutations).
                blockJS: false,
                mdxOptions: {
                  remarkPlugins: [remarkGfm, remarkStripProseExpressions],
                  // rehypeSanitize is intentionally absent here: lesson content is admin-only
                  // (enforced by requireAdmin() on all lesson mutations), and rehypeSanitize
                  // silently drops mdxJsxFlowElement nodes, which would strip CodePlayground,
                  // Quiz, and SimulatedTerminal components from the rendered output.
                  // User-generated content (Q&A, bio) is sanitized separately.
                  rehypePlugins: [rehypeSlug, rehypeHighlight],
                },
              }}
            />
          </SectionPane>
        ))}
      </LessonStepper>

      {/* ── Next bar ─────────────────────────────────────────────────────── */}
      {nextLesson != null && (
        <NextBar
          next={nextLesson}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          xpReward={lesson.xpReward}
          isCompleted={isCompleted}
        />
      )}

      {/* ── Rating + Q&A ─────────────────────────────────────────────────── */}
      <div className="lesson-rating-qa-grid">
        <LessonRating
          lessonId={lesson.id}
          isCompleted={isCompleted}
          initialScore={userRating?.score ?? null}
          initialFeedback={userRating?.feedback ?? null}
          avgRating={ratingData?.avgRating ?? null}
          ratingsCount={ratingData?.ratingsCount ?? 0}
        />

        <LessonQA
          lessonId={lesson.id}
          lessonSlug={lesson.slug}
          currentUserId={authUser.id}
          questions={questions}
        />
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────────

function AngularTag({
  children,
  color,
  bg,
  border,
}: {
  children: ReactNode;
  color: string;
  bg: string;
  border: string;
}): React.ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px 6px 10px",
        fontFamily: "var(--font-mono, monospace)",
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        border: `1px solid ${border}`,
        background: bg,
        color,
        clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 100%, 0 100%)",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          flexShrink: 0,
          background: "currentColor",
          boxShadow: "0 0 6px currentColor",
        }}
      />
      {children}
    </span>
  );
}

function BriefingRow({
  label,
  children,
}: { label: string; children: ReactNode }): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          color: "#3F3D5C",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: "#0AFFD4" }}>›</span>
        {label}
      </span>
      {children}
    </div>
  );
}

function TitleWithAccent({
  title,
  accentColor,
}: { title: string; accentColor: string }): React.ReactElement {
  const words = title.split(" ");
  if (words.length <= 2) {
    return (
      <>
        {words.slice(0, -1).join(" ")}{" "}
        <em
          style={{
            fontStyle: "normal",
            background: `linear-gradient(135deg, ${accentColor} 0%, #0AFFD4 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {words[words.length - 1]}.
        </em>
      </>
    );
  }

  const skip = new Set([
    "les",
    "des",
    "une",
    "aux",
    "par",
    "sur",
    "sous",
    "avec",
    "pour",
    "dans",
    "que",
    "qui",
  ]);
  let accentIdx = words.length - 1;
  for (let i = words.length - 1; i >= 0; i--) {
    const w = (words[i] ?? "").toLowerCase().replace(/[^a-zàâéèêîôùû]/g, "");
    if (w.length >= 4 && !skip.has(w)) {
      accentIdx = i;
      break;
    }
  }

  return (
    <>
      {words.slice(0, accentIdx).join(" ")}{" "}
      <em
        style={{
          fontStyle: "normal",
          background: `linear-gradient(135deg, ${accentColor} 0%, #0AFFD4 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {words.slice(accentIdx).join(" ")}.
      </em>
    </>
  );
}
