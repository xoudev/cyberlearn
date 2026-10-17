/**
 * Saving a path's lessons from the console. The bug this guards: the save
 * deleted every link and recreated them without their module, at 0-based
 * positions, so one save emptied the modules the sync had filled. Prisma is
 * mocked; the integration spec runs the same writes against a database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { planPathLessons, POSITION_PARKING } from "../repositories/path-lessons.js";
import { pathRepository } from "../repositories/path.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    pathLesson: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    pathModule: { findFirst: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const PATH = "11111111-1111-4111-8111-111111111111";
const M1 = "m1";
const M2 = "m2";

describe("planPathLessons", () => {
  it("keeps each lesson's module and flag, and numbers from 1", () => {
    const plan = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: true },
        { lessonId: "b", moduleId: M1, isRequired: false },
        { lessonId: "c", moduleId: M2, isRequired: true },
      ],
      ["b", "a", "c"],
    );
    expect(plan).toEqual([
      { lessonId: "b", position: 1, moduleId: M1, isRequired: false },
      { lessonId: "a", position: 2, moduleId: M1, isRequired: true },
      { lessonId: "c", position: 3, moduleId: M2, isRequired: true },
    ]);
  });

  it("files a new lesson under the module of the lesson before it", () => {
    const plan = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: true },
        { lessonId: "c", moduleId: M2, isRequired: true },
      ],
      ["a", "new-1", "new-2", "c"],
    );
    expect(plan.map((row) => row.moduleId)).toEqual([M1, M1, M1, M2]);
    expect(plan[1]?.isRequired).toBe(true);
  });

  it("files a new first lesson under the first module that follows", () => {
    const plan = planPathLessons([{ lessonId: "c", moduleId: M2, isRequired: true }], ["new", "c"]);
    expect(plan.map((row) => row.moduleId)).toEqual([M2, M2]);
  });

  it("leaves every module empty in a path that has none", () => {
    const plan = planPathLessons([{ lessonId: "a", moduleId: null, isRequired: true }], ["a", "b"]);
    expect(plan.map((row) => row.moduleId)).toEqual([null, null]);
  });

  it("drops the lessons that are no longer listed", () => {
    const plan = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: true },
        { lessonId: "b", moduleId: M1, isRequired: true },
      ],
      ["b"],
    );
    expect(plan).toEqual([{ lessonId: "b", position: 1, moduleId: M1, isRequired: true }]);
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

/** The order the mocked writes were made in, by method name. */
function writeOrder(): string[] {
  const calls: { name: string; order: number }[] = [];
  for (const [name, fn] of Object.entries(mockPrisma.pathLesson)) {
    for (const order of fn.mock.invocationCallOrder) calls.push({ name, order });
  }
  return calls
    .filter((call) => call.name !== "findMany" && call.name !== "findFirst")
    .sort((a, b) => a.order - b.order)
    .map((call) => call.name);
}

describe("pathRepository.replaceLessons", () => {
  it("unlinks the lessons left out, parks the rest, then writes each in place", async () => {
    mockPrisma.pathLesson.findMany.mockResolvedValue([
      { lessonId: "a", moduleId: M1, isRequired: true },
      { lessonId: "b", moduleId: M2, isRequired: false },
      { lessonId: "gone", moduleId: M2, isRequired: true },
    ]);

    await pathRepository.replaceLessons(PATH, ["b", "a", "new"]);

    expect(mockPrisma.pathLesson.deleteMany).toHaveBeenCalledWith({
      where: { pathId: PATH, lessonId: { notIn: ["b", "a", "new"] } },
    });
    expect(mockPrisma.pathLesson.updateMany).toHaveBeenCalledWith({
      where: { pathId: PATH },
      data: { position: { increment: POSITION_PARKING } },
    });
    expect(writeOrder()).toEqual(["deleteMany", "updateMany", "upsert", "upsert", "upsert"]);

    // A kept lesson only moves: its module and flag are not written over.
    expect(mockPrisma.pathLesson.upsert).toHaveBeenNthCalledWith(1, {
      where: { pathId_lessonId: { pathId: PATH, lessonId: "b" } },
      create: { pathId: PATH, lessonId: "b", position: 1, moduleId: M2, isRequired: false },
      update: { position: 1 },
    });
    // The new one follows "a" into its module.
    expect(mockPrisma.pathLesson.upsert).toHaveBeenNthCalledWith(3, {
      where: { pathId_lessonId: { pathId: PATH, lessonId: "new" } },
      create: { pathId: PATH, lessonId: "new", position: 3, moduleId: M1, isRequired: true },
      update: { position: 3 },
    });
  });

  it("writes through the transaction it is given", async () => {
    const tx = {
      pathLesson: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn(),
      },
    };
    // SAFETY: the fake has the model methods replaceLessons calls.
    await pathRepository.replaceLessons(PATH, ["a"], tx as unknown as Prisma.TransactionClient);
    expect(tx.pathLesson.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.pathLesson.upsert).not.toHaveBeenCalled();
  });
});

