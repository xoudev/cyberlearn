import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  buildPayload: vi.fn<(userId: string, periodKey: string) => Promise<unknown>>(),
  findUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  wrappedRepository: { buildPayload: m.buildPayload },
  prisma: { user: { findUnique: m.findUnique } },
}));

const { recapFor } = await import("../recap");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.buildPayload.mockResolvedValue({ periodKey: "2026" });
  m.findUnique.mockResolvedValue({ username: "alex", displayName: "Alex" });
});

describe("recapFor", () => {
  it("builds nothing out of season, and says when it opens", async () => {
    expect(await recapFor("user-1", new Date("2026-06-15T10:00:00Z"))).toEqual({
      open: false,
      periodKey: "2026",
      opensOn: "2026-12-01",
    });
    expect(m.buildPayload).not.toHaveBeenCalled();
  });

  it("recaps the current year in December", async () => {
    const recap = await recapFor("user-1", new Date("2026-12-03T10:00:00Z"));
    expect(m.buildPayload).toHaveBeenCalledWith("user-1", "2026");
    expect(recap).toEqual({
      open: true,
      payload: { periodKey: "2026" },
      handle: "alex",
      periodKey: "2026",
    });
  });

  it("recaps the year just ended during the first week of January", async () => {
    await recapFor("user-1", new Date("2027-01-05T10:00:00Z"));
    expect(m.buildPayload).toHaveBeenCalledWith("user-1", "2026");
  });

  it("names the card after the display name, then a neutral word, without a handle", async () => {
    m.findUnique.mockResolvedValue({ username: null, displayName: "Alex" });
    expect(await recapFor("user-1", new Date("2026-12-03T10:00:00Z"))).toMatchObject({
      handle: "Alex",
    });
    m.findUnique.mockResolvedValue(null);
    expect(await recapFor("user-1", new Date("2026-12-03T10:00:00Z"))).toMatchObject({
      handle: "moi",
    });
  });
});
