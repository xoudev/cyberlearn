// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type * as MermaidModule from "mermaid";
import type { MermaidConfig } from "mermaid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as DiagramModule from "../diagram";

/**
 * A lesson diagram, from the colours mermaid is given to what the reader sees
 * when it still cannot draw.
 *
 * In October 2026 the theme's colours became `var(--color-*)`. Mermaid derives
 * shades from them with khroma, which only reads real colours, so initialize
 * threw, the failed load stayed cached, and every diagram on the site showed
 * its source. No check looked at the theme, and the page reported nothing.
 */

const fake = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

// The component loads mermaid with a dynamic import: this double stands in for
// it, so a test decides what initialize and render do.
vi.mock("mermaid", () => ({ default: fake }));

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => {
    captureException(...args);
  },
}));

// cyber-blueteam/13-audit-configuration-durcissement.mdx, the lesson the
// broken diagrams were first seen on.
const SOURCE = `flowchart TD
  A["Périmètre et autorisation"] --> B["Inventaire : ce qui existe"]
  B --> C["Lecture : configurations, droits, comptes"]
  H -->|"écart restant"| B`;

const HEX = /^#[0-9a-f]{6}$/i;

function variablesOf(config: MermaidConfig): Record<string, unknown> {
  // SAFETY: mermaid types themeVariables as any; mermaidConfig builds it as a
  // plain object of strings.
  return config.themeVariables as Record<string, unknown>;
}

/** The component module afresh: mermaid's load is cached at module level. */
async function freshDiagram(): Promise<typeof DiagramModule> {
  vi.resetModules();
  return import("../diagram");
}

beforeEach(() => {
  fake.initialize.mockReset();
  fake.render.mockReset();
  captureException.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("the theme mermaid is given", () => {
  it("holds every colour as hex, which is all mermaid can read", async () => {
    const { MERMAID_THEME } = await freshDiagram();
    const colours = Object.entries(MERMAID_THEME.themeVariables).filter(
      ([key]) => !key.startsWith("font"),
    );
    expect(colours.length).toBeGreaterThan(20);
    for (const [key, value] of colours) {
      expect(value, key).toMatch(HEX);
    }
  });

  it("takes the learner's accent as hex, and the default when it cannot read one", async () => {
    const { mermaidConfig } = await freshDiagram();
    const pink = variablesOf(mermaidConfig("#ff4dd2"));
    expect(pink.activationBorderColor).toBe("#ff4dd2");
    expect(pink.sequenceNumberColor).toBe("#ff4dd2");
    expect(pink.activationBkgColor).toEqual(expect.stringMatching(HEX));

    const short = variablesOf(mermaidConfig("#0f0"));
    expect(short.activationBorderColor).toBe("#00ff00");

    for (const unreadable of ["var(--cosmetic-accent)", "", "rgb(1, 2, 3)", "turquoise"]) {
      const theme = variablesOf(mermaidConfig(unreadable));
      expect(theme.activationBorderColor).toBe("#FF6B2B");
    }
  });

  it("is accepted by the real mermaid, where a CSS variable is not", async () => {
    const { MERMAID_THEME, mermaidConfig } = await freshDiagram();
    const { default: mermaid } = await vi.importActual<typeof MermaidModule>("mermaid");
    expect(() => {
      mermaid.initialize(MERMAID_THEME);
    }).not.toThrow();
    expect(() => {
      mermaid.initialize(mermaidConfig("#ff4dd2"));
    }).not.toThrow();
    // What broke every diagram: the same theme with one colour as a variable.
    expect(() => {
      mermaid.initialize({
        ...MERMAID_THEME,
        themeVariables: {
          ...MERMAID_THEME.themeVariables,
          primaryColor: "var(--color-border-subtle)",
        },
      });
    }).toThrow(/Unsupported color/);
    // Loading the real mermaid through vitest's transform takes several seconds.
  }, 60_000);
});

describe("a diagram that cannot draw", () => {
  it("is told in words, with a notice, the caption and its source to unfold", async () => {
    const { Diagram } = await freshDiagram();
    fake.render.mockRejectedValue(new Error("Parse error on line 2"));

    render(<Diagram caption="La démarche d'audit">{SOURCE}</Diagram>);

    expect(await screen.findByText("Schéma indisponible")).toBeTruthy();
    expect(screen.getByText("Périmètre et autorisation → Inventaire : ce qui existe")).toBeTruthy();
    expect(screen.getByText("H (écart restant) → Inventaire : ce qui existe")).toBeTruthy();
    expect(screen.getByText("La démarche d'audit")).toBeTruthy();

    const details = document.querySelector("details");
    expect(details?.querySelector("summary")?.textContent).toBe("Source du schéma");
    expect(details?.querySelector("pre")?.textContent).toBe(SOURCE);
  });

  it("reaches Sentry, grouped by what went wrong", async () => {
    const { Diagram } = await freshDiagram();
    const error = new Error("Parse error on line 2");
    fake.render.mockRejectedValue(error);

    render(<Diagram>{SOURCE}</Diagram>);

    await waitFor(() => {
      expect(captureException).toHaveBeenCalledTimes(1);
    });
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { area: "lesson.diagram" },
      extra: { source: SOURCE },
      fingerprint: ["lesson-diagram", "Parse error on line 2"],
    });
  });
});

describe("a drawn diagram", () => {
  it("is never enlarged past its size, nor shrunk under labels of about 11px", async () => {
    const { Diagram, MIN_LEGIBLE_SCALE } = await freshDiagram();
    fake.render.mockResolvedValue({ svg: '<svg viewBox="0 0 1000 400"></svg>' });

    render(<Diagram>{SOURCE}</Diagram>);

    await waitFor(() => {
      expect(document.querySelector("figure svg")).not.toBeNull();
    });
    const svg = document.querySelector<SVGElement>("figure svg");
    // Mermaid lays labels out at 13px: the floor keeps them at 11px or more,
    // and the figure scrolls sideways under it.
    expect(13 * MIN_LEGIBLE_SCALE).toBeGreaterThanOrEqual(11);
    expect(svg?.style.maxWidth).toBe("1000px");
    expect(svg?.style.minWidth).toBe("850px");
  });
});

describe("mermaid failing to start", () => {
  it("is not kept: the next diagram asks again, and draws", async () => {
    const { Diagram } = await freshDiagram();
    fake.initialize.mockImplementationOnce(() => {
      throw new Error('Unsupported color format: "var(--color-bg-elevated)"');
    });
    fake.render.mockResolvedValue({ svg: '<svg viewBox="0 0 300 120"></svg>' });

    const first = render(<Diagram>{SOURCE}</Diagram>);
    expect(await screen.findByText("Schéma indisponible")).toBeTruthy();
    expect(fake.render).not.toHaveBeenCalled();
    first.unmount();

    render(<Diagram>{SOURCE}</Diagram>);
    await waitFor(() => {
      expect(fake.render).toHaveBeenCalledTimes(1);
    });
    expect(fake.initialize).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(document.querySelector("figure svg")).not.toBeNull();
    });
    expect(screen.queryByText("Schéma indisponible")).toBeNull();
  });

  it("is initialized once for every diagram of a page", async () => {
    const { Diagram } = await freshDiagram();
    fake.render.mockResolvedValue({ svg: '<svg viewBox="0 0 300 120"></svg>' });

    render(
      <>
        <Diagram>{SOURCE}</Diagram>
        <Diagram>{SOURCE}</Diagram>
      </>,
    );

    await waitFor(() => {
      expect(fake.render).toHaveBeenCalledTimes(2);
    });
    expect(fake.initialize).toHaveBeenCalledTimes(1);
  });
});
