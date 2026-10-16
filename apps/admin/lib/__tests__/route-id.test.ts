import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));

const { isRouteId, routeIdOrNotFound } = await import("../route-id");

describe("isRouteId", () => {
  it("takes a uuid, in either case", () => {
    expect(isRouteId("3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b")).toBe(true);
    expect(isRouteId("3F2B8C1E-9A4D-4E6F-8B2A-1C3D5E7F9A0B")).toBe(true);
  });

  // The seed's fixed ids carry no RFC version: Postgres stores them, so the
  // console must open them.
  it("takes the seed's fixed ids", () => {
    expect(isRouteId("00000000-0000-0000-0000-000000000001")).toBe(true);
    expect(isRouteId("00000000-0000-0000-0002-000000000003")).toBe(true);
  });

  it("refuses what Postgres would refuse to cast", () => {
    expect(isRouteId("abc")).toBe(false);
    expect(isRouteId("")).toBe(false);
    // What the audit log shows of an id.
    expect(isRouteId("3f2b8c1e")).toBe(false);
    expect(isRouteId("3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0")).toBe(false);
    expect(isRouteId("3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0bb")).toBe(false);
    expect(isRouteId("zzzzzzzz-9a4d-4e6f-8b2a-1c3d5e7f9a0b")).toBe(false);
    expect(isRouteId(" 3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b")).toBe(false);
    expect(isRouteId("3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b' OR '1'='1")).toBe(false);
  });
});

describe("routeIdOrNotFound", () => {
  it("hands back an id that can be one", () => {
    expect(routeIdOrNotFound("00000000-0000-0000-0000-000000000001")).toBe(
      "00000000-0000-0000-0000-000000000001",
    );
  });

  it("answers anything else with the console's 404, not a query", () => {
    expect(() => routeIdOrNotFound("abc")).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});

/**
 * Every console page opened by id checks it before it reaches a query. Read
 * from the sources, like page-guard.test.ts: what is asserted is that the
 * check is there, and that the raw segment is never destructured past it.
 */
describe("console pages opened by id", () => {
  const ADMIN_ROUTES = join(__dirname, "..", "..", "app", "(admin)");

  function idPages(dir: string, insideId = false, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) idPages(full, insideId || entry === "[id]", out);
      else if (insideId && entry === "page.tsx") out.push(full);
    }
    return out;
  }

  const found = idPages(ADMIN_ROUTES);

  it("are found at all", () => {
    expect(found.length).toBeGreaterThanOrEqual(9);
  });

  it.each(found.map((f) => [relative(ADMIN_ROUTES, f).split(sep).join("/"), f]))(
    "%s checks its id before querying",
    (_name, file) => {
      const source = readFileSync(file, "utf8");
      expect(source).toContain('import { routeIdOrNotFound } from "@/lib/route-id";');
      expect(source).toMatch(/const id = routeIdOrNotFound\(\(await params\)\.id\);/);
      expect(source).not.toMatch(/const \{ id \} = await params;/);
    },
  );
});
