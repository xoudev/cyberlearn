import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampSplit,
  MOBILE_PREVIEW_WIDTH,
  opensSplit,
  readStoredDevice,
  readStoredSplit,
  SPLIT_DEFAULT,
  SPLIT_MAX,
  SPLIT_MIN,
  SPLIT_MIN_PANEL_WIDTH,
  SPLIT_STEP,
  splitAt,
  storeSplit,
} from "../components/mdx-editor-layout";
import type { MdxPreviewResult } from "../components/mdx-preview-frame";

/**
 * The editor's width against the preview's, the preview framed as a phone,
 * and ⌘S from the code view. Monaco does not run in a unit test: the panel is
 * given a stand-in with the members it calls.
 */

const fake = vi.hoisted(() => ({
  addCommand: vi.fn(),
}));

vi.mock("next/dynamic", async () => {
  const { createElement, useEffect } = await import("react");
  function FakeMonaco(props: {
    value: string;
    onMount: (editor: unknown, monaco: unknown) => void;
  }): React.ReactElement {
    useEffect(() => {
      const model = { getLineCount: () => 1, getLineContent: () => "" };
      props.onMount(
        { getModel: () => model, addCommand: fake.addCommand },
        {
          editor: { setModelMarkers: () => undefined },
          MarkerSeverity: { Error: 8 },
          KeyMod: { CtrlCmd: 2048 },
          KeyCode: { KeyS: 49 },
        },
      );
    }, []);
    return createElement("div", { "data-testid": "monaco" });
  }
  return { default: () => FakeMonaco };
});

import { MdxEditorPanel } from "../components/mdx-editor-panel";
import { MdxPreviewFrame } from "../components/mdx-preview-frame";

/** MDX that does not cut into blocks: the code view, and so Monaco, opens. */
const CODE = "## S\n\n<Quiz correct={True}\n";

beforeEach(() => {
  window.localStorage.clear();
  fake.addCommand.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the editor's share of the width", () => {
  it("stays between its bounds, whatever it is given", () => {
    expect(clampSplit(10)).toBe(SPLIT_MIN);
    expect(clampSplit(99)).toBe(SPLIT_MAX);
    expect(clampSplit(Number.NaN)).toBe(SPLIT_DEFAULT);
    expect(clampSplit(42.04)).toBe(42);
  });

  it("follows the pointer across the panel", () => {
    expect(splitAt(600, 100, 1000)).toBe(50);
    expect(splitAt(0, 100, 1000)).toBe(SPLIT_MIN);
    expect(splitAt(600, 100, 0)).toBe(SPLIT_DEFAULT);
  });

  it("is remembered by the browser, and forgotten without harm when storage refuses", () => {
    storeSplit(63);
    expect(readStoredSplit()).toBe(63);
    window.localStorage.setItem("cl-mdx-editor-split", "large");
    expect(readStoredSplit()).toBeNull();

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => {
      storeSplit(40);
    }).not.toThrow();
    expect(readStoredSplit()).toBeNull();
    expect(readStoredDevice()).toBeNull();
  });

  it("moves with the arrow keys from the separator, and is kept", () => {
    render(<MdxEditorPanel value={CODE} onChange={() => undefined} />);
    const separator = screen.getByRole("separator", {
      name: "Largeur de l'éditeur et de l'aperçu",
    });
    expect(separator).toHaveAttribute("aria-valuenow", String(SPLIT_DEFAULT));

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator).toHaveAttribute("aria-valuenow", String(SPLIT_DEFAULT + SPLIT_STEP));
    expect(readStoredSplit()).toBe(SPLIT_DEFAULT + SPLIT_STEP);

    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator).toHaveAttribute("aria-valuenow", String(SPLIT_MIN));
    fireEvent.doubleClick(separator);
    expect(separator).toHaveAttribute("aria-valuenow", String(SPLIT_DEFAULT));
  });

  it("opens where this browser left it", () => {
    storeSplit(70);
    render(<MdxEditorPanel value={CODE} onChange={() => undefined} />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "70");
  });
});

/** Gives every element the width a browser would have measured. */
function measuredAt(width: number): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width,
    height: 400,
    top: 0,
    left: 0,
    right: width,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe("a panel too narrow for two halves", () => {
  it("keeps the preview beside the editor from 520px up, and when nothing was measured", () => {
    expect(opensSplit(SPLIT_MIN_PANEL_WIDTH)).toBe(true);
    expect(opensSplit(1200)).toBe(true);
    expect(opensSplit(0)).toBe(true);
    expect(opensSplit(Number.NaN)).toBe(true);
  });

  it("opens the editor alone under 520px: a phone, a tablet held upright", () => {
    expect(opensSplit(SPLIT_MIN_PANEL_WIDTH - 1)).toBe(false);
    expect(opensSplit(343)).toBe(false);
    expect(opensSplit(472)).toBe(false);
  });

  it("keeps both halves in the console's studio on a laptop, where the panel is 596 to 682px", () => {
    expect(opensSplit(596)).toBe(true);
    expect(opensSplit(682)).toBe(true);
  });

  it("opens a phone-wide panel on the editor alone, the split button bringing the preview back", () => {
    measuredAt(343);
    render(<MdxEditorPanel value={CODE} onChange={() => undefined} />);
    expect(screen.queryByRole("separator")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "SPLIT" }));
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", String(SPLIT_DEFAULT));
  });

  it("opens a wide panel as it always did, both halves", () => {
    measuredAt(1100);
    render(<MdxEditorPanel value={CODE} onChange={() => undefined} />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("opens a laptop-wide panel (about 600px beside the studio's rail) on both halves", () => {
    measuredAt(600);
    render(<MdxEditorPanel value={CODE} onChange={() => undefined} />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

describe("⌘S from the code view", () => {
  it("hands Monaco a command that saves", () => {
    const onSave = vi.fn();
    render(<MdxEditorPanel value={CODE} onChange={() => undefined} onSave={onSave} />);
    expect(fake.addCommand).toHaveBeenCalledOnce();
    const [keys, run] = fake.addCommand.mock.calls[0] as [number, () => void];
    expect(keys).toBe(2048 | 49);
    run();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("asks Monaco for nothing without a save to call", () => {
    render(<MdxEditorPanel value={CODE} onChange={() => undefined} />);
    expect(fake.addCommand).not.toHaveBeenCalled();
  });
});

describe("the site's preview, framed as a phone", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("frames the page at a phone's width on demand, and keeps the choice", async () => {
    const refresh = vi.fn(
      (): Promise<MdxPreviewResult> => Promise.resolve({ ok: true, url: "/preview/t" }),
    );
    render(<MdxPreviewFrame value="# a" preview={{ refresh }} onQuick={() => undefined} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const frame = screen.getByTitle("Aperçu de la leçon, rendu par le site");
    expect(frame.style.width).toBe("100%");
    expect(screen.getByRole("button", { name: "BUREAU" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "MOBILE" }));
    expect(frame.style.width).toBe(`min(${String(MOBILE_PREVIEW_WIDTH)}px, 100%)`);
    expect(screen.getByRole("button", { name: "MOBILE" })).toHaveAttribute("aria-pressed", "true");
    expect(readStoredDevice()).toBe("mobile");
  });
});
