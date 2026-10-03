import { afterEach, describe, expect, it, vi } from "vitest";
import { lastResult, resultMatches, SqlSandbox, type WorkerLike } from "../sandbox";

/**
 * A stand-in for sql.js's worker: it answers "open" and "exec" as sql.js does,
 * from a function of the SQL, and can be told to never answer (a query that
 * runs forever).
 */
class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  terminated = false;
  readonly received: { action: string; sql: string | undefined; params: unknown[] | undefined }[] =
    [];

  constructor(
    private readonly answer: (sql: string, params: unknown[]) => unknown = () => ({ results: [] }),
  ) {}

  postMessage(message: unknown): void {
    // SAFETY: the sandbox posts nothing else; a test double reads it as such.
    const m = message as { id: number; action: string; sql?: string; params?: unknown[] };
    this.received.push({ action: m.action, sql: m.sql, params: m.params });
    if (m.action === "open") {
      queueMicrotask(() => this.onmessage?.({ data: { id: m.id, ready: true } }));
      return;
    }
    const reply = this.answer(m.sql ?? "", m.params ?? []);
    if (reply === "never") return;
    queueMicrotask(() => this.onmessage?.({ data: { id: m.id, ...(reply as object) } }));
  }

  terminate(): void {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("SqlSandbox", () => {
  it("opens a database, builds the schema once, then runs each query", async () => {
    const worker = new FakeWorker((sql) =>
      sql.startsWith("SELECT") ? { results: [{ columns: ["n"], values: [[1]] }] } : { results: [] },
    );
    const sandbox = new SqlSandbox("CREATE TABLE t (n);", () => worker);

    expect(await sandbox.exec("SELECT n FROM t")).toEqual({
      ok: true,
      results: [{ columns: ["n"], values: [[1]] }],
    });
    await sandbox.exec("SELECT 2");
    expect(worker.received.map((r) => r.action)).toEqual(["open", "exec", "exec", "exec"]);
    expect(worker.received[1]?.sql).toBe("CREATE TABLE t (n);");
  });

  it("passes SQLite's error on, and never shows a blob as bytes", async () => {
    const worker = new FakeWorker((sql) =>
      sql === "SELEC"
        ? { error: 'near "SELEC": syntax error' }
        : { results: [{ columns: ["b"], values: [[new Uint8Array([1])]] }] },
    );
    const sandbox = new SqlSandbox("", () => worker);
    expect(await sandbox.exec("SELEC")).toEqual({
      ok: false,
      error: 'near "SELEC": syntax error',
      timedOut: false,
    });
    expect(await sandbox.exec("SELECT b")).toEqual({
      ok: true,
      results: [{ columns: ["b"], values: [["[binaire]"]] }],
    });
  });

  it("says when the exercise's own schema does not build", async () => {
    const sandbox = new SqlSandbox(
      "CREATE TABL",
      () => new FakeWorker(() => ({ error: "syntax error" })),
    );
    const outcome = await sandbox.exec("SELECT 1");
    expect(outcome).toMatchObject({ ok: false, timedOut: false });
    if (!outcome.ok) expect(outcome.error).toContain("Le schéma de l'exercice ne passe pas");
  });

  it("cuts a query that never ends, and starts the next one on a fresh database", async () => {
    const workers: FakeWorker[] = [];
    const sandbox = new SqlSandbox("CREATE TABLE t (n);", () => {
      const worker = new FakeWorker((sql) =>
        sql.includes("RECURSIVE") ? "never" : { results: [] },
      );
      workers.push(worker);
      return worker;
    });

    const outcome = await sandbox.exec("WITH RECURSIVE r AS (SELECT 1) SELECT * FROM r", [], 20);
    expect(outcome).toEqual({
      ok: false,
      error: "Requête arrêtée après 0.02 s. La base repart de zéro.",
      timedOut: true,
    });
    expect(workers[0]?.terminated).toBe(true);

    await sandbox.exec("SELECT 1");
    expect(workers).toHaveLength(2);
    expect(workers[1]?.received[1]?.sql).toBe("CREATE TABLE t (n);");
  });

  it("resets to the schema on demand", async () => {
    const workers: FakeWorker[] = [];
    const sandbox = new SqlSandbox("", () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    await sandbox.exec("INSERT INTO t VALUES (1)");
    sandbox.reset();
    await sandbox.exec("SELECT * FROM t");
    expect(workers[0]?.terminated).toBe(true);
    expect(workers).toHaveLength(2);
  });
});

describe("resultMatches", () => {
  const result = {
    columns: ["username", "role"],
    values: [
      ["bob", "user"],
      ["alice", "admin"],
    ],
  };

  it("accepts the same rows in any order, unless the order is asked", () => {
    const rows = [
      ["alice", "admin"],
      ["bob", "user"],
    ];
    expect(resultMatches(result, { rows, ordered: false })).toEqual({ ok: true });
    expect(resultMatches(result, { rows, ordered: true }).ok).toBe(false);
  });

  it('treats 2 and "2" as the same answer, but not null and "null"', () => {
    expect(
      resultMatches({ columns: ["n"], values: [[2]] }, { rows: [["2"]], ordered: false }),
    ).toEqual({
      ok: true,
    });
    expect(
      resultMatches({ columns: ["n"], values: [[null]] }, { rows: [["null"]], ordered: false }).ok,
    ).toBe(false);
  });

  it("says what is off: the columns, or the number of rows", () => {
    expect(resultMatches(result, { columns: ["login", "role"], rows: [], ordered: false })).toEqual(
      {
        ok: false,
        reason: "Les colonnes attendues sont : login, role.",
      },
    );
    expect(resultMatches(result, { rows: [["alice", "admin"]], ordered: false })).toEqual({
      ok: false,
      reason: "2 lignes au lieu de 1.",
    });
  });

  it("reads no result as no rows", () => {
    expect(resultMatches(null, { rows: [], ordered: false })).toEqual({ ok: true });
    expect(lastResult([])).toBeNull();
  });
});
