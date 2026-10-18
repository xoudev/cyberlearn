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

  it("files a lesson moved into the middle of another module under that module", () => {
    // The editor shows one list: "a" dropped between c and d is in M2 there.
    const plan = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: false },
        { lessonId: "b", moduleId: M1, isRequired: true },
        { lessonId: "c", moduleId: M2, isRequired: true },
        { lessonId: "d", moduleId: M2, isRequired: true },
      ],
      ["b", "c", "a", "d"],
    );
    expect(plan).toEqual([
      { lessonId: "b", position: 1, moduleId: M1, isRequired: true },
      { lessonId: "c", position: 2, moduleId: M2, isRequired: true },
      { lessonId: "a", position: 3, moduleId: M2, isRequired: false },
      { lessonId: "d", position: 4, moduleId: M2, isRequired: true },
    ]);
  });

  it("re-files lessons dropped there together, or apart, and a new one beside them", () => {
    const existing = ["a", "b", "c", "d", "e", "f", "g", "h"].map((lessonId, index) => ({
      lessonId,
      moduleId: index < 3 ? M1 : M2,
      isRequired: true,
    }));
    // b and c, together, between f and g, with a new lesson between them.
    const together = planPathLessons(existing, ["a", "d", "e", "f", "b", "new", "c", "g", "h"]);
    expect(together.map((row) => row.moduleId)).toEqual([M1, M2, M2, M2, M2, M2, M2, M2, M2]);
    // b between e and f, c between g and h.
    const apart = planPathLessons(existing, ["a", "d", "e", "b", "f", "g", "c", "h"]);
    expect(apart.map((row) => row.moduleId)).toEqual([M1, M2, M2, M2, M2, M2, M2, M2]);
  });

  it("reads one lesson moved down as one move, not its neighbours moved up", () => {
    // a, first of M1, dropped after c: c, between b and a, did not move.
    const plan = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: true },
        { lessonId: "b", moduleId: M1, isRequired: true },
        { lessonId: "c", moduleId: M2, isRequired: true },
        { lessonId: "d", moduleId: M2, isRequired: true },
      ],
      ["b", "c", "a", "d"],
    );
    expect(plan.map((row) => row.moduleId)).toEqual([M1, M2, M2, M2]);
  });

  it("files a lesson moved past a module's last lesson under that module", () => {
    const M3 = "m3";
    const plan = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: true },
        { lessonId: "b", moduleId: M1, isRequired: true },
        { lessonId: "c", moduleId: M2, isRequired: true },
        { lessonId: "d", moduleId: M2, isRequired: true },
        { lessonId: "e", moduleId: M3, isRequired: true },
      ],
      ["b", "c", "d", "a", "e"],
    );
    expect(plan.map((row) => row.moduleId)).toEqual([M1, M2, M2, M2, M3]);
  });

  it("keeps the module of a lesson moved to a module's edge", () => {
    const existing = [
      { lessonId: "a", moduleId: M1, isRequired: true },
      { lessonId: "b", moduleId: M1, isRequired: true },
      { lessonId: "c", moduleId: M2, isRequired: true },
      { lessonId: "d", moduleId: M2, isRequired: true },
    ];
    // "b" before a, first of M1; "d" before c, first of M2.
    const plan = planPathLessons(existing, ["b", "a", "d", "c"]);
    expect(plan.map((row) => row.moduleId)).toEqual([M1, M1, M2, M2]);
  });

  it("never empties a module by a reorder", () => {
    // M2 holds c alone, now between a and b: re-filing it would empty M2.
    const plan = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: true },
        { lessonId: "b", moduleId: M1, isRequired: true },
        { lessonId: "c", moduleId: M2, isRequired: true },
      ],
      ["a", "c", "b"],
    );
    expect(plan.map((row) => row.moduleId)).toEqual([M1, M2, M1]);
  });

  it("files a lesson out of any module into the module around it, never the reverse", () => {
    const into = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: true },
        { lessonId: "b", moduleId: M1, isRequired: true },
        { lessonId: "loose", moduleId: null, isRequired: true },
        { lessonId: "stray", moduleId: null, isRequired: true },
      ],
      ["a", "loose", "b", "stray"],
    );
    expect(into.map((row) => row.moduleId)).toEqual([M1, M1, M1, null]);

    // c dropped after the lessons the sync left out of any module.
    const out = planPathLessons(
      [
        { lessonId: "a", moduleId: M1, isRequired: true },
        { lessonId: "b", moduleId: M1, isRequired: true },
        { lessonId: "c", moduleId: M1, isRequired: true },
        { lessonId: "x", moduleId: null, isRequired: true },
        { lessonId: "y", moduleId: null, isRequired: true },
      ],
      ["a", "b", "x", "y", "c"],
    );
    expect(out.map((row) => row.moduleId)).toEqual([M1, M1, null, null, M1]);
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

    // A kept lesson moves and keeps its module; its flag is not written over.
    expect(mockPrisma.pathLesson.upsert).toHaveBeenNthCalledWith(1, {
      where: { pathId_lessonId: { pathId: PATH, lessonId: "b" } },
      create: { pathId: PATH, lessonId: "b", position: 1, moduleId: M2, isRequired: false },
      update: { position: 1, moduleId: M2 },
    });
    // The new one follows "a" into its module.
    expect(mockPrisma.pathLesson.upsert).toHaveBeenNthCalledWith(3, {
      where: { pathId_lessonId: { pathId: PATH, lessonId: "new" } },
      create: { pathId: PATH, lessonId: "new", position: 3, moduleId: M1, isRequired: true },
      update: { position: 3, moduleId: M1 },
    });
  });

  it("writes the module of a lesson moved into the middle of another", async () => {
    mockPrisma.pathLesson.findMany.mockResolvedValue([
      { lessonId: "a", moduleId: M1, isRequired: true },
      { lessonId: "b", moduleId: M1, isRequired: true },
      { lessonId: "c", moduleId: M2, isRequired: true },
      { lessonId: "d", moduleId: M2, isRequired: true },
    ]);

    await pathRepository.replaceLessons(PATH, ["b", "c", "a", "d"]);

    expect(mockPrisma.pathLesson.upsert).toHaveBeenNthCalledWith(3, {
      where: { pathId_lessonId: { pathId: PATH, lessonId: "a" } },
      create: { pathId: PATH, lessonId: "a", position: 3, moduleId: M2, isRequired: true },
      update: { position: 3, moduleId: M2 },
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
