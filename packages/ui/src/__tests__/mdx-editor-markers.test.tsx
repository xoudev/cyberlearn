import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MdxPreviewResult } from "../components/mdx-preview-frame";

/**
 * The problems the save or the preview found, in the editor: Monaco markers
 * under the text, a list above it, and a way from the list to the line, from
 * the block view too. Monaco itself does not run in a unit test, so the panel
 * is given a stand-in with the members it calls.
 */

const fake = vi.hoisted(() => ({
  lines: [] as string[],
  setModelMarkers: vi.fn(),
  revealLineInCenter: vi.fn(),
  setPosition: vi.fn(),
}));

vi.mock("next/dynamic", async () => {
  const { createElement, useEffect } = await import("react");
  function FakeMonaco(props: {
    value: string;
    onMount: (editor: unknown, monaco: unknown) => void;
  }): React.ReactElement {
    fake.lines = props.value.split("\n");
    useEffect(() => {
      const model = {
        getLineCount: () => fake.lines.length,
        getLineContent: (line: number) => fake.lines[line - 1] ?? "",
      };
      props.onMount(
        {
          getModel: () => model,
          revealLineInCenter: fake.revealLineInCenter,
          setPosition: fake.setPosition,
          focus: () => undefined,
        },
        { editor: { setModelMarkers: fake.setModelMarkers }, MarkerSeverity: { Error: 8 } },
      );
      // Mounted once, as Monaco is.
    }, []);
    return createElement("div", { "data-testid": "monaco" });
  }
  return { default: () => FakeMonaco };
});

import { MdxEditorPanel } from "../components/mdx-editor-panel";

beforeEach(() => {
  fake.setModelMarkers.mockClear();
  fake.revealLineInCenter.mockClear();
  fake.setPosition.mockClear();
});

/** MDX that does not cut into blocks: the code view opens. */
const BROKEN = "## S\n\n<Quiz correct={True}\n";
/** A lesson that does: the block view opens. */
const LESSON = "## S\n\nUn paragraphe.\n\nUn autre.\n";

const lastMarkers = (): unknown => fake.setModelMarkers.mock.calls.at(-1);

describe("the problems in the lesson editor", () => {
  it("marks what the save refused under the text it points at", () => {
    render(
      <MdxEditorPanel
        value={BROKEN}
        onChange={() => undefined}
        problems={[{ line: 3, column: 16, message: "« True » n'existe pas ici." }]}
      />,
    );
    expect(screen.getByTestId("monaco")).toBeInTheDocument();
    expect(lastMarkers()).toEqual([
      expect.anything(),
      "lesson-check",
      [
        {
          startLineNumber: 3,
          startColumn: 16,
          endLineNumber: 3,
          endColumn: 21,
          message: "« True » n'existe pas ici.",
          severity: 8,
        },
      ],
    ]);
    expect(screen.getByRole("region", { name: "Problèmes du contenu" })).toHaveTextContent(
      "À CORRIGER · 1",
    );
  });

  it("opens the code view at the line of a problem picked in the block view", () => {
    render(
      <MdxEditorPanel
        value={LESSON}
        onChange={() => undefined}
        problems={[{ line: 5, column: 4, message: "Tiret cadratin." }]}
      />,
    );
    expect(screen.queryByTestId("monaco")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "L5:4" }));
    expect(screen.getByTestId("monaco")).toBeInTheDocument();
    expect(fake.revealLineInCenter).toHaveBeenCalledWith(5);
    expect(fake.setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 4 });
  });

  it("clears the markers once nothing is refused any more", () => {
    const { rerender } = render(
      <MdxEditorPanel
        value={BROKEN}
        onChange={() => undefined}
        problems={[{ line: 1, column: 1, message: "x" }]}
      />,
    );
    rerender(<MdxEditorPanel value={BROKEN} onChange={() => undefined} problems={[]} />);
    expect(lastMarkers()).toEqual([expect.anything(), "lesson-check", []]);
    expect(screen.queryByRole("region", { name: "Problèmes du contenu" })).toBeNull();
  });

  it("takes the problems of a later draft from the site's preview", async () => {
    const refresh = vi.fn(
      (): Promise<MdxPreviewResult> =>
        Promise.resolve({
          ok: true,
          url: "/preview/t",
          problems: [{ line: 2, column: 1, message: "Une note de rédaction." }],
        }),
    );
    render(
      <MdxEditorPanel
        value={BROKEN}
        onChange={() => undefined}
        preview={{ refresh }}
        problems={[{ line: 3, column: 16, message: "ancien" }]}
      />,
    );
    await waitFor(() => {
      expect(lastMarkers()).toEqual([
        expect.anything(),
        "lesson-check",
        [expect.objectContaining({ startLineNumber: 2, message: "Une note de rédaction." })],
      ]);
    });
  });
});
