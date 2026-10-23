// @vitest-environment jsdom
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataSection } from "../DataSection";

/**
 * What the data section says the export holds. It promised "l'ensemble de tes
 * données" over a file that left out the forum, the friends, the classes and
 * the sanctions, and printed a count of models written by hand ("17") that
 * the file had long outgrown. It now names what the file holds and the
 * limits of the lists, and prints no count that can drift.
 */

vi.mock("../DeleteAccountSection", () => ({ DeleteAccountSection: () => null }));
vi.mock("../ExportDataButton", () => ({ ExportDataButton: () => null }));

afterEach(() => {
  cleanup();
});

function textOf(): string {
  const { container } = render(
    <DataSection data={{ pendingExpiresAt: null, certificateCount: 0 }} />,
  );
  return container.textContent;
}

describe("DataSection's export card", () => {
  it("names what the file holds, forum, friends, classes and sanctions included", () => {
    const text = textOf();

    for (const part of [
      "messages du forum",
      "tes amis",
      "tes classes",
      "tes exercices",
      "tes sanctions",
    ]) {
      expect(text, part).toContain(part);
    }
  });

  it("no longer claims every piece of data, nor prints a hand-written count of models", () => {
    const text = textOf();

    expect(text).not.toContain("l'ensemble de tes données");
    expect(text).not.toMatch(/\d+ modèles/);
    expect(text).not.toContain("Portée");
  });

  it("says a friend is a username and that the recent lists are cut", () => {
    const text = textOf();

    expect(text).toContain("pseudo seulement");
    expect(text).toContain("les plus récents sont inclus");
    // The limits are the file's to state (exportMetadata.limitations): a number
    // written here would drift from the constants the repositories cut at.
    expect(text).not.toMatch(/1.000/);
  });
});
