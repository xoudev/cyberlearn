// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildStorySlides } from "@cyberlearn/lib/gamification/wrapped-story";
import { WRAPPED_SAMPLE } from "@/test/fixtures/event-data";
import { WrappedStory } from "../story/WrappedStory";

let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => {
      callback(performance.now());
    }, 16),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    window.clearTimeout(id);
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const count = buildStorySlides(WRAPPED_SAMPLE).length;
function story(onClose = vi.fn()): void {
  render(
    <WrappedStory
      payload={WRAPPED_SAMPLE}
      share={<button type="button">Télécharger l’image de test</button>}
      onClose={onClose}
    />,
  );
}

describe("Wrapped story controls", () => {
  it("advances after its reading time and keeps manual navigation", async () => {
    story();
    expect(screen.getByText(`1 / ${String(count)}`)).toBeDefined();
    await act(() => vi.advanceTimersByTimeAsync(5100));
    expect(screen.getByText(`2 / ${String(count)}`)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Suivant/ }));
    expect(screen.getByText(`3 / ${String(count)}`)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Précédent/ }));
    expect(screen.getByText(`2 / ${String(count)}`)).toBeDefined();
  });

  it("does not advance automatically with reduced motion", async () => {
    reduced = true;
    story();
    await act(() => vi.advanceTimersByTimeAsync(12000));
    expect(screen.getByText(`1 / ${String(count)}`)).toBeDefined();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText(`2 / ${String(count)}`)).toBeDefined();
  });

  it("pauses from the story surface without consuming Space on a focused button", async () => {
    story();
    fireEvent.keyDown(document, { key: " " });
    expect(screen.getByRole("button", { name: "Reprendre" })).toBeDefined();
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(screen.getByText(`1 / ${String(count)}`)).toBeDefined();
    const close = screen.getByRole("button", { name: "Fermer" });
    expect(fireEvent.keyDown(close, { key: " " })).toBe(true);
    expect(screen.getByRole("button", { name: "Reprendre" })).toBeDefined();
  });

  it("keeps the share card on screen and closes through the dialog", async () => {
    const onClose = vi.fn();
    story(onClose);
    for (let index = 1; index < count; index++)
      fireEvent.click(screen.getByRole("button", { name: /Suivant/ }));
    expect(screen.getByRole("button", { name: "Télécharger l’image de test" })).toBeDefined();
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(screen.getByText(`${String(count)} / ${String(count)}`)).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
