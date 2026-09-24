import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A lesson section that fails, failing on its own.
 *
 * The case at the centre is the one Sentry recorded on 22 September
 * (JAVASCRIPT-NEXTJS-14): a Python `True` written inside a component's props.
 * It is valid MDX and invalid JavaScript, so it compiles and then throws the
 * moment the section is evaluated - which used to be inside React's render,
 * out of reach of anything, taking the whole lesson page down.
 */

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => {
    captureException(...args);
  },
}));

const { LessonSection } = await import("../lesson-section");

/** Stands in for the real challenge: shows it was reached, and with what. */
function PythonChallenge(props: { tests: unknown }): React.ReactElement {
  return React.createElement("x-challenge", null, JSON.stringify(props.tests));
}

const OPTIONS = { blockJS: false, parseFrontmatter: true };

async function render(source: string, index = 0): Promise<string> {
  const element = await LessonSection({
    source,
    components: { PythonChallenge },
    options: OPTIONS,
    lessonSlug: "python-projet-cli",
    index,
  });
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  captureException.mockClear();
});

describe("a section that renders", () => {
  it("renders its prose", async () => {
    const html = await render("## ajouter une tâche\n\nUne tâche est un dictionnaire.");
    expect(html).toContain("Une tâche est un dictionnaire.");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("hands its components the props the author wrote", async () => {
    const html = await render('<PythonChallenge tests={[{ input: "f()", expected: "True" }]} />');
    expect(html).toContain("x-challenge");
    expect(html).toContain("True");
  });
});

describe("a section that does not", () => {
  it("catches a Python True in a prop instead of throwing out of the page", async () => {
    // The Sentry case, as written in the lesson editor.
    const html = await render('<PythonChallenge tests={[{ input: "f()", expected: True }]} />');
    expect(html).toContain("Section indisponible");
    expect(html).not.toContain("x-challenge");
  });

  it("reports it, with the lesson and the section, so an author finds out", async () => {
    await render('<PythonChallenge tests={[{ input: "f()", expected: True }]} />', 5);
    expect(captureException).toHaveBeenCalledTimes(1);
    const [error, context] = captureException.mock.calls[0] as [
      Error,
      { tags: { lesson: string }; extra: { section: number }; fingerprint: string[] },
    ];
    expect(error.message).toContain("True is not defined");
    expect(context.tags.lesson).toBe("python-projet-cli");
    expect(context.extra.section).toBe(5);
    // One issue per broken section, not one per reader.
    expect(context.fingerprint).toEqual(["lesson-section-render", "python-projet-cli", "5"]);
  });

  it("catches MDX that does not even compile", async () => {
    const html = await render("<PythonChallenge tests={[ />");
    expect(html).toContain("Section indisponible");
  });

  it("does not show the reader the error itself", async () => {
    // A stack trace or "True is not defined" means nothing to a student and
    // is none of their business.
    const html = await render("<PythonChallenge tests={[{ expected: True }]} />");
    expect(html).not.toContain("True is not defined");
    expect(html).not.toContain("ReferenceError");
  });
});
