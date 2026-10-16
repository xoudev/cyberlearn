/**
 * GET /api/me/export: the day's export is charged for a download, not for an
 * attempt. A build that fails gives the budget back and says so in JSON.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@cyberlearn/lib/logger";

vi.stubEnv("IP_SALT", "export-route-test-salt-that-is-at-least-32-chars");

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  checkDataExport: vi.fn(),
  releaseDataExport: vi.fn(),
  buildExportPayload: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({ prisma: { auditLog: { create: m.auditCreate } } }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser: m.getUser } }),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkDataExport: m.checkDataExport,
  releaseDataExport: m.releaseDataExport,
}));
vi.mock("@/lib/rgpd/build-export", () => ({ buildExportPayload: m.buildExportPayload }));

const { GET } = await import("../route");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PASS = { success: true, limit: 1, remaining: 0, reset: 0, retryAfterSeconds: 0 };

function request(): Request {
  return new Request("http://localhost/api/me/export", {
    headers: { "x-forwarded-for": "203.0.113.4" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  m.checkDataExport.mockResolvedValue(PASS);
  m.releaseDataExport.mockResolvedValue(undefined);
  m.buildExportPayload.mockResolvedValue({ user: { id: USER_ID } });
  m.auditCreate.mockResolvedValue({});
});

describe("GET /api/me/export", () => {
  it("downloads the export and keeps the day's budget spent", async () => {
    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(m.releaseDataExport).not.toHaveBeenCalled();
    expect(m.auditCreate).toHaveBeenCalledOnce();
  });

  it("gives the budget back and answers 500 in JSON when the export fails to build", async () => {
    m.buildExportPayload.mockRejectedValueOnce(new Error("db timeout"));
    const logSpy = vi.spyOn(logger, "error").mockImplementation((): void => undefined);

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "export_failed" });
    expect(m.releaseDataExport).toHaveBeenCalledWith(USER_ID);
    expect(m.auditCreate).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("does not build anything once the day's export is used", async () => {
    m.checkDataExport.mockResolvedValueOnce({
      ...PASS,
      success: false,
      retryAfterSeconds: 3600,
    });

    const res = await GET(request());

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3600");
    expect(m.buildExportPayload).not.toHaveBeenCalled();
    expect(m.releaseDataExport).not.toHaveBeenCalled();
  });

  it("refuses a request without a session", async () => {
    m.getUser.mockResolvedValueOnce({ data: { user: null } });

    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(m.checkDataExport).not.toHaveBeenCalled();
  });
});