describe("pathRepository.attachLesson", () => {
  it("puts the lesson after the last one, in the path's last module", async () => {
    mockPrisma.pathLesson.findFirst.mockResolvedValue({ position: 12 });
    mockPrisma.pathModule.findFirst.mockResolvedValue({ id: M2 });

    await pathRepository.attachLesson(PATH, "l");

    expect(mockPrisma.pathModule.findFirst).toHaveBeenCalledWith({
      where: { pathId: PATH },
      orderBy: { position: "desc" },
      select: { id: true },
    });
    expect(mockPrisma.pathLesson.upsert).toHaveBeenCalledWith({
      where: { pathId_lessonId: { pathId: PATH, lessonId: "l" } },
      create: { pathId: PATH, lessonId: "l", position: 13, moduleId: M2 },
      update: {},
    });
  });

  it("starts an empty path at 1, out of any module when it has none", async () => {
    mockPrisma.pathLesson.findFirst.mockResolvedValue(null);
    mockPrisma.pathModule.findFirst.mockResolvedValue(null);

    await pathRepository.attachLesson(PATH, "l");

    expect(mockPrisma.pathLesson.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { pathId: PATH, lessonId: "l", position: 1, moduleId: null },
      }),
    );
  });

  it("files it under the module asked for, when that module is the path's", async () => {
    mockPrisma.pathLesson.findFirst.mockResolvedValue({ position: 3 });
    mockPrisma.pathModule.findFirst.mockResolvedValueOnce({ id: M1 });

    await pathRepository.attachLesson(PATH, "l", undefined, M1);

    expect(mockPrisma.pathModule.findFirst).toHaveBeenCalledWith({
      where: { id: M1, pathId: PATH },
      select: { id: true },
    });
    expect(mockPrisma.pathLesson.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { pathId: PATH, lessonId: "l", position: 4, moduleId: M1 },
      }),
    );
  });
});

describe("pathRepository.detachLesson", () => {
  it("closes the gap through the parking range, never one row onto the next", async () => {
    mockPrisma.pathLesson.findUnique.mockResolvedValue({ position: 4 });

    await pathRepository.detachLesson(PATH, "l");

    expect(writeOrder()).toEqual(["findUnique", "delete", "updateMany", "updateMany"]);
    expect(mockPrisma.pathLesson.updateMany).toHaveBeenNthCalledWith(1, {
      where: { pathId: PATH, position: { gt: 4 } },
      data: { position: { increment: POSITION_PARKING } },
    });
    expect(mockPrisma.pathLesson.updateMany).toHaveBeenNthCalledWith(2, {
      where: { pathId: PATH, position: { gt: POSITION_PARKING } },
      data: { position: { decrement: POSITION_PARKING + 1 } },
    });
  });

  it("does nothing for a lesson that is not in the path", async () => {
    mockPrisma.pathLesson.findUnique.mockResolvedValue(null);
    await pathRepository.detachLesson(PATH, "l");
    expect(mockPrisma.pathLesson.delete).not.toHaveBeenCalled();
    expect(mockPrisma.pathLesson.updateMany).not.toHaveBeenCalled();
  });
});
