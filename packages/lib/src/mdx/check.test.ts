import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkLessonMdx } from "./check.js";

/**
 * Asked before a lesson is saved: will it render?
 *
 * Both failures Sentry recorded on 22 September are here, written the way the
 * editor accepted them. Each one broke a lesson for everybody who opened it.
 */

describe("what renders", () => {
  it("accepts ordinary prose and headings", async () => {
    expect(await checkLessonMdx("Intro.\n\n## Une section\n\nDu texte.")).toEqual({ ok: true });
  });

  it("accepts components with well-formed props", async () => {
    const mdx =
      '## Quiz\n\n<Quiz id="q" question="?" options={["a", "b"]} correct={1} />\n\n' +
      '<PythonChallenge id="p" tests={[{ input: "f()", expected: "True" }]} />';
    expect(await checkLessonMdx(mdx)).toEqual({ ok: true });
  });

  it("accepts the Python lesson that is in the repository", async () => {
    // The file itself is fine; the copy in the database was edited into two
    // broken states. This keeps the good one pinned.
    const file = path.resolve(__dirname, "../../../../content/lessons/python/12-projet-cli.mdx");
    const body = readFileSync(file, "utf8").replace(/^---[\s\S]*?---\n/, "");
    expect(await checkLessonMdx(body)).toEqual({ ok: true });
  });

  it("does not run braces written in prose", async () => {
    // Prose expressions are stripped before evaluation, as on the page, so a
    // stray {True} in a sentence is not an error to report.
    expect(await checkLessonMdx("## S\n\nUn dict s'écrit {True} en prose.")).toEqual({ ok: true });
  });
});

describe("what does not - the two Sentry cases", () => {
  it("refuses a Python True inside a component's props (JAVASCRIPT-NEXTJS-14)", async () => {
    const r = await checkLessonMdx(
      '## à toi de jouer\n\n<PythonChallenge id="p" tests={[{ input: "f()", expected: True }]} />',
    );
    expect(r.ok).toBe(false);
  });

  it("says which section, and what to write instead", async () => {
    const r = await checkLessonMdx(
      'Intro.\n\n## à toi de jouer\n\n<PythonChallenge id="p" tests={[{ input: "f()", expected: True }]} />',
    );
    if (r.ok) throw new Error("accepted True");
    expect(r.section).toBe("à toi de jouer");
    expect(r.message).toContain("true");
    expect(r.message).toContain('"True"');
  });

  it("refuses a dictionary where the challenge wants text (JAVASCRIPT-NEXTJS-15)", async () => {
    const r = await checkLessonMdx(
      '## à toi de jouer\n\n<PythonChallenge id="p" tests={[{ input: "f()", expected: { titre: "x", fait: false } }]} />',
    );
    if (r.ok) throw new Error("accepted an object");
    expect(r.message).toContain("Défi Python");
    expect(r.message).toContain("Test 1");
  });

  it("finds a challenge nested inside another component", async () => {
    const r = await checkLessonMdx(
      '## S\n\n<Callout>\n\n<PythonChallenge id="p" tests={[{ input: "f()", expected: [1] }]} />\n\n</Callout>',
    );
    expect(r.ok).toBe(false);
  });
});

describe("what does not - everything else", () => {
  it("refuses MDX that does not compile", async () => {
    const r = await checkLessonMdx("## S\n\n<Quiz options={[ />");
    expect(r.ok).toBe(false);
  });

  it("refuses a name that does not exist", async () => {
    const r = await checkLessonMdx("## S\n\n<Quiz correct={reponse} />");
    if (r.ok) throw new Error("accepted an undefined name");
    expect(r.message).toContain("reponse");
  });

  it("names the introduction when the fault is before the first heading", async () => {
    const r = await checkLessonMdx("<Quiz correct={True} />\n\n## Suite\n\nOk.");
    if (r.ok) throw new Error("accepted True");
    expect(r.section).toBe("introduction");
  });

  it("stops at the first broken section, which is the one to fix", async () => {
    const r = await checkLessonMdx(
      "## A\n\n<Quiz correct={True} />\n\n## B\n\n<Quiz correct={None} />",
    );
    if (r.ok) throw new Error("accepted True");
    expect(r.section).toBe("A");
  });
});
