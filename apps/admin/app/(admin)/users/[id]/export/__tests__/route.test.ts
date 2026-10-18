import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  buildExportPayload: vi.fn(),
  record: vi.fn(),
  checkUserExportRateLimit: vi.fn<(adminId: string) => Promise<boolean>>(),
  learnerSiteUrl: vi.fn<() => string>(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  buildExportPayload: m.buildExportPayload,
  auditLogRepository: { record: m.record },
}));
vi.mock("@/lib/rate-limit", () => ({ checkUserExportRateLimit: m.checkUserExportRateLimit }));
vi.mock("@/lib/learner-url", () => ({ learnerSiteUrl: m.learnerSiteUrl }));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.loggerError },
  errorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error)),
}));

const { GET } = await import("../route");

/**
 * An account's GDPR export from its page in the console: who may download
 * it, what is checked first, and that no file leaves without its audit entry.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

const PAYLOAD = {
  exportMetadata: { exportedAt: "2026-10-18T12:00:00.000Z", version: "1.0" },
  profile: { email: "lea@exemple.fr", username: "lea" },
  lessonsProgress: [],
};

function call(id: string = USER): Promise<Response> {
  return GET(new Request(`https://admin.cyberlearn.fr/users/${id}/export`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN, email: "admin@x.fr", role: "ADMIN" });
  m.checkUserExportRateLimit.mockResolvedValue(true);
  m.learnerSiteUrl.mockReturnValue("https://cyberlearn.fr");
  m.buildExportPayload.mockResolvedValue(PAYLOAD);
  m.record.mockResolvedValue(undefined);
});

describe("GET /users/[id]/export", () => {
  it("checks the caller is an administrator before reading anything", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(call()).rejects.toThrow("NEXT_REDIRECT");
    expect(m.checkUserExportRateLimit).not.toHaveBeenCalled();
    expect(m.buildExportPayload).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("downloads the account's export, as the site builds it, and records it", async () => {
    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toMatch(
      new RegExp(
        `^attachment; filename="cyberlearn-export-${USER}-\\d{4}-\\d{2}-\\d{2}\\.json"$`,
        "u",
      ),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    // The learner's file, written the same way: two spaces, nothing added.
    expect(await response.text()).toBe(JSON.stringify(PAYLOAD, null, 2));

    expect(m.buildExportPayload).toHaveBeenCalledWith(USER, { siteUrl: "https://cyberlearn.fr" });
    expect(m.record).toHaveBeenCalledWith({
      actorId: ADMIN,
      action: AUDIT_ACTION.user.dataExported,
      targetType: "User",
      targetId: USER,
    });
  });

  it("names the export in the catalogue of the console's audit actions", () => {
    expect(AUDIT_ACTION.user.dataExported).toBe("admin.user.data.exported");
  });

  it.each([["not-a-uuid"], ["2b3c4d5e"], [`${USER}x`]])(
    "answers 404 to %s without building anything",
    async (id) => {
      const response = await call(id);

      expect(response.status).toBe(404);
      expect(m.checkUserExportRateLimit).not.toHaveBeenCalled();
      expect(m.buildExportPayload).not.toHaveBeenCalled();
      expect(m.record).not.toHaveBeenCalled();
    },
  );

  it("refuses past this administrator's cap, before building anything", async () => {
    m.checkUserExportRateLimit.mockResolvedValue(false);

    const response = await call();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(await response.text()).toContain("Trop d'exports");
    expect(m.checkUserExportRateLimit).toHaveBeenCalledWith(ADMIN);
    expect(m.buildExportPayload).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("answers 404 for an account that is not there, and records nothing", async () => {
    m.buildExportPayload.mockResolvedValue({ ...PAYLOAD, profile: null });

    const response = await call();

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("sends no file when its audit entry cannot be written", async () => {
    m.record.mockRejectedValue(new Error("db unavailable"));

    const response = await call();

    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(await response.text()).not.toContain("lea@exemple.fr");
    expect(m.loggerError).toHaveBeenCalledWith(
      { scope: "admin", err: "db unavailable" },
      "user data export failed",
    );
  });

  it("says so in French, without a stack, when the export cannot be built", async () => {
    m.buildExportPayload.mockRejectedValue(new Error("db timeout"));

    const response = await call();

    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe(
      "L'export n'a pas pu être préparé. Réessaie dans un instant.",
    );
    expect(m.record).not.toHaveBeenCalled();
  });

  it("refuses rather than send links to the console when the site's address is misconfigured", async () => {
    m.learnerSiteUrl.mockImplementation(() => {
      throw new Error("NEXT_PUBLIC_SITE_URL points at the admin console.");
    });

    const response = await call();

    expect(response.status).toBe(500);
    expect(m.buildExportPayload).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });
});
