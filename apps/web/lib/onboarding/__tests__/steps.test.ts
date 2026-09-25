import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Suggestions from "@/lib/paths/suggestions";

const m = vi.hoisted(() => ({
  findUnique: vi.fn<(args: unknown) => Promise<{ id: string } | null>>(),
  update: vi.fn<(args: unknown) => unknown>(),
  upsert: vi.fn<(args: unknown) => unknown>(),
  transaction: vi.fn<(ops: unknown[]) => Promise<unknown>>(),
  saveLearningAnswers: vi.fn<(userId: string, answers: unknown) => Promise<void>>(),
  markOnboardingComplete: vi.fn<(userId: string) => Promise<void>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: {
    user: { findUnique: m.findUnique, update: m.update },
    userPreferences: { upsert: m.upsert },
    $transaction: m.transaction,
  },
}));
vi.mock("@/lib/paths/suggestions", async () => {
  const actual = await vi.importActual<typeof Suggestions>("@/lib/paths/suggestions");
  return { ...actual, saveLearningAnswers: m.saveLearningAnswers };
});
vi.mock("../finalize", () => ({ markOnboardingComplete: m.markOnboardingComplete }));

const {
  ONBOARDING_FIELD_ERROR,
  USERNAME_TAKEN,
  finishOnboardingFor,
  saveOnboardingAvatar,
  saveOnboardingGoalsFor,
  saveOnboardingProfile,
} = await import("../steps");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.findUnique.mockResolvedValue(null);
  m.update.mockImplementation((args) => ({ op: "update", args }));
  m.upsert.mockImplementation((args) => ({ op: "upsert", args }));
  m.transaction.mockResolvedValue([]);
});

describe("saveOnboardingProfile", () => {
  it("writes the handle, the name and the bio, and makes sure preferences exist", async () => {
    const result = await saveOnboardingProfile("user-1", {
      username: "alex-b",
      displayName: " Alex ",
      bio: "Réseaux.",
    });
    expect(result).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { username: "alex-b", displayName: "Alex", bio: "Réseaux." },
    });
    expect(m.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1" },
      update: {},
    });
    expect(m.transaction).toHaveBeenCalledTimes(1);
  });

  it("keeps no bio for an empty one", async () => {
    await saveOnboardingProfile("user-1", { username: "alex", displayName: "Alex", bio: "  " });
    expect(m.update.mock.calls[0]?.[0]).toMatchObject({ data: { bio: null } });
  });

  it("explains each refused field in French, and writes nothing", async () => {
    const result = await saveOnboardingProfile("user-1", {
      username: "-Alex",
      displayName: "",
      bio: "x".repeat(281),
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        username: ONBOARDING_FIELD_ERROR.username,
        displayName: ONBOARDING_FIELD_ERROR.displayName,
        bio: ONBOARDING_FIELD_ERROR.bio,
      },
    });
    expect(m.transaction).not.toHaveBeenCalled();
    expect(await saveOnboardingProfile("user-1", null)).toMatchObject({ ok: false });
  });

  it("refuses a handle somebody else holds, and lets the owner keep theirs", async () => {
    m.findUnique.mockResolvedValue({ id: "user-2" });
    expect(await saveOnboardingProfile("user-1", { username: "alex", displayName: "A" })).toEqual({
      ok: false,
      errors: { username: USERNAME_TAKEN },
    });
    m.findUnique.mockResolvedValue({ id: "user-1" });
    expect(await saveOnboardingProfile("user-1", { username: "alex", displayName: "A" })).toEqual({
      ok: true,
    });
  });

  it("says taken when somebody got the handle between the check and the write", async () => {
    m.transaction.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    expect(await saveOnboardingProfile("user-1", { username: "alex", displayName: "A" })).toEqual({
      ok: false,
      errors: { username: USERNAME_TAKEN },
    });
  });

  it("lets any other failure through", async () => {
    m.transaction.mockRejectedValue(new Error("down"));
    await expect(
      saveOnboardingProfile("user-1", { username: "alex", displayName: "A" }),
    ).rejects.toThrow("down");
  });
});

describe("saveOnboardingAvatar", () => {
  it("keeps one of the built-in avatars", async () => {
    expect(await saveOnboardingAvatar("user-1", "/avatars/av-3.svg")).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { avatarUrl: "/avatars/av-3.svg" },
    });
  });

  it.each([["https://evil.example/a.svg"], ["__upload:x.png"], [null]])(
    "refuses anything else (%j)",
    async (value) => {
      expect(await saveOnboardingAvatar("user-1", value)).toEqual({
        ok: false,
        error: "Avatar invalide.",
      });
      expect(m.update).not.toHaveBeenCalled();
    },
  );
});

describe("finishOnboardingFor", () => {
  it("keeps both answers, then marks the sign-up complete", async () => {
    await finishOnboardingFor("user-1", { goals: ["CYBERSEC", "CYBERSEC"], level: "NEW" });
    expect(m.saveLearningAnswers).toHaveBeenCalledWith("user-1", {
      goals: ["CYBERSEC"],
      level: "NEW",
    });
    expect(m.markOnboardingComplete).toHaveBeenCalledWith("user-1");
  });

  it("completes a skipped questionnaire without recording anything", async () => {
    expect(await finishOnboardingFor("user-1", {})).toEqual({ ok: true });
    expect(await finishOnboardingFor("user-1", "nope")).toEqual({ ok: true });
    expect(m.saveLearningAnswers).not.toHaveBeenCalled();
    expect(m.markOnboardingComplete).toHaveBeenCalledTimes(2);
  });

  it("records nothing from half an answer or an unknown goal", async () => {
    await finishOnboardingFor("user-1", { goals: ["CYBERSEC"] });
    await finishOnboardingFor("user-1", { goals: ["HACKING"], level: "NEW" });
    expect(m.saveLearningAnswers).not.toHaveBeenCalled();
  });
});

describe("saveOnboardingGoalsFor", () => {
  it("keeps both answers and leaves the sign-up open, for the placement test", async () => {
    expect(await saveOnboardingGoalsFor("user-1", { goals: ["DEV"], level: "NEW" })).toEqual({
      ok: true,
    });
    expect(m.saveLearningAnswers).toHaveBeenCalledWith("user-1", { goals: ["DEV"], level: "NEW" });
    expect(m.markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("records nothing from half an answer, and still does not finish", async () => {
    await saveOnboardingGoalsFor("user-1", { level: "NEW" });
    await saveOnboardingGoalsFor("user-1", null);
    expect(m.saveLearningAnswers).not.toHaveBeenCalled();
    expect(m.markOnboardingComplete).not.toHaveBeenCalled();
  });
});
