/**
 * Saving a path from the console. The bug: the action deleted every link of
 * the path and created them again at 0-based positions without moduleId, so
 * one save emptied the modules the sync had filled. It now hands the ordered
 * lessons to pathRepository.replaceLessons, in the transaction that updates
 * the path, and never deletes the links itself.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const tx = {
    path: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    requireAdminAction: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    replaceLessons: vi.fn(),
    transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
});

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  pathRepository: { replaceLessons: m.replaceLessons },
  prisma: {
    path: { findUnique: m.findUnique, findFirst: m.findFirst },
    $transaction: m.transaction,
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { updatePathAction } = await import("../actions");

const PATH = "11111111-1111-4111-8111-111111111111";
const L1 = "22222222-2222-4222-8222-222222222222";
const L2 = "33333333-3333-4333-8333-333333333333";

function form(lessonIds: string[]): FormData {
  const data = new FormData();
  const fields: Record<string, string> = {
    refCode: "CL-PATH-102-V01",
    slug: "linux",
    title: "Linux : de zéro à l'autonomie",
    description: "Administrer seul un serveur Linux.",
    category: "DEV",
    track: "SKILL",
    difficulty: "BEGINNER",
    estimatedHours: "60",
    coverImageUrl: "",
    status: "PUBLISHED",
    lessonIds: JSON.stringify(lessonIds),
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.findUnique.mockResolvedValue({
    id: PATH,
    refCode: "CL-PATH-102-V01",
    slug: "linux",
    status: "PUBLISHED",
    publishedAt: new Date("2026-10-01T00:00:00Z"),
  });
});

describe("updatePathAction", () => {
  it("hands the lessons, in order, to the repository inside the path's transaction", async () => {
    await expect(updatePathAction(PATH, {}, form([L2, L1]))).rejects.toThrow("REDIRECT /paths");

    expect(m.replaceLessons).toHaveBeenCalledExactlyOnceWith(PATH, [L2, L1], m.tx);
    // The client of the transaction has no pathLesson at all: the links are
    // the repository's to write, which keeps their module.
    expect(m.tx).not.toHaveProperty("pathLesson");
    expect(m.tx.path.update).toHaveBeenCalledTimes(1);
    const [audit] = m.tx.auditLog.create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(audit.data).toMatchObject({
      action: "path.update",
      targetId: PATH,
      metadata: { lessonCount: 2 },
    });
  });

  it("empties the path when the list is empty, still through the repository", async () => {
    await expect(updatePathAction(PATH, {}, form([]))).rejects.toThrow("REDIRECT /paths");
    expect(m.replaceLessons).toHaveBeenCalledExactlyOnceWith(PATH, [], m.tx);
  });

  it("writes nothing when the lesson list cannot be read", async () => {
    const data = form([]);
    data.set("lessonIds", "[not json");
    const state = await updatePathAction(PATH, {}, data);
    expect(state.fieldErrors?.lessonIds).toBe("Liste de leçons illisible.");
    expect(m.transaction).not.toHaveBeenCalled();
  });
});
