import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkerLike } from "@/lib/sql/sandbox";
import {
  MAX_BODY_LENGTH,
  PhpSandbox,
  REQUEST_TIME_LIMIT_MS,
  STARTUP_ALLOWANCE_MS,
  toLabRequest,
} from "../sandbox";

/**
 * A stand-in for the PHP worker: it answers a request as the worker does, from
 * a function of the request, and can be told never to answer (a page that
 * never ends).
 */
class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  terminated = false;
  readonly received: { files: Record<string, string>; request: Record<string, unknown> }[] = [];

  constructor(
    private readonly answer: (request: Record<string, unknown>) => unknown = () => ({
      status: 200,
      headers: [],
      body: "ok",
      fatal: false,
    }),
  ) {}

  postMessage(message: unknown): void {
    // SAFETY: the sandbox posts nothing else; a test double reads it as such.
    const m = message as {
      id: number;
      files: Record<string, string>;
      request: Record<string, unknown>;
    };
    this.received.push({ files: m.files, request: m.request });
    const reply = this.answer(m.request);
    if (reply === "never") return;
    queueMicrotask(() => {
      this.onmessage?.({
        data:
          typeof reply === "object" && reply !== null && "error" in reply
            ? { id: m.id, ...reply }
            : { id: m.id, response: reply },
      });
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("toLabRequest", () => {
  it("splits the address the way a browser sends it, a < in the query going as %3C", () => {
    expect(
      toLabRequest({
        method: "GET",
        url: "/search.php?q=<script>alert(1)</script>&n=2",
        cookie: "session=tok-bob",
      }),
    ).toEqual({
      method: "GET",
      path: "/search.php",
      query: "q=%3Cscript%3Ealert(1)%3C/script%3E&n=2",
      body: "",
      cookie: "session=tok-bob",
    });
  });

  it("sends a body only with a POST, and drops the fragment", () => {
    expect(toLabRequest({ method: "POST", url: "/login.php#top", body: "a=1" })).toMatchObject({
      method: "POST",
      path: "/login.php",
      query: "",
      body: "a=1",
    });
    expect(toLabRequest({ method: "GET", url: "/x.php", body: "a=1" })?.body).toBe("");
  });

  it("refuses what is not a path of the lab", () => {
    expect(toLabRequest({ method: "GET", url: "search.php" })).toBeNull();
    expect(toLabRequest({ method: "GET", url: "//evil.example/x.php" })).toBeNull();
    expect(toLabRequest({ method: "GET", url: "https://evil.example/x.php" })).toBeNull();
  });
});

describe("PhpSandbox", () => {
  it("sends the pages and the request, and returns what PHP answered", async () => {
    const worker = new FakeWorker((request) => ({
      status: 200,
      headers: ["X-Lab: 1"],
      body: `path=${String(request.path)}`,
      fatal: false,
    }));
    const sandbox = new PhpSandbox(() => worker);
    const outcome = await sandbox.request(
      { "search.php": "<?php echo 1;" },
      { method: "GET", url: "/search.php?q=1" },
    );
    expect(outcome).toEqual({
      ok: true,
      response: { status: 200, headers: ["X-Lab: 1"], body: "path=/search.php", fatal: false },
    });
    expect(worker.received[0]?.files).toEqual({ "search.php": "<?php echo 1;" });
  });

  it("starts one worker, for as many requests as there are", async () => {
    let made = 0;
    const sandbox = new PhpSandbox(() => {
      made++;
      return new FakeWorker();
    });
    await sandbox.request({}, { method: "GET", url: "/a.php" });
    await sandbox.request({}, { method: "GET", url: "/b.php" });
    expect(made).toBe(1);
  });

  it("cuts a page that never ends, and starts a new server for the next request", async () => {
    vi.useFakeTimers();
    const workers: FakeWorker[] = [];
    const sandbox = new PhpSandbox(() => {
      const worker = new FakeWorker((request) =>
        request.path === "/loop.php"
          ? "never"
          : { status: 200, headers: [], body: "ok", fatal: false },
      );
      workers.push(worker);
      return worker;
    });
    await sandbox.request({}, { method: "GET", url: "/warm.php" });
    const pending = sandbox.request({}, { method: "GET", url: "/loop.php" });
    await vi.advanceTimersByTimeAsync(REQUEST_TIME_LIMIT_MS);
    expect(await pending).toEqual({
      ok: false,
      error:
        "La page n'a pas répondu en 5 s : le serveur est arrêté. Une boucle sans fin, peut-être ?",
      timedOut: true,
    });
    expect(workers[0]?.terminated).toBe(true);
    await sandbox.request({}, { method: "GET", url: "/after.php" });
    expect(workers).toHaveLength(2);
  });

  it("waits longer for the very first answer: PHP has to arrive", async () => {
    vi.useFakeTimers();
    const sandbox = new PhpSandbox(() => new FakeWorker(() => "never"));
    const first = sandbox.request({}, { method: "GET", url: "/a.php" });
    let settled = false;
    void first.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(REQUEST_TIME_LIMIT_MS + STARTUP_ALLOWANCE_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await first).toMatchObject({ ok: false, timedOut: true });
  });

  it("passes the worker's own error on, and starts afresh after it", async () => {
    let made = 0;
    const sandbox = new PhpSandbox(() => {
      made++;
      return new FakeWorker(() => ({ error: "PHP : 404 sur /runtimes/php/x.wasm" }));
    });
    expect(await sandbox.request({}, { method: "GET", url: "/a.php" })).toEqual({
      ok: false,
      error: "PHP : 404 sur /runtimes/php/x.wasm",
      timedOut: false,
    });
    await sandbox.request({}, { method: "GET", url: "/a.php" });
    expect(made).toBe(2);
  });

  it("says when the worker itself fails to load", async () => {
    const worker = new FakeWorker(() => "never");
    const sandbox = new PhpSandbox(() => worker);
    const pending = sandbox.request({}, { method: "GET", url: "/a.php" });
    worker.onerror?.({});
    expect(await pending).toEqual({
      ok: false,
      error: "Le serveur PHP n'a pas pu démarrer.",
      timedOut: false,
    });
  });

  it("cuts an answer that goes on for ever, to what a page can show", async () => {
    const sandbox = new PhpSandbox(
      () =>
        new FakeWorker(() => ({
          status: 200,
          headers: [],
          body: "x".repeat(MAX_BODY_LENGTH + 500),
          fatal: false,
        })),
    );
    const outcome = await sandbox.request({}, { method: "GET", url: "/a.php" });
    if (!outcome.ok) throw new Error(outcome.error);
    expect(outcome.response.body.length).toBeLessThan(MAX_BODY_LENGTH + 40);
    expect(outcome.response.body.endsWith("(réponse tronquée)")).toBe(true);
  });

  it("refuses an address that is not the lab's without starting a server", async () => {
    let made = 0;
    const sandbox = new PhpSandbox(() => {
      made++;
      return new FakeWorker();
    });
    expect(
      await sandbox.request({}, { method: "GET", url: "https://evil.example/" }),
    ).toMatchObject({ ok: false });
    expect(made).toBe(0);
  });
});
