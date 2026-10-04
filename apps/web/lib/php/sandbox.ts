import type { PhpRequestInput } from "@cyberlearn/types";
import type { WorkerLike } from "@/lib/sql/sandbox";
import type { PhpResponse } from "./expect";

/**
 * A real PHP for a lesson exercise: PHP 8.4 in a Web Worker
 * (public/workers/php-lab.mjs, which runs public/runtimes/php, see
 * RUNTIMES_VERSIONS.md), asked for one page at a time.
 *
 * In a worker rather than on the page so that a page that never ends (PHP has
 * no way to stop itself in WebAssembly) cannot freeze the tab: past the time
 * limit the worker is terminated, which is the only way to stop it, and the
 * next request starts a new one. The first request also waits for the runtime
 * to arrive (13 MB, then cached by the browser), which the limit allows for.
 */

export const PHP_WORKER_URL = "/workers/php-lab.mjs";

/** Past this, a page is cut off: the time PHP gets to answer once it runs. */
export const REQUEST_TIME_LIMIT_MS = 5000;

/** Added to the limit until the worker has answered once: downloading and compiling PHP. */
export const STARTUP_ALLOWANCE_MS = 30_000;

/** A page that prints without end is cut here, for the page to be able to show it. */
export const MAX_BODY_LENGTH = 100_000;

export type PhpOutcome =
  | { ok: true; response: PhpResponse }
  | { ok: false; error: string; timedOut: boolean };

/** What the worker is sent for one request: see public/workers/php-lab-core.d.mts. */
interface LabRequest {
  method: "GET" | "POST";
  path: string;
  query: string;
  body: string;
  cookie: string;
}

interface Reply {
  id: number;
  response?: PhpResponse;
  error?: string;
}

function isReply(data: unknown): data is Reply {
  return typeof data === "object" && data !== null && "id" in data && typeof data.id === "number";
}

/**
 * What a learner types in an address bar, as a request: the path and the
 * query the way a browser would send them (a "<" in the query goes as %3C,
 * and PHP reads it back as "<"). Null when it is not an address of the lab.
 */
export function toLabRequest(request: PhpRequestInput): LabRequest | null {
  if (!request.url.startsWith("/") || request.url.startsWith("//")) return null;
  try {
    const parsed = new URL(request.url, "http://lab.cyberlearn.local");
    return {
      method: request.method === "POST" ? "POST" : "GET",
      path: parsed.pathname,
      query: parsed.search.replace(/^\?/u, ""),
      body: request.method === "POST" ? (request.body ?? "") : "",
      cookie: request.cookie ?? "",
    };
  } catch {
    return null;
  }
}

export class PhpSandbox {
  private worker: WorkerLike | null = null;
  private warmedUp = false;
  private nextId = 1;
  private readonly pending = new Map<number, (reply: Reply) => void>();

  constructor(
    // SAFETY: a DOM Worker has every member WorkerLike names; its event types
    // are only narrower than WorkerLike's, which reads `data` alone.
    private readonly createWorker: () => WorkerLike = () =>
      new Worker(PHP_WORKER_URL, { type: "module" }) as unknown as WorkerLike,
  ) {}

  private start(): WorkerLike {
    if (this.worker !== null) return this.worker;
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
        resolve({ id: 0, error: "Le serveur PHP n'a pas pu démarrer." });
      }
      this.pending.clear();
    };
    return worker;
  }

  /**
   * Plays a request on the lab's pages (by path, "search.php"), cut after the
   * time limit. Each request gets a PHP of its own: nothing is left over from
   * the last one.
   */
  async request(
    files: Record<string, string>,
    request: PhpRequestInput,
    limitMs = REQUEST_TIME_LIMIT_MS,
  ): Promise<PhpOutcome> {
    const labRequest = toLabRequest(request);
    if (labRequest === null) {
      return {
        ok: false,
        error: "Une adresse du labo commence par une barre oblique : /page.php?q=1.",
        timedOut: false,
      };
    }
    const worker = this.start();
    const id = this.nextId++;
    const allowed = this.warmedUp ? limitMs : limitMs + STARTUP_ALLOWANCE_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => {
        resolve("timeout");
      }, allowed);
    });
    const answer = new Promise<Reply>((resolve) => {
      this.pending.set(id, resolve);
      worker.postMessage({ id, files, request: labRequest });
    });
    const reply = await Promise.race([answer, timeout]);
    clearTimeout(timer);
    if (reply === "timeout") {
      this.reset();
      return {
        ok: false,
        error: `La page n'a pas répondu en ${String(limitMs / 1000)} s : le serveur est arrêté. Une boucle sans fin, peut-être ?`,
        timedOut: true,
      };
    }
    if (reply.error !== undefined || reply.response === undefined) {
      this.reset();
      return {
        ok: false,
        error: reply.error ?? "Le serveur PHP n'a rien répondu.",
        timedOut: false,
      };
    }
    this.warmedUp = true;
    const { body } = reply.response;
    return {
      ok: true,
      response:
        body.length > MAX_BODY_LENGTH
          ? { ...reply.response, body: `${body.slice(0, MAX_BODY_LENGTH)}\n… (réponse tronquée)` }
          : reply.response,
    };
  }

  /** Stops the server; the next request starts a new one. */
  reset(): void {
    this.worker?.terminate();
    this.worker = null;
    this.warmedUp = false;
    for (const resolve of this.pending.values()) resolve({ id: 0, error: "Serveur arrêté." });
    this.pending.clear();
  }
}
