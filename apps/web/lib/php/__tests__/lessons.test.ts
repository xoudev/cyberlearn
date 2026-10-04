// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { componentPropsOf } from "@cyberlearn/lib/mdx-check";
import { type PhpLab, type PhpRequestInput, parsePhpLab, phpLabFiles } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import { checkExpectation } from "../expect";
import { toLabRequest } from "../sandbox";
import { playOnPhp } from "./real-php";

/**
 * The exercises of the lessons, played on the real PHP, the way a learner
 * plays them: attack the page as it is, then fix its code and ask for the
 * check. Each lab is read out of its lesson as the site compiles it, so what
 * is tested is what ships. An exercise a learner could not finish, or could
 * finish without fixing anything, fails here before it ships.
 */

const LESSONS = path.resolve(__dirname, "../../../../../content/lessons/cyber-web");

async function labsOf(file: string): Promise<PhpLab[]> {
  const mdx = readFileSync(path.join(LESSONS, file), "utf8")
    .replace(/\r\n/gu, "\n")
    .replace(/^---\n[\s\S]*?\n---\n/u, "");
  return (await componentPropsOf(mdx, "PhpLab")).map((props) => {
    const parsed = parsePhpLab(props);
    if (!parsed.ok) throw new Error(`${file}: ${parsed.problem}`);
    return parsed.value;
  });
}

async function answerTo(lab: PhpLab, code: string, request: PhpRequestInput) {
  const labRequest = toLabRequest(request);
  if (labRequest === null) throw new Error(`adresse invalide : ${request.url}`);
  return playOnPhp(phpLabFiles(lab, code), labRequest);
}

/** What "Vérifier mon correctif" says, check by check, for this version of the code. */
async function verify(lab: PhpLab, code: string): Promise<Record<string, boolean>> {
  const verdicts: Record<string, boolean> = {};
  for (const check of lab.checks ?? []) {
    if (check.kind !== "fixed") continue;
    verdicts[check.label] = checkExpectation(
      check.expect,
      await answerTo(lab, code, check.request),
    ).ok;
  }
  return verdicts;
}

/** Whether a request the learner might send satisfies a "seen" check. */
async function seenBy(lab: PhpLab, label: string, request: PhpRequestInput): Promise<boolean> {
  const check = lab.checks?.find((c) => c.kind === "seen" && c.label === label);
  if (check?.kind !== "seen") throw new Error(`pas de vérification « ${label} »`);
  return checkExpectation(check.expect, await answerTo(lab, lab.code, request)).ok;
}

const only = <T>(list: T[], what: string): T => {
  const [first] = list;
  if (list.length !== 1 || first === undefined) throw new Error(`${what} : ${String(list.length)}`);
  return first;
};

describe("« Le moteur de recherche du blog » (XSS)", async () => {
  const lab = only(await labsOf("03-xss.mdx"), "exercices PHP de 03-xss.mdx");
  const SEEN = "Une recherche a fait apparaître du code exécutable dans la page";
  const escaped = lab.code.replaceAll(
    "echo $q;",
    "echo htmlspecialchars($q, ENT_QUOTES, 'UTF-8');",
  );

  it("starts vulnerable: the page still serves, the attacks still work", async () => {
    const verdicts = await verify(lab, lab.code);
    expect(verdicts).toEqual({
      "Une balise piégée dans la recherche ne s'exécute plus": false,
      "Un guillemet ne permet plus de sortir de l'attribut value": false,
      "La recherche normale fonctionne toujours": true,
    });
  }, 60_000);

  it("is seen once a search injects code, and not by an honest one", async () => {
    expect(
      await seenBy(lab, SEEN, {
        method: "GET",
        url: "/search.php?q=%3Cscript%3Ealert(1)%3C/script%3E",
      }),
    ).toBe(true);
    expect(
      await seenBy(lab, SEEN, {
        method: "GET",
        url: "/search.php?q=%22%20autofocus%20onfocus%3D%22alert(1)",
      }),
    ).toBe(true);
    expect(await seenBy(lab, SEEN, { method: "GET", url: "/search.php?q=php" })).toBe(false);
  });

  it("is seen too when the learner types the payload as it reads, not encoded", async () => {
    expect(
      await seenBy(lab, SEEN, { method: "GET", url: "/search.php?q=<img src=x onerror=alert(1)>" }),
    ).toBe(true);
  });

  it("does not accept a fix of the text alone: the attribute is a second context", async () => {
    const half = lab.code.replace(
      "<p>Résultats pour : <?php echo $q; ?></p>",
      "<p>Résultats pour : <?php echo htmlspecialchars($q); ?></p>",
    );
    expect(half).not.toBe(lab.code);
    expect(await verify(lab, half)).toEqual({
      "Une balise piégée dans la recherche ne s'exécute plus": true,
      "Un guillemet ne permet plus de sortir de l'attribut value": false,
      "La recherche normale fonctionne toujours": true,
    });
  });

  it("accepts the fix that escapes both places", async () => {
    expect(escaped).not.toBe(lab.code);
    expect(Object.values(await verify(lab, escaped)).every(Boolean)).toBe(true);
  });

  it("accepts removing the tags in the text and escaping the attribute: both defend", async () => {
    const mixed = lab.code
      .replace(
        'value="<?php echo $q; ?>"',
        `value="<?php echo htmlspecialchars($q, ENT_QUOTES); ?>"`,
      )
      .replace(
        "<p>Résultats pour : <?php echo $q; ?></p>",
        "<p>Résultats pour : <?php echo strip_tags($q); ?></p>",
      );
    expect(Object.values(await verify(lab, mixed)).every(Boolean)).toBe(true);
  });

  it("reports a page that no longer runs as a failure of every check, not as a fix", async () => {
    // An error page holds no executable code: the checks must ask for the page too.
    const broken = `${lab.code}<?php this is not php`;
    const verdicts = await verify(lab, broken);
    expect(Object.values(verdicts).filter(Boolean)).toHaveLength(0);
  });
});

