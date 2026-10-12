// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Outside a lesson's route: no slug, so nothing is recorded.
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));
vi.mock("../../_actions/record-exercise", () => ({ recordExerciseAction: vi.fn() }));

const { LinuxTerminal } = await import("../linux-terminal");

/**
 * The machine's screen stays in its frame: xterm's fit measures the screen's
 * parent without that parent's padding, so the margin lives on a wrapper and
 * the parent clips. The colours xterm is handed are checked with the other
 * libraries' (library-colours.test.ts).
 */

afterEach(() => {
  cleanup();
});

describe("the machine's frame", () => {
  it("puts the margin on a wrapper, around a clipped parent with none", () => {
    render(<LinuxTerminal id="t" title="web01" files={{ "a.txt": "a\n" }} />);
    expect(screen.getByRole("button", { name: "Démarrer la machine" })).toBeTruthy();
    const frame = document.querySelector(".linux-terminal");
    const stage = frame?.children[1];
    const wrapper = stage?.children[0];
    const parent = wrapper?.children[0];
    expect(wrapper instanceof HTMLElement && wrapper.style.padding).toBe("12px 14px");
    expect(parent instanceof HTMLElement && parent.style.padding).toBe("");
    expect(parent instanceof HTMLElement && parent.style.overflow).toBe("hidden");
  });
});
