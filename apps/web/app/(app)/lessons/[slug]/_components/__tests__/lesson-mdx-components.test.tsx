// @vitest-environment jsdom
import React, { type ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LESSON_COMPONENT_NAMES } from "@cyberlearn/lib/mdx-check";
import { lessonComponentWidth } from "@cyberlearn/lib/mdx-components";

/**
 * Every component of a lesson comes in a block (lesson-block.ts): a size
 * container, as wide as the registry says, that the component lays itself out
 * by. Fenced code, part of the prose, does not; nor does a link written in a
 * sentence or an image floated beside one.
 *
 * The Quiz is the delicate one. A QuizGroup reads its questions' ids and
 * numbers them: a block made on the server would reach the group as a <div>,
 * rendered, with no id. So the Quiz is handed on unrendered, to a client block
 * that steps aside inside a group.
 */

// What the components reach on a lesson page and not here: the server's
// actions, the route, the animation player.
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));
vi.mock("../../_actions/record-exercise", () => ({ recordExerciseAction: vi.fn() }));
vi.mock("../../_actions/answer-quiz", () => ({ answerQuiz: vi.fn() }));
vi.mock("../../_actions/report-quiz", () => ({ reportQuizAction: vi.fn() }));
vi.mock("../step-animation-player", () => ({ StepAnimationPlayer: () => null }));

const { LESSON_MDX_COMPONENTS } = await import("../lesson-mdx-components");
const { CodeBlock } = await import("../code-block");
const { QuizBlock } = await import("../quiz-block");
const { LessonQuizProvider } = await import("../lesson-quiz-context");

afterEach(cleanup);

type Entry = (props: Record<string, unknown>) => ReactElement<Record<string, unknown>>;

const entries: Record<string, unknown> = LESSON_MDX_COMPONENTS;

/** The entry bound to `name`, called as MDX calls it: with the author's props. */
function draw(name: string, props: Record<string, unknown>): ReactElement<Record<string, unknown>> {
  const component = entries[name];
  if (typeof component !== "function") throw new Error(`no component for ${name}`);
  // SAFETY: every entry is a function component, from props to an element.
  return (component as Entry)(props);
}

const QUIZ = { question: "Quel port ?", options: ["80", "443"], correct: 1 };

describe("the components a lesson can name", () => {
  it("are every name the pipeline accepts, and fenced code", () => {
    expect(Object.keys(LESSON_MDX_COMPONENTS).sort()).toEqual(
      [...LESSON_COMPONENT_NAMES, "pre"].sort(),
    );
    expect(LESSON_MDX_COMPONENTS.pre).toBe(CodeBlock);
  });

  it.each(LESSON_COMPONENT_NAMES.filter((name) => name !== "Quiz"))(
    "%s comes in a block as wide as the registry says",
    (name) => {
      const props = { id: "x-1", title: "Un titre" };
      const block = draw(name, props);
      expect(block.type).toBe("div");
      expect(block.props.className).toBe("lesson-block");
      expect(block.props["data-width"]).toBe(lessonComponentWidth(name));
      expect(block.props["data-component"]).toBe(name);
      // The component inside, unrendered, with the author's props as written.
      const inner = block.props.children;
      expect(React.isValidElement(inner)).toBe(true);
      if (React.isValidElement(inner)) {
        expect(typeof inner.type).toBe("function");
        expect(inner.props).toEqual(props);
      }
    },
  );

  it("hands a Quiz on unrendered, every prop of it, to the block that decides on the client", () => {
    const quiz = draw("Quiz", { id: "q-1", ...QUIZ });
    expect(quiz.type).toBe(QuizBlock);
    expect(quiz.props).toEqual({ id: "q-1", ...QUIZ, blockWidth: lessonComponentWidth("Quiz") });
  });

  it("leaves a link written in a sentence, and a floated image, in the flow of the text", () => {
    const inline = draw("ExternalLink", { href: "https://owasp.org", variant: "link" });
    expect(inline.type).not.toBe("div");
    const card = draw("ExternalLink", { href: "https://owasp.org" });
    expect(card.type).toBe("div");

    const floated = draw("LessonImage", { src: "/a.png", alt: "A", variant: "inline" });
    expect(floated.type).not.toBe("div");
    const figure = draw("LessonImage", { src: "/a.png", alt: "A" });
    expect(figure.type).toBe("div");
  });
});

describe("a Quiz in a lesson", () => {
  const { Quiz, QuizGroup } = LESSON_MDX_COMPONENTS;

  it("on its own, sits in its block, in the prose's measure", () => {
    const { container } = render(<Quiz id="q-1" {...QUIZ} />);
    const block = container.querySelector(".lesson-block");
    expect(block?.getAttribute("data-component")).toBe("Quiz");
    expect(block?.getAttribute("data-width")).toBe("prose");
    expect(block?.querySelector("section.cl-quiz")).not.toBeNull();
  });

  it("in a group, shares the group's block, and the group still finds it by its id", () => {
    const { container } = render(
      <LessonQuizProvider
        lessonId="11111111-1111-4111-8111-111111111111"
        userId="22222222-2222-4222-8222-222222222222"
        initialAnswers={{ "g-1": { selected: 1, correct: true } }}
      >
        <QuizGroup>
          <Quiz id="g-1" {...QUIZ} question="Première ?" />
          <Quiz id="g-2" {...QUIZ} question="Deuxième ?" />
          <Quiz id="g-3" {...QUIZ} question="Troisième ?" />
        </QuizGroup>
      </LessonQuizProvider>,
    );

    const blocks = container.querySelectorAll(".lesson-block");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.getAttribute("data-component")).toBe("QuizGroup");
    // g-1 is answered on record, found by its id: the group shows it and the
    // next one, numbered, and holds the third back.
    expect(screen.getByRole("region", { name: "Question 1" }).textContent).toContain("Première ?");
    expect(screen.getByRole("region", { name: "Question 2" }).textContent).toContain("2/3");
    expect(screen.queryByText("Troisième ?")).toBeNull();
  });
});
