// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MdxEditorPanelProps } from "@cyberlearn/ui/mdx-editor";

interface ClassLessonState {
  ok?: boolean;
  error?: string;
  slug?: string;
}

const m = vi.hoisted(() => ({
  createClassLessonAction: vi.fn<(prev: unknown, form: FormData) => Promise<ClassLessonState>>(),
  updateClassLessonAction: vi.fn<(prev: unknown, form: FormData) => Promise<ClassLessonState>>(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("../../_actions/class-lesson-actions", () => ({
  createClassLessonAction: m.createClassLessonAction,
  updateClassLessonAction: m.updateClassLessonAction,
}));
vi.mock("../../_actions/preview-actions", () => ({ refreshLessonPreviewAction: vi.fn() }));
// Monaco has no place in jsdom: a plain field stands in for the editor.
vi.mock("@cyberlearn/ui/mdx-editor", () => ({
  useLessonPreview: () => ({ refresh: vi.fn() }),
  MdxEditorPanel: ({ value, onChange }: MdxEditorPanelProps) => (
    <textarea
      aria-label="Contenu MDX"
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  ),
}));

const { LessonEditor } = await import("../lesson-editor");

/**
 * The teacher's editor keeps the console studio's habits: ⌘S saves a lesson
 * being reopened, leaving with something unsaved asks first, and a save the
 * server refused leaves what was typed where it was.
 */

const DRAFT = {
  title: "Les injections SQL",
  description: "Ce qu'est une injection, et comment s'en garder.",
  category: "CYBERSEC",
  difficulty: "BEGINNER",
  estimatedMinutes: 20,
  xpReward: 30,
  contentMdx: "## Introduction\n\nUne requête, des guillemets.",
};

function editor(mode: "create" | "edit"): void {
  render(
    mode === "edit" ? (
      <LessonEditor
        mode="edit"
        className="BTS SIO 1"
        lessonId="l1"
        lessonSlug="sql"
        draft={DRAFT}
      />
    ) : (
      <LessonEditor mode="create" className="BTS SIO 1" classId="c1" />
    ),
  );
}

function pressSave(): void {
  fireEvent.keyDown(window, { key: "s", ctrlKey: true });
}

function leave(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

function titleField(): HTMLInputElement {
  const field = screen.getByDisplayValue<HTMLInputElement>(DRAFT.title);
  return field;
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.updateClassLessonAction.mockResolvedValue({ ok: true });
  m.createClassLessonAction.mockResolvedValue({ ok: true, slug: "sql" });
});

describe("LessonEditor", () => {
  it("saves a reopened lesson on ⌘S / Ctrl+S", async () => {
    editor("edit");
    pressSave();
    await waitFor(() => {
      expect(m.updateClassLessonAction).toHaveBeenCalledOnce();
    });
    const form = m.updateClassLessonAction.mock.calls[0]?.[1];
    expect(form?.get("lessonId")).toBe("l1");
    expect(form?.get("title")).toBe(DRAFT.title);
  });

  it("publishes nothing for a class on a shortcut", async () => {
    editor("create");
    pressSave();
    await act(async () => {
      await Promise.resolve();
    });
    expect(m.createClassLessonAction).not.toHaveBeenCalled();
  });

  it("asks before leaving with something typed, and no more once it is saved", async () => {
    editor("edit");
    expect(leave()).toBe(false);
    fireEvent.change(titleField(), { target: { value: "Les injections SQL, en pratique" } });
    expect(leave()).toBe(true);

    pressSave();
    await waitFor(() => {
      expect(leave()).toBe(false);
    });
  });

  it("keeps what was typed when the save is refused", async () => {
    m.updateClassLessonAction.mockResolvedValue({ error: "Le titre est trop long." });
    editor("edit");
    const field = titleField();
    fireEvent.change(field, { target: { value: "Un titre retouché" } });

    pressSave();
    expect(await screen.findByText("Le titre est trop long.")).toBeTruthy();
    expect(field.value).toBe("Un titre retouché");
    // Still unsaved, so still guarded.
    expect(leave()).toBe(true);
  });
});
