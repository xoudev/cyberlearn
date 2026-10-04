/**
 * The PHP of a <PhpLab>: what the worker (php-lab.mjs) does with a request,
 * apart from talking to the page, so that the same code runs in a test.
 *
 * PHP 8.4 in WebAssembly (public/runtimes/php, see RUNTIMES_VERSIONS.md). A
 * PHP instance is made for each request and thrown away after it: PHP keeps
 * its state from one run to the next (a function defined stays defined), and
 * loses its php.ini on a refresh, so an instance is never reused. What is
 * kept is the compiled module, which is the slow part, and the next instance
 * is built while the learner reads the answer to the last one.
 */
import { HARNESS, INI } from "./php-lab-harness.mjs";

/**
 * The runtime's wrapper was written for a page: starting up, it reaches for
 * `document` and `window` (to unlock sound and size a canvas, which PHP never
 * uses). A worker has neither, so it is given two empty stand-ins: nothing
 * here draws, and nothing of the page's own is exposed.
 */
function givePhpAPage() {
  globalThis.document ??= { getElementById: () => null, addEventListener() {} };
  globalThis.window ??= globalThis;
}

/** The directories above a file, made one by one: the disk has no mkdir -p. */
async function ensureDirectory(php, directory) {
  let path = "";
  for (const part of directory.split("/").filter((p) => p !== "")) {
    path += `/${part}`;
    if (!(await php.analyzePath(path)).exists) await php.mkdir(path);
  }
}

/** What PHP printed when it died before it could answer, said for a learner. */
function fatalBody(noise) {
  if (/out of memory|allowed memory size/i.test(noise)) {
    return "Fatal error : la page a dépassé la mémoire qui lui est accordée.";
  }
  const text = noise.replace(/\[stderr\] /g, "").trim();
  return text === "" ? "Fatal error : la page s'est arrêtée sans répondre." : text;
}

/**
 * @typedef {{ method: "GET" | "POST", path: string, query: string, body: string, cookie: string }} LabRequest
 * @typedef {{ status: number, headers: string[], body: string, fatal: boolean }} LabResponse
 */

/**
 * @param {{ runtimeUrl: string, loadModule: () => Promise<WebAssembly.Module> }} options
 *   where the runtime's files are (a URL ending in a slash), and how to get
 *   the compiled PHP module (fetched in a worker, read from disk in a test).
 */
export function createPhpLab({ runtimeUrl, loadModule }) {
  /** @type {Promise<{ PhpBase: any, module: WebAssembly.Module }> | null} */
  let loaded = null;
  /** @type {Promise<any> | null} */
  let warm = null;
  let queue = Promise.resolve();

  function load() {
    loaded ??= (async () => {
      givePhpAPage();
      const [{ PhpBase }, module] = await Promise.all([
        import(new URL("PhpBase.mjs", runtimeUrl).href),
        loadModule(),
      ]);
      return { PhpBase, module };
    })();
    return loaded;
  }

  /** A PHP instance, with what it printed collected as it prints. */
  async function createInstance() {
    const { PhpBase, module } = await load();
    let fail = () => {};
    const failed = new Promise((_, reject) => {
      fail = reject;
    });
    const php = new PhpBase(import(new URL("php8.4-web.mjs", runtimeUrl).href), {
      version: "8.4",
      ini: INI,
      // The one compiled module is instantiated again for each PHP: fast.
      instantiateWasm(imports, receive) {
        WebAssembly.instantiate(module, imports).then((instance) => {
          receive(instance, module);
        }, fail);
        return {};
      },
    });
    const instance = { php, noise: "" };
    php.addEventListener("output", (event) => {
      instance.noise += event.detail.join("");
    });
    php.addEventListener("error", (event) => {
      instance.noise += `[stderr] ${event.detail.join("")}`;
    });
    await Promise.race([php.binary, failed]);
    return instance;
  }

  /** Starts the next instance without waiting for it; a failure is met when it is needed. */
  function warmUp() {
    warm = createInstance().catch(() => null);
  }

  /** @returns {Promise<LabResponse>} */
  async function play(files, request) {
    const taken = warm === null ? null : await warm;
    warm = null;
    const instance = taken ?? (await createInstance());
    const { php } = instance;
    try {
      for (const [path, source] of Object.entries(files)) {
        const target = `/app/${path}`;
        await ensureDirectory(php, target.slice(0, target.lastIndexOf("/")));
        await php.writeFile(target, source);
      }
      await ensureDirectory(php, "/lab");
      await php.writeFile("/lab/request.json", JSON.stringify(request));
      let died = false;
      try {
        await php.run(HARNESS);
      } catch {
        // PHP gave up (out of memory, a fatal error that is not an exception).
        died = true;
      }
      if ((await php.analyzePath("/lab/response.json")).exists) {
        const answer = JSON.parse(await php.readFile("/lab/response.json", { encoding: "utf8" }));
        return {
          status: answer.status,
          headers: answer.headers,
          body: answer.body,
          fatal: false,
        };
      }
      return {
        status: 500,
        headers: [],
        body: fatalBody(instance.noise),
        fatal: died || instance.noise !== "",
      };
    } finally {
      warmUp();
    }
  }

  return {
    /**
     * Plays a request against the lab's files: pages by path ("search.php").
     * Requests are played one after the other.
     * @param {Record<string, string>} files
     * @param {LabRequest} request
     * @returns {Promise<LabResponse>}
     */
    run(files, request) {
      const turn = queue.then(() => play(files, request));
      queue = turn.then(
        () => undefined,
        () => undefined,
      );
      return turn;
    },
  };
}
