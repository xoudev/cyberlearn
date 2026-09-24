import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Suggestions from "@/lib/paths/suggestions";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser } }),
}));

const setOnboardingComplete = vi.fn();
vi.mock("@/lib/onboarding/finalize", () => ({ setOnboardingComplete }));

const saveLearningAnswers = vi.fn();
vi.mock("@/lib/paths/suggestions", async (importOriginal) => ({
  ...(await importOriginal<typeof Suggestions>()),
  saveLearningAnswers,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { finishGoals } = await import("../finish-goals");

function form(fields: [string, string][]): FormData {
  const data = new FormData();
  for (const [k, v] of fields) data.append(k, v);
  return data;
}

const ANSWERS: [string, string][] = [
  ["goals", "DEV"],
  ["goals", "CYBERSEC"],
  ["level", "SOME"],
];

beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  setOnboardingComplete.mockReset();
  saveLearningAnswers.mockReset();
});

describe("finishGoals", () => {
  it("sends somebody signed out to the login, touching nothing", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(finishGoals(form([...ANSWERS, ["to", "catalogue"]]))).rejects.toThrow(
      "REDIRECT /login",
    );
    expect(saveLearningAnswers).not.toHaveBeenCalled();
    expect(setOnboardingComplete).not.toHaveBeenCalled();
  });

  it("keeps the answers, ends the onboarding and opens the chosen path", async () => {
    await expect(
      finishGoals(form([...ANSWERS, ["to", "path"], ["slug", "python-bases-pratique"]])),
    ).rejects.toThrow("REDIRECT /paths/python-bases-pratique");
    expect(saveLearningAnswers).toHaveBeenCalledWith("user-1", {
      goals: ["DEV", "CYBERSEC"],
      level: "SOME",
    });
    expect(setOnboardingComplete).toHaveBeenCalledWith("user-1");
  });

  it("ends the onboarding on the catalogue", async () => {
    await expect(finishGoals(form([...ANSWERS, ["to", "catalogue"]]))).rejects.toThrow(
      /^REDIRECT \/paths$/,
    );
    expect(setOnboardingComplete).toHaveBeenCalledWith("user-1");
  });

  it("goes on to the placement test without ending the onboarding", async () => {
    await expect(finishGoals(form([...ANSWERS, ["to", "placement"]]))).rejects.toThrow(
      "REDIRECT /onboarding/placement-test",
    );
    expect(saveLearningAnswers).toHaveBeenCalled();
    expect(setOnboardingComplete).not.toHaveBeenCalled();
  });

  it.each([
    ["an address", "https://evil.example"],
    ["a path out", "../admin"],
    ["a protocol-relative address", "//evil.example"],
    ["nothing", ""],
  ])("refuses %s as a slug and ends nothing", async (_, slug) => {
    await expect(finishGoals(form([...ANSWERS, ["to", "path"], ["slug", slug]]))).rejects.toThrow(
      "REDIRECT /onboarding/goals",
    );
    expect(setOnboardingComplete).not.toHaveBeenCalled();
    expect(saveLearningAnswers).not.toHaveBeenCalled();
  });

  it("refuses an unknown destination", async () => {
    await expect(finishGoals(form([...ANSWERS, ["to", "dashboard"]]))).rejects.toThrow(
      "REDIRECT /onboarding/goals",
    );
    expect(setOnboardingComplete).not.toHaveBeenCalled();
  });

  it("still lets somebody through whose answers are incomplete, without saving them", async () => {
    await expect(
      finishGoals(
        form([
          ["level", "NEW"],
          ["to", "catalogue"],
        ]),
      ),
    ).rejects.toThrow(/^REDIRECT \/paths$/);
    expect(saveLearningAnswers).not.toHaveBeenCalled();
    expect(setOnboardingComplete).toHaveBeenCalledWith("user-1");
  });
});
