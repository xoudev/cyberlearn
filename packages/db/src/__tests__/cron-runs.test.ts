/**
 * The trace the scheduled jobs leave in the audit log, and how the console
 * reads it back: a run written by nobody, the last run and the last failure
 * of each job, and metadata that does not have the shape it should.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CRON_RUN_TARGET,
  cronRunAction,
  cronRunFrom,
  cronRunRepository,
} from "../repositories/cron-run.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { auditLog: { create: vi.fn(), findFirst: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const AT = new Date("2026-10-17T03:30:04Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.auditLog.create.mockResolvedValue({});
});

describe("cronRunRepository.record", () => {
  it("writes a run with no actor, under the job's own action", async () => {
    await cronRunRepository.record("retention", {
      ok: true,
      durationMs: 812,
      summary: { auditLogs: 4 },
      error: null,
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: null,
        action: "cron.retention",
        targetType: CRON_RUN_TARGET,
        targetId: "retention",
        metadata: { ok: true, durationMs: 812, summary: { auditLogs: 4 } },
      },
    });
  });

  it("keeps the cause of a failure", async () => {
    await cronRunRepository.record("streak-reset", {
      ok: false,
      durationMs: 30,
      summary: {},
      error: "connection refused",
    });
    expect(mockPrisma.auditLog.create.mock.calls[0]?.[0]).toMatchObject({
      data: { metadata: { ok: false, error: "connection refused" } },
    });
  });
});

describe("cronRunFrom", () => {
  it("reads back what record wrote", () => {
    expect(
      cronRunFrom({
        createdAt: AT,
        metadata: { ok: true, durationMs: 812, summary: { auditLogs: 4, note: "x" } },
      }),
    ).toEqual({
      at: AT,
      ok: true,
      durationMs: 812,
      summary: { auditLogs: 4, note: "x" },
      error: null,
    });
  });

  it("takes a row it cannot read for a failure, without crashing", () => {
    expect(cronRunFrom({ createdAt: AT, metadata: null })).toEqual({
      at: AT,
      ok: false,
      durationMs: null,
      summary: {},
      error: null,
    });
    expect(
      cronRunFrom({
        createdAt: AT,
        metadata: { ok: "yes", durationMs: "12", summary: { nested: { a: 1 }, list: [1] } },
      }),
    ).toMatchObject({ ok: false, durationMs: null, summary: {} });
  });
});

describe("cronRunRepository.latest", () => {
  it("reads the last run and the last failure of each job", async () => {
    mockPrisma.auditLog.findFirst.mockImplementation((args: { where: { metadata?: unknown } }) =>
      Promise.resolve(
        args.where.metadata === undefined
          ? { createdAt: AT, metadata: { ok: true, durationMs: 5, summary: {} } }
          : null,
      ),
    );

    const runs = await cronRunRepository.latest(["retention"]);
    expect(runs.get("retention")).toEqual({
      lastRun: { at: AT, ok: true, durationMs: 5, summary: {}, error: null },
      lastFailure: null,
    });
    expect(mockPrisma.auditLog.findFirst).toHaveBeenCalledWith({
      where: { action: cronRunAction("retention"), targetType: CRON_RUN_TARGET },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, metadata: true },
    });
    expect(mockPrisma.auditLog.findFirst).toHaveBeenCalledWith({
      where: {
        action: "cron.retention",
        targetType: CRON_RUN_TARGET,
        metadata: { path: ["ok"], equals: false },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, metadata: true },
    });
  });
});
