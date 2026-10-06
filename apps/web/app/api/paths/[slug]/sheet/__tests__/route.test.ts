import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RevisionSheet } from "@cyberlearn/lib/paths/sheet";

const m = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  loadSheet: vi.fn<(slug: string, viewerId: string, n: number) => Promise<RevisionSheet | null>>(),
  renderSheetPdf: vi.fn<(sheet: RevisionSheet) => Promise<Buffer>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser: m.getUser } }),
}));
vi.mock("@/lib/sheets/load", () => ({ loadSheet: m.loadSheet }));
vi.mock("@/lib/sheets/render", () => ({ renderSheetPdf: m.renderSheetPdf }));

const { GET } = await import("../route");

const SHEET: RevisionSheet = {
  pathTitle: "Linux",
  moduleNumber: 3,
  moduleTitle: "Chercher",
  title: "Module 03 · Chercher",
  sections: [{ lessonTitle: "grep", points: ["grep cherche."] }],
  pointCount: 1,
};

const call = (search: string, slug = "linux"): Promise<Response> =>
  GET(new Request(`https://cyberlearn.fr/api/paths/${slug}/sheet${search}`), {
    params: Promise.resolve({ slug }),
  });

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  m.renderSheetPdf.mockResolvedValue(Buffer.from("%PDF-1.4 test"));
});

describe("GET /api/paths/[slug]/sheet", () => {
  it("is not found for a visitor who is not signed in", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    expect((await call("?module=1")).status).toBe(404);
    expect(m.loadSheet).not.toHaveBeenCalled();
  });

  it("wants a module number", async () => {
    expect((await call("")).status).toBe(404);
    expect((await call("?module=abc")).status).toBe(404);
    expect(m.loadSheet).not.toHaveBeenCalled();
  });

  it("sends the PDF as a download named after the path and the module", async () => {
    m.loadSheet.mockResolvedValue(SHEET);
    const res = await call("?module=3");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="cyberlearn-linux-module-03.pdf"',
    );
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("%PDF-1.4 test");
    expect(m.loadSheet).toHaveBeenCalledWith("linux", "user-1", 3);
    expect(m.renderSheetPdf).toHaveBeenCalledWith(SHEET);
  });

  it("is not found for a path or a module the reader has not", async () => {
    m.loadSheet.mockResolvedValue(null);
    expect((await call("?module=7", "secret")).status).toBe(404);
    expect(m.renderSheetPdf).not.toHaveBeenCalled();
  });
});
