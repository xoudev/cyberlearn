import { describe, expect, it } from "vitest";
import { playOnPhp } from "./real-php";

/**
 * The real PHP, as a lab runs it. These are the behaviours the exercises rest
 * on: a page answers with its status, headers and body, a page that ends
 * itself still does, and what a lab must not do, it cannot.
 */

const enc = encodeURIComponent;

describe("a request, played on the real PHP", () => {
  it("answers with the page, and sets $_GET as a server would", async () => {
    const files = {
      "search.php": `<?php echo "q=" . ($_GET['q'] ?? '-'), " tags=", count($_GET['t'] ?? []);`,
    };
    const response = await playOnPhp(files, {
      path: "/search.php",
      query: `q=${enc("a b<c>")}&t[]=1&t[]=2`,
    });
    expect(response).toMatchObject({ status: 200, body: "q=a b<c> tags=2", fatal: false });
    expect(response.headers).toContain("X-Powered-By: PHP/8.4.1");
  }, 60_000);

  it("reads a POST body and the cookies of the request", async () => {
    const files = {
      "me.php": `<?php echo json_encode([$_SERVER['REQUEST_METHOD'], $_POST, $_COOKIE]);`,
    };
    const response = await playOnPhp(files, {
      method: "POST",
      path: "/me.php",
      body: "name=B%C3%A9a&x[y]=z",
      cookie: "session=tok-bob; theme=dark",
    });
    expect(JSON.parse(response.body)).toEqual([
      "POST",
      { name: "Béa", x: { y: "z" } },
      { session: "tok-bob", theme: "dark" },
    ]);
  });

  it("keeps the status and headers of a page that ends itself with exit or die", async () => {
    const files = {
      "forbid.php": `<?php http_response_code(403); exit("Accès refusé");`,
      "bounce.php": `<?php header('Location: /search.php?q=x'); die;`,
      "either.php": `<?php $ok = false; $ok or http_response_code(401) and die('401'); echo "not reached";`,
      "text.php": `<?php // exit and die in a comment
echo "the word exit, in a string: 'die()'";`,
    };
    expect(await playOnPhp(files, { path: "/forbid.php" })).toMatchObject({
      status: 403,
      body: "Accès refusé",
    });
    const bounce = await playOnPhp(files, { path: "/bounce.php" });
    expect(bounce.status).toBe(302);
    expect(bounce.headers).toContain("Location: /search.php?q=x");
    expect(await playOnPhp(files, { path: "/either.php" })).toMatchObject({
      status: 401,
      body: "401",
    });
    expect((await playOnPhp(files, { path: "/text.php" })).body).toBe(
      `the word exit, in a string: 'die()'`,
    );
  });

  it("runs the pages a page includes, with __DIR__ and an exit inside them", async () => {
    const files = {
      "guard.php": `<?php function guard() { http_response_code(401); die('401'); }`,
      "page.php": `<?php require __DIR__ . '/lib/helper.php'; echo helper(), ' '; require __DIR__ . '/guard.php'; guard(); echo 'never';`,
      "lib/helper.php": `<?php function helper() { return 'helped'; }`,
    };
    expect(await playOnPhp(files, { path: "/page.php" })).toMatchObject({
      status: 401,
      body: "helped 401",
    });
  });

  it("gives every request a PHP of its own: nothing is left over from the last page", async () => {
    const files = { "a.php": `<?php function f() { return 1; } echo "a:", f();` };
    expect((await playOnPhp(files, { path: "/a.php" })).body).toBe("a:1");
    expect((await playOnPhp(files, { path: "/a.php" })).body).toBe("a:1");
  });

  it("answers 404 for a page that is not there, and refuses to leave the lab", async () => {
    const files = { "a.php": `<?php echo 1;` };
    expect(await playOnPhp(files, { path: "/missing.php" })).toMatchObject({ status: 404 });
    expect(await playOnPhp(files, { path: "/../etc/passwd" })).toMatchObject({ status: 404 });
    expect(await playOnPhp(files, { path: "/a.txt" })).toMatchObject({ status: 404 });
  });

  it("says what went wrong in a page the way PHP does", async () => {
    const files = {
      "broken.php": `<?php echo "x" echo "y";`,
      "warn.php": `<?php echo $undefined; echo intdiv(1, 0);`,
    };
    const parse = await playOnPhp(files, { path: "/broken.php" });
    expect(parse.status).toBe(500);
    expect(parse.body).toBe(
      `ParseError: syntax error, unexpected token "echo", expecting "," or ";" in broken.php on line 1`,
    );
    const warn = await playOnPhp(files, { path: "/warn.php" });
    expect(warn.body).toContain("Warning: Undefined variable $undefined in warn.php on line 1");
    expect(warn.body).toContain("DivisionByZeroError: Division by zero");
  });
});

describe("what a lab cannot do", () => {
  const probe = (code: string): string =>
    `<?php try { var_dump(${code}); } catch (Throwable $e) { echo get_class($e), ': ', $e->getMessage(); }`;

  it.each([
    ["start a process", `exec("id")`, "Call to undefined function exec()"],
    ["send mail", `mail("a@b.c", "s", "m")`, "Call to undefined function mail()"],
    ["reach JavaScript", `vrzno_eval("1+1")`, "Call to undefined function vrzno_eval()"],
    [
      "import a JavaScript module",
      `vrzno_import("x")`,
      "Call to undefined function vrzno_import()",
    ],
    [
      "use the JavaScript bridge class",
      `(new Vrzno())->eval("1")`,
      "Call to undefined method Vrzno::eval()",
    ],
  ])("cannot %s", async (_what, code, message) => {
    const response = await playOnPhp({ "x.php": probe(code) }, { path: "/x.php" });
    expect(response.body).toContain(message);
    expect(response.body).not.toMatch(/string\(|int\(/u);
  });

  it("cannot fetch an address, nor include one", async () => {
    const response = await playOnPhp(
      {
        "x.php": `<?php var_dump(@file_get_contents("http://example.org/")); var_dump(@include "http://example.org/x.php");`,
      },
      { path: "/x.php" },
    );
    expect(response.body).toBe("bool(false)\nbool(false)\n");
  });

  it("shows a page the disk of its own PHP, and nothing of the machine it runs on", async () => {
    const files = {
      "x.php": `<?php echo json_encode([is_file('/etc/passwd'), is_dir('/Users'), file_exists('C:/Users'), scandir('/app')]);`,
    };
    const response = await playOnPhp(files, { path: "/x.php" });
    expect(JSON.parse(response.body)).toEqual([false, false, false, [".", "..", "x.php"]]);
  });

  it("dies in a readable way when a page eats all the memory, and the next request is fine", async () => {
    const files = {
      "hog.php": `<?php $s = []; while (true) { $s[] = str_repeat('x', 1024 * 1024); }`,
      "ok.php": `<?php echo "still here";`,
    };
    const hog = await playOnPhp(files, { path: "/hog.php" });
    expect(hog).toMatchObject({ status: 500, fatal: true });
    expect(hog.body).toMatch(/mémoire/u);
    expect((await playOnPhp(files, { path: "/ok.php" })).body).toBe("still here");
  }, 60_000);
});
