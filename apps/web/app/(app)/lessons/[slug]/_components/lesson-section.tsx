import React from "react";
import * as Sentry from "@sentry/nextjs";
import { compileMDX } from "next-mdx-remote/rsc";

/**
 * One section of a lesson, rendered so that its failure is its own.
 *
 * The page used to render every section with <MDXRemote> directly. MDXRemote
 * compiles the source and hands React an element whose function runs later,
 * during React's own render - and that function is where an author's
 * expressions are evaluated. So a single mistake anywhere in a lesson threw
 * out of the page, and nobody could read any of it: on 22 September a Python
 * `True` written inside a component's props made /lessons/python-projet-cli
 * answer with an error page for everyone (Sentry JAVASCRIPT-NEXTJS-14).
 *
 * Here the content function is called while still inside the try, which
 * evaluates every expression in the section immediately. A syntax error, a
 * `True`, a variable that does not exist - all of it lands in the catch, the
 * section is replaced by a short notice, and every other section renders.
 *
 * Calling the function by hand is safe because of how next-mdx-remote builds
 * it: no provider and no wrapper, so it is a plain function from props to an
 * element tree with no hooks in it. The components it returns (Quiz,
 * PythonChallenge...) are elements at that point and render afterwards,
 * normally, each with its own handling.
 *
 * It still reaches Sentry, tagged with the lesson and the section, because the
 * only person who can fix it is an author and this is how they find out. The
 * editor now refuses to save MDX that fails the same check, so this should
 * only ever fire on content written before that existed.
 */

type Compile = Parameters<typeof compileMDX>[0];

type MdxContentFn = (props: { components: Compile["components"] }) => React.ReactNode;

export async function LessonSection({
  source,
  components,
  options,
  lessonSlug,
  index,
}: {
  source: string;
  components: NonNullable<Compile["components"]>;
  options: NonNullable<Compile["options"]>;
  lessonSlug: string;
  index: number;
}): Promise<React.ReactElement> {
  try {
    const { content } = await compileMDX({ source, components, options });
    // SAFETY: compileMDX returns createElement(Content, { components }), so the
    // element's type is the compiled MDX content function. See the note above
    // for why calling it directly is safe.
    const Content = content.type as MdxContentFn;
    return <>{Content({ components })}</>;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "lesson.section-render", lesson: lessonSlug },
      extra: { section: index },
      // One issue per broken section, not one per reader who opens it.
      fingerprint: ["lesson-section-render", lessonSlug, String(index)],
    });
    return <SectionUnavailable />;
  }
}

function SectionUnavailable(): React.ReactElement {
  return (
    <div
      role="note"
      style={{
        margin: "24px 0",
        padding: "18px 20px",
        border: "1px solid rgba(255,176,32,0.45)",
        borderLeft: "3px solid #FFB020",
        background: "rgba(255,176,32,0.06)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#FFB020",
          marginBottom: 8,
        }}
      >
        Section indisponible
      </div>
      <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14, lineHeight: 1.55 }}>
        Cette partie de la leçon n&apos;a pas pu s&apos;afficher. L&apos;équipe a été prévenue, et
        le reste de la leçon est lisible.
      </p>
    </div>
  );
}
