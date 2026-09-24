/**
 * The page's Python: one worker (public/workers/py-runner.js) shared by every
 * challenge and playground of a lesson, with its lifecycle made visible.
 *
 * What was wrong before, all of it seen by learners as "random" results that
 * a reload fixed:
 *
 *  - The 15 s timeout started when the button was pressed, so it included
 *    downloading and starting Pyodide (about 14 MB). On a slow connection the
 *    first run timed out before any code ran, and was reported as such.
 *  - A worker whose start failed stayed failed: every later run answered with
 *    the same error until the page was reloaded, which also threw away the
 *    code being written.
 *  - Nothing said Python was loading, had failed, or could be restarted.
 *
 * Now the start has its own, generous, timeout; the execution timeout starts
 * only once Python is ready; a failed or stuck worker is discarded and the
 * next run starts a new one; `restart()` does it on demand; and the state can
 * be subscribed to, so the page can say what is happening.
 */

export type PythonRuntimeState = "idle" | "loading" | "ready" | "failed";

export interface PythonTestCase {
  input: string;
  expected: string;
}

export interface PythonTestResult extends PythonTestCase {
  /** The value returned, or the error when isError is set. */
  actual: string;
  passed: boolean;
  isError?: boolean;
  /** A French hint for the error's kind, when there is one. */
  hint?: string | null;
  /** What the code printed during this test. */
  output?: string;
}

export interface PythonRunResult {
  output: string;
  error: string | null;
  hint?: string | null;
}

/** Long: this is a first download on whatever connection the learner has. */
export const BOOT_TIMEOUT_MS = 90_000;
/** Counted from the moment Python is ready, never before. */
export const RUN_TIMEOUT_MS = 10_000;

export const TIMEOUT_MESSAGE =
  "Ton code tourne depuis plus de 10 secondes, il a été arrêté. Une boucle qui ne s'arrête jamais ?";
export const BOOT_FAILED_MESSAGE =
  "Python n'a pas pu démarrer. Vérifie ta connexion, puis relance Python : ton code est conservé.";

/** The part of a Worker this module uses, so tests can hand it a fake. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  addEventListener(type: "message" | "error", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "message" | "error", listener: (event: MessageEvent) => void): void;
}

interface Timeouts {
  boot: number;
  run: number;
}

export class PythonBootError extends Error {
  override name = "PythonBootError";
}

export class PythonRuntime {
  private worker: WorkerLike | null = null;
  private starting: Promise<WorkerLike> | null = null;
  private state: PythonRuntimeState = "idle";
  private readonly listeners = new Set<() => void>();
  // Runs go one after another: a run's timeout must measure that run, not the
  // time it spent waiting behind another exercise's.
  private queue: Promise<unknown> = Promise.resolve();
  private nextId = 0;

  constructor(
    private readonly createWorker: () => WorkerLike,
    private readonly timeouts: Timeouts = { boot: BOOT_TIMEOUT_MS, run: RUN_TIMEOUT_MS },
  ) {}

  getState = (): PythonRuntimeState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(next: PythonRuntimeState): void {
    if (this.state === next) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  /** Starts Python if it is not started; resolves once it can run code. */
  ensureReady(): Promise<WorkerLike> {
    this.starting ??= this.boot();
    return this.starting;
  }

  private boot(): Promise<WorkerLike> {
    const worker = this.createWorker();
    this.worker = worker;
    this.setState("loading");

    return new Promise<WorkerLike>((resolve, reject) => {
      const cleanup = (): void => {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      };
      const fail = (reason: string): void => {
        cleanup();
        this.discard(worker);
        this.setState("failed");
        reject(new PythonBootError(reason));
      };
      const onMessage = (event: MessageEvent): void => {
        const data = event.data as { type?: string; error?: string } | null;
        if (data?.type === "ready") {
          cleanup();
          this.setState("ready");
          resolve(worker);
        } else if (data?.type === "error") {
          fail(data.error ?? "start failed");
        }
      };
      const onError = (): void => {
        fail("worker error");
      };
      const timer = setTimeout(() => {
        fail("start timed out");
      }, this.timeouts.boot);

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
    });
  }

  /** Throws the worker away. The next run, or restart(), starts a new one. */
  private discard(worker: WorkerLike): void {
    worker.terminate();
    if (this.worker === worker) {
      this.worker = null;
      this.starting = null;
    }
  }

  /** A new worker, now: the button a learner presses when Python is stuck. */
  restart(): Promise<WorkerLike> {
    if (this.worker) this.discard(this.worker);
    this.setState("idle");
    return this.ensureReady();
  }

  private request<T>(message: Record<string, unknown>): Promise<T | "timeout"> {
    const run = async (): Promise<T | "timeout"> => {
      const worker = await this.ensureReady();
      const id = `run-${String(++this.nextId)}`;
      return new Promise<T | "timeout">((resolve) => {
        const onMessage = (event: MessageEvent): void => {
          const data = event.data as { id?: string } | null;
          if (data?.id !== id) return;
          clearTimeout(timer);
          worker.removeEventListener("message", onMessage);
          resolve(data as T);
        };
        const timer = setTimeout(() => {
          worker.removeEventListener("message", onMessage);
          // A worker stuck in a loop cannot be interrupted, only replaced.
          this.discard(worker);
          this.setState("idle");
          resolve("timeout");
        }, this.timeouts.run);
        worker.addEventListener("message", onMessage);
        worker.postMessage({ ...message, id });
      });
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  async runScript(code: string): Promise<PythonRunResult> {
    try {
      const reply = await this.request<PythonRunResult>({ code });
      if (reply === "timeout") return { output: "", error: TIMEOUT_MESSAGE, hint: null };
      return { output: reply.output, error: reply.error, hint: reply.hint ?? null };
    } catch (error) {
      if (error instanceof PythonBootError) {
        return { output: "", error: BOOT_FAILED_MESSAGE, hint: null };
      }
      throw error;
    }
  }

  async runTests(code: string, tests: PythonTestCase[]): Promise<PythonTestResult[]> {
    const failAll = (actual: string): PythonTestResult[] =>
      tests.map((t) => ({
        input: t.input,
        expected: t.expected,
        actual,
        passed: false,
        isError: true,
      }));
    try {
      const reply = await this.request<{ results?: PythonTestResult[] }>({ code, tests });
      if (reply === "timeout") return failAll(TIMEOUT_MESSAGE);
      return reply.results ?? [];
    } catch (error) {
      if (error instanceof PythonBootError) return failAll(BOOT_FAILED_MESSAGE);
      throw error;
    }
  }
}

let shared: PythonRuntime | null = null;

/** The page's runtime. Browser only: it creates a Worker on first use. */
export function getPythonRuntime(): PythonRuntime {
  shared ??= new PythonRuntime(() => new Worker("/workers/py-runner.js"));
  return shared;
}
