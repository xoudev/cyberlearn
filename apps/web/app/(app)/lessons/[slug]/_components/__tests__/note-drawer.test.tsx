// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia, type MatchMediaStub } from "@/test/match-media";
import { NAVBAR_HEIGHT } from "@/lib/chrome";

/**
 * The note on a lesson, in a drawer opened from the lesson's toolbar: over the
 * page on a laptop or a phone, docked beside it on a wide screen, so the
 * reader can read and write at once.
 */

const saveNoteAction = vi.hoisted(() =>
  vi.fn<(input: { lessonId: string; content: string }) => Promise<unknown>>(),
);
vi.mock("@/app/(app)/notes/_actions/note-actions", () => ({ saveNoteAction }));

const { NoteDrawer, NOTES_DOCKED_QUERY, NOTE_DRAWER_WIDTH } = await import("../note-drawer");

let media: MatchMediaStub;

function Notes({ initialOpen = true }: { initialOpen?: boolean }): React.ReactElement {
  const [open, setOpen] = React.useState(initialOpen);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Ouvrir
      </button>
      <NoteDrawer
        lessonId="lesson-1"
        lessonTitle="Les ports"
        initialContent="Début"
        initialWordCount={1}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

function wide(query: string): boolean {
  return query === NOTES_DOCKED_QUERY;
}

function drawer(): HTMLElement {
  return screen.getByRole("dialog", { name: "Mes notes" });
}

function editor(): HTMLTextAreaElement {
  return within(drawer()).getByLabelText<HTMLTextAreaElement>("Note de la leçon");
}

beforeEach(() => {
  saveNoteAction.mockReset();
  media = stubMatchMedia(() => false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the note drawer", () => {
  it("draws nothing while closed", () => {
    render(<Notes initialOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says which lesson the note belongs to", () => {
    render(<Notes />);
    expect(within(drawer()).getByText("Les ports")).toBeTruthy();
    expect(editor().value).toBe("Début");
  });

  it("saves a moment after the typing stops, and counts the words saved", async () => {
    vi.useFakeTimers();
    saveNoteAction.mockResolvedValue({ ok: true, wordCount: 3 });
    render(<Notes />);
    fireEvent.change(editor(), { target: { value: "Début de note" } });
    expect(within(drawer()).getByText("Enregistrement…")).toBeTruthy();
    expect(saveNoteAction).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(saveNoteAction).toHaveBeenCalledWith({ lessonId: "lesson-1", content: "Début de note" });
    expect(within(drawer()).getByText("Sauvegardé auto")).toBeTruthy();
    expect(within(drawer()).getByText("3 mots · MD")).toBeTruthy();
  });

  it("keeps the note it was typing when closed and opened again", () => {
    render(<Notes />);
    fireEvent.change(editor(), { target: { value: "Encore là" } });
    fireEvent.click(within(drawer()).getByRole("button", { name: "Fermer les notes" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(editor().value).toBe("Encore là");
  });

  it("wraps the selection in bold", () => {
    render(<Notes />);
    const ta = editor();
    ta.setSelectionRange(0, 5);
    fireEvent.click(within(drawer()).getByRole("button", { name: "Gras" }));
    expect(editor().value).toBe("**Début**");
  });

  it("widens and narrows", () => {
    render(<Notes />);
    const toggle = within(drawer()).getByRole("button", { name: "Agrandir" });
    fireEvent.click(toggle);
    expect(drawer().querySelector(".lesson-notes--wide")).toBeTruthy();
    expect(within(drawer()).getByRole("button", { name: "Réduire" })).toBeTruthy();
  });
});

describe("over the page or beside it", () => {
  it("covers the page below the docking width", () => {
    render(<Notes />);
    expect(document.querySelector(".side-drawer__backdrop")).toBeTruthy();
    expect(document.querySelector(".side-drawer--docked")).toBeNull();
  });

  it("docks beside the page on a wide screen, the lesson left in use", () => {
    media.set(wide);
    render(<Notes />);
    const panel = drawer();
    expect(panel.classList.contains("side-drawer--docked")).toBe(true);
    expect(panel.classList.contains("lesson-notes")).toBe(true);
    expect(document.querySelector(".side-drawer__backdrop")).toBeNull();
    expect(panel.style.width).toBe(`min(${String(NOTE_DRAWER_WIDTH.narrow)}px, 100%)`);
  });

  it("stays narrower docked than over the page once widened", () => {
    media.set(wide);
    render(<Notes />);
    fireEvent.click(within(drawer()).getByRole("button", { name: "Agrandir" }));
    expect(drawer().style.width).toBe(`min(${String(NOTE_DRAWER_WIDTH.wideDocked)}px, 100%)`);
  });

  it("follows the window across the docking width, the note kept", () => {
    render(<Notes />);
    fireEvent.change(editor(), { target: { value: "Gardée" } });
    act(() => {
      media.set(wide);
    });
    expect(drawer().classList.contains("side-drawer--docked")).toBe(true);
    expect(editor().value).toBe("Gardée");
  });

  it("closes on Escape from inside, docked", () => {
    media.set(wide);
    render(<Notes />);
    fireEvent.keyDown(editor(), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is given its room by the page: globals.css carries the docked widths", () => {
    // CSS cannot import the numbers, so the stylesheet carries a copy of them.
    const css = readFileSync(path.resolve(__dirname, "../../../../../globals.css"), "utf8");
    expect(css).toContain(`padding-right: ${String(NOTE_DRAWER_WIDTH.narrow)}px;`);
    expect(css).toContain(`padding-right: ${String(NOTE_DRAWER_WIDTH.wideDocked)}px;`);
    expect(css).toMatch(
      new RegExp(`\\.side-drawer--docked\\.lesson-notes \\{\\s*top: ${String(NAVBAR_HEIGHT)}px;`),
    );
  });
});
