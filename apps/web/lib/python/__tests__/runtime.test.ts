import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOOT_FAILED_MESSAGE, PythonRuntime, TIMEOUT_MESSAGE, type WorkerLike } from "../runtime";

/**
 * The worker's lifecycle, with a fake worker and a fake clock.
 *
 * The three failures learners saw as "random" and fixed by reloading: a slow
 * first download counted as their code timing out, a failed start that stayed
 * failed, and no way to restart Python without losing their code.
 */

type Listener = (event: MessageEvent) => void;

class FakeWorker implements WorkerLike {
  static all: FakeWorker[] = [];
  readonly posted: Record<string, unknown>[] = [];
  terminated = false;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor() {
    FakeWorker.all.push(this);
  }

  postMessage(message: unknown): void {
    this.posted.push(message as Record<string, unknown>);
  }
  terminate(): void {
    this.terminated = true;
  }
  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener);
  }
  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type: "message" | "error", data?: unknown): void {
    for (const l of this.listeners.get(type) ?? []) l(new MessageEvent(type, { data }));
  }
  /** Answers the last request as the real worker would. */
  reply(payload: Record<string, unknown>): void {
    const last = this.posted.at(-1);
    this.emit("message", { id: last?.id, ...payload });
  }
}

const BOOT = 90_000;
const RUN = 10_000;

function runtime(): PythonRuntime {
  return new PythonRuntime(() => new FakeWorker(), { boot: BOOT, run: RUN });
}

/** Lets pending promise callbacks run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeWorker.all = [];
});
afterEach(() => {
  vi.useRealTimers();
});

describe("starting", () => {
  it("does not count a slow start against the learner's code", async () => {
    const rt = runtime();
    const run = rt.runScript("print(1)");
    await flush();
    expect(rt.getState()).toBe("loading");

    // Thirty seconds of download: longer than any run is allowed.
    await vi.advanceTimersByTimeAsync(30_000);
    const worker = FakeWorker.all[0];
    worker?.emit("message", { type: "ready" });
    await flush();
    expect(worker?.posted).toHaveLength(1);

    worker?.reply({ output: "1\n", error: null, hint: null });
    expect(await run).toEqual({ output: "1\n", error: null, hint: null });
    expect(rt.getState()).toBe("ready");
  });

  it("reports a failed start, and tries again on the next run", async () => {
    const rt = runtime();
    const first = rt.runScript("print(1)");
    await flush();
    FakeWorker.all[0]?.emit("message", { type: "error", error: "network" });
    expect(await first).toEqual({ output: "", error: BOOT_FAILED_MESSAGE, hint: null });
    expect(rt.getState()).toBe("failed");
    expect(FakeWorker.all[0]?.terminated).toBe(true);

    const second = rt.runScript("print(2)");
    await flush();
    expect(FakeWorker.all).toHaveLength(2);
    FakeWorker.all[1]?.emit("message", { type: "ready" });
    await flush();
    FakeWorker.all[1]?.reply({ output: "2\n", error: null });
    expect((await second).output).toBe("2\n");
  });

  it("gives up on a start that never ends", async () => {
    const rt = runtime();
    const run = rt.runTests("x", [{ input: "f()", expected: "1" }]);
    await vi.advanceTimersByTimeAsync(BOOT + 1);
    const [result] = await run;
    expect(result).toMatchObject({ passed: false, isError: true, actual: BOOT_FAILED_MESSAGE });
    expect(rt.getState()).toBe("failed");
  });

  it("restarts on demand with a new worker", async () => {
    const rt = runtime();
    const first = rt.ensureReady().catch(() => "failed");
    await flush();
    FakeWorker.all[0]?.emit("message", { type: "error" });
    expect(await first).toBe("failed");
    await flush();
    expect(rt.getState()).toBe("failed");

    const restarted = rt.restart();
    expect(rt.getState()).toBe("loading");
    FakeWorker.all[1]?.emit("message", { type: "ready" });
    await restarted;
    expect(rt.getState()).toBe("ready");
  });

  it("tells subscribers when the state changes", async () => {
    const rt = runtime();
    const seen: string[] = [];
    rt.subscribe(() => seen.push(rt.getState()));
    void rt.ensureReady();
    FakeWorker.all[0]?.emit("message", { type: "ready" });
    await flush();
    expect(seen).toEqual(["loading", "ready"]);
  });
});

describe("running", () => {
  async function ready(rt: PythonRuntime): Promise<FakeWorker> {
    void rt.ensureReady();
    const worker = FakeWorker.all.at(-1);
    worker?.emit("message", { type: "ready" });
    await flush();
    if (!worker) throw new Error("no worker");
    return worker;
  }

  it("stops a run that never ends, and replaces the worker", async () => {
    const rt = runtime();
    const worker = await ready(rt);
    const run = rt.runScript("while True: pass");
    await flush();
    await vi.advanceTimersByTimeAsync(RUN + 1);
    expect(await run).toEqual({ output: "", error: TIMEOUT_MESSAGE, hint: null });
    expect(worker.terminated).toBe(true);
    expect(rt.getState()).toBe("idle");

    // The next run gets a fresh worker instead of the stuck one.
    void rt.runScript("print(1)");
    await flush();
    expect(FakeWorker.all).toHaveLength(2);
  });

  it("marks every test when the code times out", async () => {
    const rt = runtime();
    await ready(rt);
    const run = rt.runTests("while True: pass", [
      { input: "f(1)", expected: "1" },
      { input: "f(2)", expected: "2" },
    ]);
    await flush();
    await vi.advanceTimersByTimeAsync(RUN + 1);
    const results = await run;
    expect(results).toHaveLength(2);
    expect(results.every((r) => !r.passed && r.actual === TIMEOUT_MESSAGE)).toBe(true);
  });

  it("runs one request at a time, each with its own clock", async () => {
    const rt = runtime();
    const worker = await ready(rt);
    const a = rt.runScript("a");
    const b = rt.runScript("b");
    await flush();
    expect(worker.posted.map((m) => m.code)).toEqual(["a"]);

    // "a" takes 8 s, "b" 8 s more: neither is over its own 10 s.
    await vi.advanceTimersByTimeAsync(8_000);
    worker.reply({ output: "A", error: null });
    await flush();
    expect(worker.posted.map((m) => m.code)).toEqual(["a", "b"]);
    await vi.advanceTimersByTimeAsync(8_000);
    worker.reply({ output: "B", error: null });
    expect((await a).output).toBe("A");
    expect((await b).output).toBe("B");
  });

  it("passes the harness's hint through", async () => {
    const rt = runtime();
    const worker = await ready(rt);
    const run = rt.runScript("x");
    await flush();
    worker.reply({
      output: "",
      error: "Ligne 1\nNameError: name 'x' is not defined",
      hint: "Un nom…",
    });
    expect(await run).toEqual({
      output: "",
      error: "Ligne 1\nNameError: name 'x' is not defined",
      hint: "Un nom…",
    });
  });
});
