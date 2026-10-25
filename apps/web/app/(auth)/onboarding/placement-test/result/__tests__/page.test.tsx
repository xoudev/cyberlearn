import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PLACEMENT_COPY } from "@cyberlearn/lib/onboarding/placement";

vi.mock("../../../_components/onboarding-shell", () => ({
  PlacementShell: ({ children }: { children: React.ReactNode }) => children,
}));
const { default: ResultPage } = await import("../page");
const copy = (value: string): string => renderToStaticMarkup(<>{value}</>);

async function render(query: Record<string, string | string[] | undefined>): Promise<string> {
  return renderToStaticMarkup(await ResultPage({ searchParams: Promise.resolve(query) }));
}

describe("placement result display", () => {
  it("keeps each domain score, its level and the mastery note", async () => {
    const html = await render({ dev: "80", cybersec: "45", network: "25", path: "python-bases" });
    expect(html).toContain("80%");
    expect(html).toContain("45%");
    expect(html).toContain("25%");
    expect(html).toContain("Avancé");
    expect(html).toContain("Intermédiaire");
    expect(html).toContain("Débutant");
    expect(html).toContain(PLACEMENT_COPY.waived);
    expect(html).toContain('href="/paths/python-bases"');
  });
  it("does not render non-finite or repeated query scores into a progress bar", async () => {
    const html = await render({ dev: "bad", cybersec: "Infinity", network: ["80", "40"] });
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
    expect(html.match(/aria-valuenow="0"/g)).toHaveLength(3);
    expect(html).not.toContain(PLACEMENT_COPY.waived);
    expect(html).toContain(copy(PLACEMENT_COPY.fromScratch));
  });
  it("clamps finite percentages and rejects a path outside the slug format", async () => {
    const html = await render({ dev: "150", cybersec: "-10", network: "40", path: "../settings" });
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('aria-valuenow="40"');
    expect(html).not.toContain('href="/paths/');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/lessons"');
  });
  it("explains intermediate foundations without suggesting the reader starts from zero", async () => {
    const html = await render({ dev: "45", cybersec: "50", network: "40" });
    expect(html).toContain(copy(PLACEMENT_COPY.foundation));
    expect(html).not.toContain(copy(PLACEMENT_COPY.fromScratch));
    expect(html).not.toContain(PLACEMENT_COPY.waived);
  });
});
