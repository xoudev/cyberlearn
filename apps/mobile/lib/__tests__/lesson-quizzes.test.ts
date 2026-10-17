// The only test of the app that reads files: it runs in Node, the app never does.
/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import { describe, expect, it } from "vitest";
import { parseLesson } from "../lesson-blocks";

/**
 * The app asks the quizzes the server scores.
 *
 * The server reads a lesson's quizzes off the MDX syntax tree and holds the
 * answer key; the lesson's score is fixed at completion over every quiz it
 * reads. The app cannot ship that parser and reads the tags as text. A quiz it
 * misses is never asked and counts as wrong; one it reads differently is
 * asked with options other than those the answer is scored against. Both
 * readers must agree, on every lesson there is.
 */

function appQuizzes(mdx: string) {
  return parseLesson(mdx).quizzes.map(({ kind: _kind, ...quiz }) => quiz);
}

describe("a quiz the app reads as the server does", () => {
  it.each([
    [
      "options in single quotes",
      "<Quiz id=\"q-1\" question=\"À quoi sert mov ?\" options={['À additionner', 'À copier l\\'octet']} correct={1} />",
      1,
    ],
    [
      "a `]}` or a `/>` inside an option",
      '<Quiz id="q-1" question="Q" options={["${tab[*]}", "Avec \\"${tab[@]}\\"", "a /> b"]} correct={1} />',
      1,
    ],
    [
      "a single-quoted attribute and a template",
      "<Quiz id='q-1' question='Le \"vrai\" ?' options={[`a`, \"b\"]} correct={0} />",
      1,
    ],
    [
      "the multi-line form, its indentation and a character reference",
      '<Quiz id="q-1"\n  question="Que vaut a &amp; b ?\n    Et &#x27;c&#39; ?"\n  options={[\n    "x", // une note\n    /* une autre */ "y",\n  ]}\n  correct={1}\n  explanation="   "\n/>',
      1,
    ],
    [
      "JavaScript escapes, unknown ones dropping their backslash",
      '<Quiz id="q-1" question="C:\\Windows" options={["C:\\Windows", "C:\\\\Windows", "\\u00e9t\\u{e9}"]} correct={2} />',
      1,
    ],
    [
      "the legacy `choices`, a quiz in a QuizGroup and one in running text",
      '<QuizGroup>\n<Quiz id="a" question="Q1" choices={["x", "y"]} correct={0} />\n</QuizGroup>\n\nTexte <Quiz id="b" question="Q2" options={["x", "y"]} correct={-0} /> fin.',
      2,
    ],
    [
      "quizzes the server does not score",
      [
        '<Quiz question="Sans id" options={["x", "y"]} correct={0} />',
        '<Quiz id="q-1" question="Q" options={["x", "y"]} correct={2} />',
        '<Quiz id="q-2" question="Q" options={[1, "y"]} correct={0} />',
        '<Quiz id="q-3" question="Q" options={opts} correct={0} />',
        '<Quiz id="q-4" question="Q" options={[`${x}`, "y"]} correct={0} />',
        '<Quiz id="q-5" question="Q" options={["x", "y"]} correct={1.5} />',
        '<Quiz id="q-6" question="Q" options={["x", "y"]} correct={0} />',
        '<Quiz id="q-6" question="Le même id" options={["x", "y"]} correct={1} />',
      ].join("\n\n"),
      1,
    ],
  ])("%s", (_label, mdx, count) => {
    const server = extractLessonQuizzes(mdx);
    expect(server).toHaveLength(count);
    expect(appQuizzes(mdx)).toEqual(server);
  });
});

const ROOT = path.resolve(__dirname, "../../../../content/lessons");

function lessonsIn(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return lessonsIn(full);
    return full.endsWith(".mdx") ? [full] : [];
  });
}

const LESSONS = lessonsIn(ROOT).map((file) => ({ file, lesson: path.relative(ROOT, file) }));

// One case per lesson: the MDX parser takes a few hundred milliseconds a
// lesson, and a single case over all of them ran past its minute in CI beside
// the other suites. Split, no case comes near its limit, and a failure names
// its lesson.
const PER_LESSON_TIMEOUT = 30_000;

describe("the lessons in content/lessons", () => {
  // Guards the test itself: a moved directory would make it pass on nothing.
  it("are all found", () => {
    expect(LESSONS.length).toBeGreaterThan(100);
  });

  it.each(LESSONS)(
    "$lesson has the server's quizzes in the app",
    ({ file }) => {
      const mdx = readFileSync(file, "utf8");
      const server = extractLessonQuizzes(mdx);
      const app = appQuizzes(mdx);
      expect(app.map((q) => q.id)).toEqual(server.map((q) => q.id));
      expect(app).toEqual(server);
    },
    PER_LESSON_TIMEOUT,
  );

  it("hold enough quizzes for the check to mean something", () => {
    // Counted on the text, without the parser: the cases above compare them.
    const total = LESSONS.reduce(
      (sum, { file }) => sum + (readFileSync(file, "utf8").match(/<Quiz\b/g)?.length ?? 0),
      0,
    );
    expect(total).toBeGreaterThan(500);
  });
});
