import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The preview page: the draft behind the token, every section on the page,
 * drawn with what the lesson page draws with. The section renderer is
 * stubbed: what it does with a section is lesson-section.test.ts's business;
 * what this page hands it is this file's.
 */

const findLive = vi.fn();
vi.mock("@cyberlearn/db", () => ({ lessonPreviewRepository: { findLive } }));

const COMPONENTS = { Callout: () => null };
vi.mock("../../../(app)/lessons/[slug]/_components/lesson-mdx-components", () => ({
  LESSON_MDX_COMPONENTS: COMPONENTS,
}));

const sections = vi.fn();
vi.mock("../../../(app)/lessons/[slug]/_components/lesson-section", () => ({
  LessonSection: (props: {
    source: string;
    components: unknown;
    lessonSlug: string;
    index: number;
  }) => {
    sections(props);
    return React.createElement("x-section", { "data-index": props.index }, props.source);
  },
}));

const { default: PreviewPage } = await import("../page");

const TOKEN = "c".repeat(43);

async function render(token: string): Promise<string> {
  return renderToStaticMarkup(await PreviewPage({ params: Promise.resolve({ token }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the preview page", () => {
  it("draws every section of the live draft, with the lesson components", async () => {
    findLive.mockResolvedValue({
      contentMdx: "Intro.\n\n## un\n\nPremière.\n\n## deux\n\nSeconde.",
    });
    const html = await render(TOKEN);

    expect(findLive).toHaveBeenCalledWith(TOKEN, expect.any(Date));
    expect(html).toContain("lesson-review-banner");
    // No stepper: the sections are all there, in order, not one at a time;
    // the text before the first heading goes with the first section.
    expect(html).toMatch(/<x-section data-index="0">Intro\.\s+## un\s+Première\.\s*<\/x-section>/);
    expect(html).toMatch(/<x-section data-index="1">## deux\s+Seconde\.\s*<\/x-section>/);
    for (const call of sections.mock.calls as [{ components: unknown; lessonSlug: string }][]) {
      expect(call[0].components).toBe(COMPONENTS);
      expect(call[0].lessonSlug).toBe("apercu");
    }
  });

  it("says the preview has expired when the token no longer opens anything", async () => {
    findLive.mockResolvedValue(null);
    const html = await render(TOKEN);
    expect(html).toContain("Aperçu expiré");
    expect(html).not.toContain("x-section");
  });
});