describe("« Les factures de la boutique » (accès aux données d'un autre)", async () => {
  const lab = only(await labsOf("05-controle-acces.mdx"), "exercices PHP de 05-controle-acces.mdx");
  const SEEN = "En étant Bob, vous avez lu la facture d'Alice";
  const BOB = "session=tok-bob";
  const guard = `if ($facture['proprietaire'] !== $user['id']) {
    http_response_code(403);
    exit('Accès refusé.');
}
?>
<h1>Facture`;
  const fixed = lab.code.replace("?>\n<h1>Facture", guard);

  it("starts vulnerable: honest requests are served, Bob can read Alice's invoices", async () => {
    expect(await verify(lab, lab.code)).toEqual({
      "Bob ne peut plus lire la facture n°1, celle d'Alice": false,
      "Ni la n°3, une autre facture d'Alice": false,
      "Alice ne peut pas lire celle de Bob": false,
      "Bob lit toujours sa propre facture": true,
      "Alice lit toujours les siennes": true,
      "Sans connexion, la porte reste fermée": true,
    });
  }, 60_000);

  it("is seen when Bob reads Alice's invoice, and not when Alice reads her own", async () => {
    expect(await seenBy(lab, SEEN, { method: "GET", url: "/invoice.php?id=1", cookie: BOB })).toBe(
      true,
    );
    expect(await seenBy(lab, SEEN, { method: "GET", url: "/invoice.php?id=2", cookie: BOB })).toBe(
      false,
    );
  });

  it("does not accept a fix that shuts one invoice only", async () => {
    const one = lab.code.replace(
      "?>\n<h1>Facture",
      "if ($id === 1) { http_response_code(403); exit('Accès refusé.'); }\n?>\n<h1>Facture",
    );
    const verdicts = await verify(lab, one);
    expect(verdicts["Bob ne peut plus lire la facture n°1, celle d'Alice"]).toBe(true);
    expect(verdicts["Ni la n°3, une autre facture d'Alice"]).toBe(false);
    expect(verdicts["Alice ne peut pas lire celle de Bob"]).toBe(false);
  });

  it("does not accept a fix that shuts everybody out", async () => {
    const nobody = lab.code.replace(
      "?>\n<h1>Facture",
      "http_response_code(403); exit('Accès refusé.');\n?>\n<h1>Facture",
    );
    const verdicts = await verify(lab, nobody);
    expect(verdicts["Bob lit toujours sa propre facture"]).toBe(false);
    expect(verdicts["Alice lit toujours les siennes"]).toBe(false);
  });

  it("accepts the owner check, whether it answers 403 or 404", async () => {
    expect(fixed).not.toBe(lab.code);
    expect(Object.values(await verify(lab, fixed)).every(Boolean)).toBe(true);
    const notFound = fixed.replace("403", "404");
    expect(Object.values(await verify(lab, notFound)).every(Boolean)).toBe(true);
  });

  it("shows the pages the exercise relies on, read-only", () => {
    expect(Object.keys(lab.support ?? {}).sort()).toEqual(["auth.php", "data.php"]);
    expect(lab.file).toBe("invoice.php");
  });
});
