import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CRON_JOBS } from "@cyberlearn/lib/cron/jobs";

/**
 * Each scheduled job's run is recorded for the console, and the list the
 * console reads its schedules from is the one Vercel runs: vercel.json, and
 * the routes under app/api/cron.
 */

const m = vi.hoisted(() => ({
  record: vi.fn<(job: string, run: Record<string, unknown>) => Promise<void>>(),
  logError: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({ cronRunRepository: { record: m.record } }));
vi.mock("@cyberlearn/lib/logger", () => ({
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  logger: { error: m.logError },
}));

const { CRON_ERROR_MAX, failureCounts, flatSummary, trackCronRun } = await import("../cron-run");

const WEB = join(__dirname, "..", "..");

beforeEach(() => {
  vi.clearAllMocks();
  m.record.mockResolvedValue(undefined);
});

describe("flatSummary", () => {
  it("keeps the plain values a page can print, and nothing nested", () => {
    expect(
      flatSummary({ sent: 3, note: "x", done: true, none: null, nan: Number.NaN, details: [1] }),
    ).toEqual({ sent: 3, note: "x", done: true, none: null });
    expect(flatSummary(null)).toEqual({});
    expect(flatSummary([1, 2])).toEqual({});
  });
});

describe("trackCronRun", () => {
  it("records a run that worked, and hands its result back", async () => {
    const result = await trackCronRun("retention", () => Promise.resolve({ auditLogs: 4 }));
    expect(result).toEqual({ auditLogs: 4 });
    expect(m.record).toHaveBeenCalledWith("retention", {
      ok: true,
      // SAFETY: an asymmetric matcher, typed as the number it matches.
      durationMs: expect.any(Number) as number,
      summary: { auditLogs: 4 },
      error: null,
    });
  });

  it("records a run that threw, then throws again for the route to answer", async () => {
    await expect(
      trackCronRun("streak-reset", () => Promise.reject(new Error("connection refused"))),
    ).rejects.toThrow("connection refused");
    expect(m.record).toHaveBeenCalledWith("streak-reset", {
      ok: false,
      // SAFETY: an asymmetric matcher, typed as the number it matches.
      durationMs: expect.any(Number) as number,
      summary: {},
      error: "connection refused",
    });
  });

  it("records as failed a run that returned and says it did not do its job", async () => {
    await trackCronRun("keep-alive", () => Promise.resolve({ postgres: "error" }), {
      failure: (r) => (r.postgres === "error" ? "Postgres ne répond pas" : null),
    });
    expect(m.record.mock.calls[0]?.[1]).toMatchObject({
      ok: false,
      summary: { postgres: "error" },
      error: "Postgres ne répond pas",
    });
  });

  it("records only the part of the result it is told to keep, and hands back all of it", async () => {
    const result = await trackCronRun(
      "keep-alive",
      () => Promise.resolve({ timestamp: "2026-10-18T06:00:00.000Z", postgres: "ok" }),
      { summary: ({ postgres }) => ({ postgres }) },
    );
    expect(result).toEqual({ timestamp: "2026-10-18T06:00:00.000Z", postgres: "ok" });
    expect(m.record.mock.calls[0]?.[1]).toMatchObject({ ok: true, summary: { postgres: "ok" } });
  });

  it("records as failed a batch that went on past rows it could not write", async () => {
    await trackCronRun("streak-reset", () => Promise.resolve({ scanned: 9, failed: 2 }), {
      failure: (r) => failureCounts([[r.failed, "écriture en échec", "écritures en échec"]]),
    });
    expect(m.record.mock.calls[0]?.[1]).toMatchObject({
      ok: false,
      error: "2 écritures en échec",
    });
  });

  it("keeps a long cause to a readable length", async () => {
    await expect(
      trackCronRun("retention", () => Promise.reject(new Error("x".repeat(5000)))),
    ).rejects.toThrow();
    const error = m.record.mock.calls[0]?.[1]?.error;
    expect(typeof error === "string" ? error.length : 0).toBe(CRON_ERROR_MAX);
  });

  it("never fails the job when the run cannot be written", async () => {
    m.record.mockRejectedValue(new Error("db down"));
    await expect(trackCronRun("retention", () => Promise.resolve({ n: 1 }))).resolves.toEqual({
      n: 1,
    });
    expect(m.logError).toHaveBeenCalled();
  });
});

describe("failureCounts", () => {
  it("is null when nothing failed", () => {
    expect(failureCounts([[0, "écriture en échec", "écritures en échec"]])).toBeNull();
    expect(failureCounts([])).toBeNull();
  });

  it("says each kind that failed, in the singular or the plural", () => {
    expect(failureCounts([[1, "rappel non envoyé", "rappels non envoyés"]])).toBe(
      "1 rappel non envoyé",
    );
    expect(
      failureCounts([
        [2, "effacement en échec", "effacements en échec"],
        [0, "avis non envoyé", "avis non envoyés"],
        [3, "avis non envoyé", "avis non envoyés"],
      ]),
    ).toBe("2 effacements en échec, 3 avis non envoyés");
  });
});

describe("CRON_JOBS", () => {
  const vercel: unknown = JSON.parse(readFileSync(join(WEB, "vercel.json"), "utf8"));
  const declared: { path: string; schedule: string }[] =
    typeof vercel === "object" &&
    vercel !== null &&
    "crons" in vercel &&
    Array.isArray(vercel.crons)
      ? vercel.crons.flatMap((c: unknown) =>
          typeof c === "object" &&
          c !== null &&
          "path" in c &&
          "schedule" in c &&
          typeof c.path === "string" &&
          typeof c.schedule === "string"
            ? [{ path: c.path, schedule: c.schedule }]
            : [],
        )
      : [];

  it("lists exactly the crons vercel.json declares, on the same schedules", () => {
    expect(
      CRON_JOBS.filter((job) => job.source === "vercel")
        .map((job) => ({ path: job.path, schedule: job.schedule }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    ).toEqual([...declared].sort((a, b) => a.path.localeCompare(b.path)));
  });

  it("keeps the jobs called from outside out of vercel.json", () => {
    const paths = declared.map((c) => c.path);
    for (const job of CRON_JOBS.filter((j) => j.source === "external")) {
      expect(paths).not.toContain(job.path);
    }
  });

  it("has a job for every route under app/api/cron, and records each run", () => {
    const routes = readdirSync(join(WEB, "app/api/cron"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(routes).toEqual(CRON_JOBS.map((job) => job.name).sort());
    for (const name of routes) {
      const source = readFileSync(join(WEB, "app/api/cron", name, "route.ts"), "utf8");
      expect(source).toContain(`trackCronRun("${name}"`);
    }
  });
});
