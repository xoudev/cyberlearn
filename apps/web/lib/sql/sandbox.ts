/**
 * A real SQLite for a lesson exercise: sql.js in a Web Worker
 * (public/runtimes/sqljs, see RUNTIMES_VERSIONS.md), built from the exercise's
 * schema on first use.
 *
 * In a worker rather than on the page so that a query that never ends (a
 * recursive CTE without a stop) cannot freeze the tab: past the time limit the
 * worker is terminated, which is the only way to stop SQLite mid-query, and
 * the next query starts again from the schema.
 */

export const SQLJS_WORKER_URL = "/runtimes/sqljs/worker.sql-wasm.js";

/** Past this, a query is cut, and the database starts over. */
export const QUERY_TIME_LIMIT_MS = 3000;

export type SqlCell = string | number | null;

export interface SqlResult {
  columns: string[];
  values: SqlCell[][];
}

export type SqlOutcome =
  | { ok: true; results: SqlResult[] }
  | { ok: false; error: string; timedOut: boolean };

/** What the page needs of a Worker: enough to be replaced in tests. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

interface Reply {
  id: number;
  /** As sql.js sends them: a cell can also be a Uint8Array, for a blob. */
  results?: { columns: string[]; values: unknown[][] }[];
  error?: string;
}

function isReply(data: unknown): data is Reply {
  return typeof data === "object" && data !== null && "id" in data && typeof data.id === "number";
}

/** SQLite's binary values are not shown: a placeholder says what they are. */
function displayable(results: NonNullable<Reply["results"]>): SqlResult[] {
  return results.map((r) => ({
    columns: r.columns,
    values: r.values.map((row) =>
      row.map((v) =>
        typeof v === "string" || typeof v === "number" || v === null ? v : "[binaire]",
      ),
    ),
  }));
}

export class SqlSandbox {
  private worker: WorkerLike | null = null;
  private ready: Promise<SqlOutcome> | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, (reply: Reply) => void>();

  constructor(
    private readonly schema: string,
    // SAFETY: a DOM Worker has every member WorkerLike names; its event types
    // are only narrower than WorkerLike's, which reads `data` alone.
    private readonly createWorker: () => WorkerLike = () =>
      new Worker(SQLJS_WORKER_URL) as unknown as WorkerLike,
  ) {}

  private send(message: { action: string; sql?: string; params?: unknown[] }): Promise<Reply> {
    const worker = this.worker;
    if (worker === null) return Promise.resolve({ id: 0, error: "Base fermée." });
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      worker.postMessage({ id, ...message });
    });
  }

  /** The worker, with the schema built in it; started on first need. */
  private start(): Promise<SqlOutcome> {
    if (this.ready !== null) return this.ready;
    const worker = this.createWorker();
    this.worker = worker;
    worker.onmessage = (event) => {
      if (!isReply(event.data)) return;
      const resolve = this.pending.get(event.data.id);
      this.pending.delete(event.data.id);
      resolve?.(event.data);
    };
    worker.onerror = () => {
      for (const resolve of this.pending.values()) {
        resolve({ id: 0, error: "Le moteur SQL n'a pas pu démarrer." });
      }
      this.pending.clear();
    };
    this.ready = (async (): Promise<SqlOutcome> => {
      const opened = await this.send({ action: "open" });
      if (opened.error !== undefined) return { ok: false, error: opened.error, timedOut: false };
      const built = await this.send({ action: "exec", sql: this.schema });
      if (built.error !== undefined) {
        return {
          ok: false,
          error: `Le schéma de l'exercice ne passe pas : ${built.error}`,
          timedOut: false,
        };
      }
      return { ok: true, results: [] };
    })();
    return this.ready;
  }

  /** Runs SQL against the exercise's database, cut after the time limit. */
  async exec(
    sql: string,
    params: unknown[] = [],
    limitMs = QUERY_TIME_LIMIT_MS,
  ): Promise<SqlOutcome> {
    const started = await this.start();
    if (!started.ok) {
      this.reset();
      return started;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => {
        resolve("timeout");
      }, limitMs);
    });
    const reply = await Promise.race([this.send({ action: "exec", sql, params }), timeout]);
    clearTimeout(timer);
    if (reply === "timeout") {
      this.reset();
      return {
        ok: false,
        error: `Requête arrêtée après ${String(limitMs / 1000)} s. La base repart de zéro.`,
        timedOut: true,
      };
    }
    if (reply.error !== undefined) return { ok: false, error: reply.error, timedOut: false };
    return { ok: true, results: displayable(reply.results ?? []) };
  }

  /** Back to the exercise's database as it was: the next query rebuilds it. */
  reset(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    for (const resolve of this.pending.values()) resolve({ id: 0, error: "Base remise à zéro." });
    this.pending.clear();
  }
}

/** The last result a run produced: what the learner reads, and what is checked. */
export function lastResult(results: SqlResult[]): SqlResult | null {
  return results.at(-1) ?? null;
}

function cellKey(v: SqlCell): string {
  // 2 and "2" are the same answer to a learner; SQLite's typing is loose too.
  return v === null ? "\u0000null" : String(v);
}

/** Whether a result is the one an exercise expects. Empty means "no rows". */
export function resultMatches(
  result: SqlResult | null,
  expected: { columns?: string[] | undefined; rows: SqlCell[][]; ordered: boolean },
): { ok: true } | { ok: false; reason: string } {
  const rows = result?.values ?? [];
  if (expected.columns !== undefined && result !== null) {
    const got = result.columns.map((c) => c.toLowerCase());
    const want = expected.columns.map((c) => c.toLowerCase());
    if (got.join("\u0001") !== want.join("\u0001")) {
      return { ok: false, reason: `Les colonnes attendues sont : ${expected.columns.join(", ")}.` };
    }
  }
  if (rows.length !== expected.rows.length) {
    return {
      ok: false,
      reason: `${String(rows.length)} ligne${rows.length > 1 ? "s" : ""} au lieu de ${String(expected.rows.length)}.`,
    };
  }
  const key = (row: SqlCell[]): string => row.map(cellKey).join("\u0001");
  const got = rows.map(key);
  const want = expected.rows.map(key);
  if (!expected.ordered) {
    got.sort();
    want.sort();
  }
  const same = got.every((g, i) => g === want[i]);
  if (!same) {
    return {
      ok: false,
      reason: expected.ordered
        ? "Les bonnes lignes ne sont pas toutes là, ou pas dans l'ordre demandé."
        : "Les bonnes lignes ne sont pas toutes là.",
    };
  }
  return { ok: true };
}
