import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The window is a rule about the calendar, and this is the one place it stops
 * being a matter of presentation. The chip is only drawn in December, but a
 * server action is an endpoint: "the button was not on screen" is not a reason
 * anybody's browser has to respect. So the action re-reads the date itself,
 * and these are the two answers it can give.
 */

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
  buildPayload: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@cyberlearn/db", () => ({
  wrappedRepository: { buildPayload: m.buildPayload },
  prisma: { user: { findUnique: m.userFindUnique } },
}));

import { getWrappedAction } from "../wrapped-actions";

/** Noon UTC keeps every case clear of the Europe/Paris day boundary. */
function at(iso: string): void {
  vi.setSystemTime(new Date(`${iso}T12:00:00Z`));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  m.requireRequestUser.mockResolvedValue({ id: "u1" });
  m.buildPayload.mockResolvedValue({ periodKey: "2026" });
  m.userFindUnique.mockResolvedValue({ username: "amelie", displayName: "Amélie" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getWrappedAction", () => {
  it("serves the recap while the window is open", async () => {
    at("2026-12-14");
    const result = await getWrappedAction();

    expect(result.ok).toBe(true);
    expect(result.periodKey).toBe("2026");
    expect(result.handle).toBe("amelie");
    expect(m.buildPayload).toHaveBeenCalledWith("u1", "2026");
  });

  it("serves the year that just ended during January's grace period", async () => {
    at("2027-01-05");
    const result = await getWrappedAction();

    expect(result.ok).toBe(true);
    expect(result.periodKey).toBe("2026");
    expect(m.buildPayload).toHaveBeenCalledWith("u1", "2026");
  });

  it.each(["2026-01-08", "2026-06-15", "2026-11-30"])(
    "refuses out of season, and builds nothing (%s)",
    async (day) => {
      at(day);
      const result = await getWrappedAction();

      expect(result.ok).toBe(false);
      expect(result.payload).toBeUndefined();
      // The point of the gate: a closed window costs no aggregation either.
      expect(m.buildPayload).not.toHaveBeenCalled();
    },
  );

  it("asks who is calling before it looks at the calendar", async () => {
    at("2026-12-14");
    m.requireRequestUser.mockRejectedValue(new Error("UNAUTHENTICATED"));

    await expect(getWrappedAction()).rejects.toThrow("UNAUTHENTICATED");
    expect(m.buildPayload).not.toHaveBeenCalled();
  });

  it("falls back to the display name, then to a placeholder, for the handle", async () => {
    at("2026-12-14");
    m.userFindUnique.mockResolvedValue({ username: null, displayName: "Amélie" });
    expect((await getWrappedAction()).handle).toBe("Amélie");

    m.userFindUnique.mockResolvedValue(null);
    expect((await getWrappedAction()).handle).toBe("moi");
  });
});
