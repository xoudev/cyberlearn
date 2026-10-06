import { beforeEach, describe, expect, it, vi } from "vitest";

/** GET /api/me/settings: what the settings drawer opens with. */

const { auth, loadSettings, logger } = vi.hoisted(() => ({
  auth: { getRequestUser: vi.fn(), getActiveBan: vi.fn() },
  loadSettings: vi.fn(),
  logger: { error: vi.fn() },
}));

vi.mock("@/lib/auth", () => auth);
vi.mock("@/app/(app)/settings/_lib/load-settings", () => ({ loadSettings }));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger,
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

const { GET } = await import("../route");

const USER = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  auth.getRequestUser.mockResolvedValue(USER);
  auth.getActiveBan.mockResolvedValue(null);
  loadSettings.mockResolvedValue({ profile: { username: "ada" } });
});

describe("GET /api/me/settings", () => {
  it("refuses a visitor without a session", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(loadSettings).not.toHaveBeenCalled();
  });

  it("refuses a banned account, as the pages send it away", async () => {
    auth.getActiveBan.mockResolvedValue({ id: "ban-1" });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(loadSettings).not.toHaveBeenCalled();
  });

  it("answers the caller's settings, never to be stored on the way", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ profile: { username: "ada" } });
    expect(loadSettings).toHaveBeenCalledWith(USER);
  });

  it("says unavailable on a failure, and logs the message, not the error", async () => {
    loadSettings.mockRejectedValue(new Error("connection reset"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "unavailable" });
    expect(logger.error).toHaveBeenCalledWith(
      { scope: "settings", err: "connection reset" },
      "settings drawer load failed",
    );
  });
});
