// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WRAPPED_SAMPLE } from "@/test/fixtures/event-data";
import { WrappedShare } from "../WrappedClient";

const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
const createObjectURL = vi.fn(() => "blob:wrapped-test");
const revokeObjectURL = vi.fn();
const click = vi.fn<(filename: string) => void>();
beforeEach(() => {
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    click(this.download);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
});

describe("Wrapped image export", () => {
  it("waits for fonts before creating one image with the shared filename and size", async () => {
    let releaseFonts: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      releaseFonts = resolve;
    });
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
    ) {
      expect(this.width).toBe(1080);
      expect(this.height).toBe(1920);
      callback(new Blob(["test"], { type: "image/png" }));
    });
    render(<WrappedShare payload={WRAPPED_SAMPLE} handle="donnees-de-test" />);
    fireEvent.click(screen.getByRole("button", { name: "Télécharger l’image" }));
    expect(screen.getByRole("button", { name: "Génération…" }).hasAttribute("disabled")).toBe(true);
    expect(toBlob).not.toHaveBeenCalled();
    await act(async () => {
      if (!releaseFonts) throw new Error("Font resolver missing");
      releaseFonts();
      await ready;
    });
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Télécharger l’image" }).hasAttribute("disabled"),
    ).toBe(false);
    expect(click).toHaveBeenCalledWith("cyberlearn-wrapped-2026.png");
  });

  it("reports an image generation failure and allows another attempt", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(null);
    });
    render(<WrappedShare payload={WRAPPED_SAMPLE} handle="donnees-de-test" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Télécharger l’image" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("alert").textContent).toBe("L'image n'a pas pu être générée.");
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Télécharger l’image" }).hasAttribute("disabled"),
    ).toBe(false);
  });
});
