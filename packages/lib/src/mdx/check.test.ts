import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkLessonMdx } from "./check.js";

/**
 * Asked before a lesson is saved: will it render?
 *
 * Both failures Sentry recorded on 22 September are here, written the way the
 * editor accepted them. Each one broke a lesson for everybody who opened it.
 */

describe("what renders", () => {
  it("accepts ordinary prose and headings", async () => {
    expect(await checkLessonMdx("Intro.\n\n## Une section\n\nDu texte.")).toEqual({ ok: true });
  });

  it("accepts components with well-formed props", async () => {
    const mdx =
      '## Quiz\n\n<Quiz id="q" question="?" options={["a", "b"]} correct={1} />\n\n' +
      '<PythonChallenge id="p" tests={[{ input: "f()", expected: "True" }]} />';
    expect(await checkLessonMdx(mdx)).toEqual({ ok: true });
  });

  it("accepts the Python lesson that is in the repository", async () => {
    // The file itself is fine; the copy in the database was edited into two
    // broken states. This keeps the good one pinned.
    const file = path.resolve(__dirname, "../../../../content/lessons/python/12-projet-cli.mdx");
    const body = readFileSync(file, "utf8").replace(/^---[\s\S]*?---\n/, "");
    expect(await checkLessonMdx(body)).toEqual({ ok: true });
  });

  it("does not run braces written in prose", async () => {
    // Prose expressions are stripped before evaluation, as on the page, so a
    // stray {True} in a sentence is not an error to report.
    expect(await checkLessonMdx("## S\n\nUn dict s'écrit {True} en prose.")).toEqual({ ok: true });
  });
});

describe("FindTheFlaw", () => {
  const flaw = (props: string): string =>
    `## Trouve la faille

<FindTheFlaw id="f" code={\`a = 1
b = a + input()\`} options={["Injection", "Rien"]} explanation="Parce que." ${props} />`;

  it("accepts an exercise whose line and answer exist", async () => {
    expect(await checkLessonMdx(flaw("line={2} correct={0}"))).toEqual({ ok: true });
  });

  it("refuses one pointing past the end of the code, and says so", async () => {
    const r = await checkLessonMdx(flaw("line={5} correct={0}"));
    if (r.ok) throw new Error("accepted line 5 of 2");
    expect(r.section).toBe("Trouve la faille");
    expect(r.message).toContain("Trouve la faille : line vaut 5");
  });

  it("refuses one whose answer is not an option", async () => {
    const r = await checkLessonMdx(flaw("line={2} correct={2}"));
    expect(r.ok).toBe(false);
  });
});

describe("PhishingEmail", () => {
  const mail = (clues: string): string =>
    '## La boîte\n\n<PhishingEmail id="p" fromName="Banque" fromAddress="a@b.co" subject="Urgent" body={["Bonjour.", "Payez."]} clues={' +
    clues +
    "} />";

  it("accepts a message whose clues point at its parts", async () => {
    expect(
      await checkLessonMdx(mail('[{ "part": "body-2", "why": "Une demande de paiement." }]')),
    ).toEqual({
      ok: true,
    });
  });

  it("refuses a clue on a part the message does not have, and says so", async () => {
    const r = await checkLessonMdx(mail('[{ "part": "link", "why": "Le lien." }]'));
    if (r.ok) throw new Error("accepted a clue on a missing link");
    expect(r.section).toBe("La boîte");
    expect(r.message).toContain("Boîte mail piégée : un indice vise link");
  });
});

describe("SqlPlayground and SqlInjectionLab", () => {
  const lab = (query: string): string =>
    '## Le formulaire\n\n<SqlInjectionLab id="l" schema={`CREATE TABLE users (id INTEGER, name TEXT);`} query="' +
    query +
    '" fields={[{ "name": "login", "label": "Identifiant" }]} goal="Entre." />';

  it("accepts a playground and a lab whose fields all reach the query", async () => {
    expect(
      await checkLessonMdx(
        '## Requêtes\n\n<SqlPlayground id="p" schema={`CREATE TABLE t (n INTEGER);`} expected={{ "rows": [[1]] }} />',
      ),
    ).toEqual({ ok: true });
    expect(await checkLessonMdx(lab("SELECT id FROM users WHERE name = '{login}'"))).toEqual({
      ok: true,
    });
  });

  it("refuses a lab field the query never uses, and says which", async () => {
    const r = await checkLessonMdx(lab("SELECT id FROM users"));
    if (r.ok) throw new Error("accepted a field with nowhere to go");
    expect(r.section).toBe("Le formulaire");
    expect(r.message).toContain("Laboratoire d'injection SQL : la requête n'a pas de {login}");
  });

  it("refuses a playground without its schema", async () => {
    const r = await checkLessonMdx('## Requêtes\n\n<SqlPlayground id="p" />');
    if (r.ok) throw new Error("accepted a playground without a schema");
    expect(r.message).toContain("Exercice SQL");
  });
});

describe("GitSandbox", () => {
  const sandbox = (setup: string): string =>
    `## Le dépôt\n\n<GitSandbox id="g" setup={${setup}} checks={[{ "label": "Propre", "expect": "clean" }]} />`;

  it("accepts a sandbox whose setup plays to the end", async () => {
    expect(
      await checkLessonMdx(sandbox('["git init", "echo \'a\' > a.txt", "git add ."]')),
    ).toEqual({ ok: true });
  });

  it("refuses a setup line that fails, and says which and why", async () => {
    const r = await checkLessonMdx(sandbox('["git init", "git commit -m \\"vide\\""]'));
    if (r.ok) throw new Error("accepted a setup that fails");
    expect(r.section).toBe("Le dépôt");
    expect(r.message).toContain(
      'Bac à sable Git : la commande de préparation « git commit -m "vide" » échoue (On branch main).',
    );
  });

  it("refuses a check the sandbox does not know", async () => {
    const r = await checkLessonMdx(
      '## Le dépôt\n\n<GitSandbox id="g" checks={[{ "label": "x", "expect": "tidy" }]} />',
    );
    if (r.ok) throw new Error("accepted an unknown check");
    expect(r.message).toContain("Bac à sable Git");
  });
});

describe("PhotoOsint", () => {
  const photo = (src: string): string =>
    `## La photo

<PhotoOsint id="p" src="${src}" alt="Un lac." task="Trouve le lieu." answer={{ "latitude": 45.9, "longitude": 6.1 }} place="Annecy" />`;

  it("accepts a photo shipped with the site", async () => {
    expect(await checkLessonMdx(photo("/osint/lac-de-montagne.jpg"))).toEqual({ ok: true });
  });

  it("refuses a photo from elsewhere, and says where one goes", async () => {
    const r = await checkLessonMdx(photo("https://example.org/photo.jpg"));
    if (r.ok) throw new Error("accepted a photo from elsewhere");
    expect(r.section).toBe("La photo");
    expect(r.message).toContain("Exercice OSINT : src : la photo est un .jpg de public/osint");
  });
});

describe("NetworkLab", () => {
  const lab = (links: string): string =>
    `## Le réseau

<NetworkLab id="n" task="Relie." devices={[{ "id": "pc1", "kind": "pc", "name": "PC1", "x": 0, "y": 0, "addresses": { "eth0": "192.168.1.10/24" } }, { "id": "sw1", "kind": "switch", "name": "SW1", "x": 100, "y": 0 }]} links={${links}} />`;

  it("accepts a network whose cables join devices that exist", async () => {
    expect(await checkLessonMdx(lab('[["pc1", "sw1"]]'))).toEqual({ ok: true });
  });

  it("refuses a cable to a device that does not exist, and says which", async () => {
    const r = await checkLessonMdx(lab('[["pc1", "r9"]]'));
    if (r.ok) throw new Error("accepted a cable to nowhere");
    expect(r.section).toBe("Le réseau");
    expect(r.message).toContain(
      "Atelier réseau : le câble pc1 - r9 relie un appareil qui n'existe pas.",
    );
  });
});

describe("PhpLab", () => {
  const lab = (props: string): string =>
    `## Le serveur

<PhpLab id="p" task="Corrige." code={\`<?php echo 1;\`} ${props} />`;

  it("accepts a lab whose pages and checks are well-formed", async () => {
    expect(
      await checkLessonMdx(
        lab(
          'file="page.php" support={{ "lib/data.php": `<?php return [];` }} requests={[{ "label": "Voir", "url": "/page.php" }]} checks={[{ "kind": "fixed", "label": "Répond", "request": { "url": "/page.php" }, "expect": { "status": 200 } }]}',
        ),
      ),
    ).toEqual({ ok: true });
  });

  it("refuses a page that is not a PHP file of the lab, and says which prop", async () => {
    const r = await checkLessonMdx(lab('file="../page.php"'));
    if (r.ok) throw new Error("accepted a path leaving the lab");
    expect(r.section).toBe("Le serveur");
    expect(r.message).toContain("Laboratoire PHP : file : chemin de page invalide");
  });

  it("refuses a page that names the bridge to JavaScript", async () => {
    const r = await checkLessonMdx(
      '## Le serveur\n\n<PhpLab id="p" task="Corrige." code={`<?php $v = new Vrzno();`} />',
    );
    if (r.ok) throw new Error("accepted the Vrzno bridge");
    expect(r.message).toContain("Laboratoire PHP : index.php nomme Vrzno");
  });

  it("refuses a check that expects nothing", async () => {
    const r = await checkLessonMdx(
      lab('checks={[{ "kind": "seen", "label": "Rien", "expect": {} }]}'),
    );
    if (r.ok) throw new Error("accepted an empty expectation");
    expect(r.message).toContain("Laboratoire PHP : une attente vide");
  });
});

describe("SubnetDrill", () => {
  it("accepts a drill with its kinds and prefixes, and one with nothing but an id", async () => {
    expect(
      await checkLessonMdx(
        '## Calculs\n\n<SubnetDrill id="s" kinds={["hosts", "network"]} prefixes={{ "min": 24, "max": 28 }} count={6} />',
      ),
    ).toEqual({ ok: true });
    expect(await checkLessonMdx('## Calculs\n\n<SubnetDrill id="s" />')).toEqual({ ok: true });
  });

  it("refuses a prefix no question can be asked on, and says which", async () => {
    const r = await checkLessonMdx(
      '## Calculs\n\n<SubnetDrill id="s" prefixes={{ "min": 24, "max": 32 }} />',
    );
    if (r.ok) throw new Error("accepted a /32");
    expect(r.section).toBe("Calculs");
    expect(r.message).toContain("Calcul de sous-réseaux : prefixes.max : ");
  });

  it("refuses cutting a network with a single prefix to draw", async () => {
    const r = await checkLessonMdx(
      '## Calculs\n\n<SubnetDrill id="s" kinds={["subnets"]} prefixes={{ "min": 26, "max": 26 }} />',
    );
    if (r.ok) throw new Error("accepted a cut with one prefix");
    expect(r.message).toContain("Calcul de sous-réseaux : découper un réseau (subnets)");
  });
});

describe("PacketDissector", () => {
  const dissector = (frame: string, find = ""): string =>
    `## La trame\n\n<PacketDissector id="p" frame={${frame}} ${find} />`;
  const SYN =
    '{ "eth": { "src": "08:00:27:4e:66:a1", "dst": "00:0c:29:1a:2b:3c" }, "ip": { "src": "192.168.1.42", "dst": "93.184.216.34" }, "tcp": { "sport": 50324, "dport": 443, "flags": ["SYN"] } }';

  it("accepts a frame it can write, and the fields it has to find", async () => {
    expect(await checkLessonMdx(dissector(SYN, 'find={["ip.dst", "tcp.flags"]}'))).toEqual({
      ok: true,
    });
  });

  it("refuses a field to find that the frame does not have, and names it", async () => {
    const r = await checkLessonMdx(dissector(SYN, 'find={["udp.len", "arp.op"]}'));
    if (r.ok) throw new Error("accepted fields the frame has not");
    expect(r.section).toBe("La trame");
    expect(r.message).toBe(
      "Décortiquer un paquet : find nomme « udp.len », « arp.op », que cette trame n'a pas.",
    );
  });

  it("refuses a frame with nothing above Ethernet", async () => {
    const r = await checkLessonMdx(
      dissector('{ "eth": { "src": "08:00:27:4e:66:a1", "dst": "00:0c:29:1a:2b:3c" } }'),
    );
    if (r.ok) throw new Error("accepted an empty frame");
    expect(r.message).toContain("Décortiquer un paquet : une trame porte arp ou ip");
  });
});

describe("PutInOrder and MatchPairs", () => {
  it("accepts an order and pairs that are well-formed", async () => {
    expect(
      await checkLessonMdx(
        '## Les couches\n\n<PutInOrder id="o" task="De bas en haut." items={["Physique", "Liaison", "Réseau"]} explanation="Parce que." />\n\n<MatchPairs id="m" task="Chaque port à son service." pairs={[{ "left": "22", "right": "SSH" }, { "left": "53", "right": "DNS" }, { "left": "80", "right": "HTTP" }]} />',
      ),
    ).toEqual({ ok: true });
  });

  it("refuses an item written twice, and says so", async () => {
    const r = await checkLessonMdx(
      '## Les couches\n\n<PutInOrder id="o" task="De bas en haut." items={["Physique", "Liaison", "Physique"]} />',
    );
    if (r.ok) throw new Error("accepted a repeated item");
    expect(r.section).toBe("Les couches");
    expect(r.message).toBe(
      "Dans l'ordre : items répète « Physique » : deux éléments identiques n'ont pas d'ordre.",
    );
  });

  it("refuses pairs whose right side repeats, and names the column", async () => {
    const r = await checkLessonMdx(
      '## Les ports\n\n<MatchPairs id="m" task="Associe." pairs={[{ "left": "80", "right": "HTTP" }, { "left": "8080", "right": "HTTP" }, { "left": "22", "right": "SSH" }]} />',
    );
    if (r.ok) throw new Error("accepted a repeated right side");
    expect(r.message).toContain("Associe : pairs répète « HTTP » à droite");
  });
});

describe("CryptoWorkshop", () => {
  it("accepts a bench with its tools and its challenge", async () => {
    expect(
      await checkLessonMdx(
        '## Le XOR\n\n<CryptoWorkshop id="w" tools={["xor", "hex"]} input="BONJOUR" challenge={{ "ciphertext": "68 65", "answer": "BO" }} />',
      ),
    ).toEqual({ ok: true });
  });

  it("refuses a tool it does not have, and says so", async () => {
    const r = await checkLessonMdx('## Le XOR\n\n<CryptoWorkshop id="w" tools={["rot13"]} />');
    if (r.ok) throw new Error("accepted an unknown tool");
    expect(r.section).toBe("Le XOR");
    expect(r.message).toContain("Atelier crypto : tools.0 : ");
  });
});

describe("FirewallLab", () => {
  const lab = (rules: string): string =>
    `## Le pare-feu\n\n<FirewallLab id="f" task="Ferme." rules={\`${rules}\`} probes={[{ "label": "Un visiteur ouvre le site", "proto": "tcp", "from": "203.0.113.5", "port": 443, "expect": "accept" }]} />`;

  it("accepts a lab whose starting rules read", async () => {
    expect(await checkLessonMdx(lab("policy accept\naccept tcp port 22"))).toEqual({ ok: true });
  });

  it("refuses starting rules it cannot read, with the line", async () => {
    const r = await checkLessonMdx(lab("policy accept\nallow tcp port 22"));
    if (r.ok) throw new Error("accepted an unreadable rule");
    expect(r.section).toBe("Le pare-feu");
    expect(r.message).toContain(
      "Pare-feu : les règles de départ, ligne 2 : je ne connais pas « allow »",
    );
  });

  it("refuses a packet without its port", async () => {
    const r = await checkLessonMdx(
      '## Le pare-feu\n\n<FirewallLab id="f" task="Ferme." probes={[{ "label": "a", "proto": "tcp", "from": "203.0.113.5", "expect": "accept" }]} />',
    );
    if (r.ok) throw new Error("accepted a tcp packet without a port");
    expect(r.message).toBe("Pare-feu : un paquet tcp vise un port : donne-le.");
  });
});

describe("LogHunt", () => {
  const hunt = (events: string): string =>
    `## Les journaux

<LogHunt id="h" task="Trouve l'attaquant." events={${events}} questions={[{ "label": "Quelle adresse ?", "answer": "203.0.113.9" }]} />`;

  it("accepts a hunt with its events and questions", async () => {
    expect(
      await checkLessonMdx(
        hunt(
          '[{ "time": "2026-01-10 03:14:02", "source": "sshd", "ip": "203.0.113.9", "user": "deploy", "action": "Accepted password" }]',
        ),
      ),
    ).toEqual({ ok: true });
  });

  it("refuses a time written wrong, and names the event", async () => {
    const r = await checkLessonMdx(
      hunt('[{ "time": "10/01 03:14", "source": "sshd", "action": "Accepted password" }]'),
    );
    if (r.ok) throw new Error("accepted a bad time");
    expect(r.section).toBe("Les journaux");
    expect(r.message).toContain("Chasse dans les logs : events.0.time : ");
  });

  it("refuses a hunt without any event", async () => {
    const r = await checkLessonMdx(hunt("[]"));
    if (r.ok) throw new Error("accepted an empty hunt");
    expect(r.message).toBe(
      "Chasse dans les logs : il faut des événements : events, series, ou les deux.",
    );
  });
});

describe("what does not - the two Sentry cases", () => {
  it("refuses a Python True inside a component's props (JAVASCRIPT-NEXTJS-14)", async () => {
    const r = await checkLessonMdx(
      '## à toi de jouer\n\n<PythonChallenge id="p" tests={[{ input: "f()", expected: True }]} />',
    );
    expect(r.ok).toBe(false);
  });

  it("says which section, and what to write instead", async () => {
    const r = await checkLessonMdx(
      'Intro.\n\n## à toi de jouer\n\n<PythonChallenge id="p" tests={[{ input: "f()", expected: True }]} />',
    );
    if (r.ok) throw new Error("accepted True");
    expect(r.section).toBe("à toi de jouer");
    expect(r.message).toContain("true");
    expect(r.message).toContain('"True"');
  });

  it("refuses a dictionary where the challenge wants text (JAVASCRIPT-NEXTJS-15)", async () => {
    const r = await checkLessonMdx(
      '## à toi de jouer\n\n<PythonChallenge id="p" tests={[{ input: "f()", expected: { titre: "x", fait: false } }]} />',
    );
    if (r.ok) throw new Error("accepted an object");
    expect(r.message).toContain("Défi Python");
    expect(r.message).toContain("Test 1");
  });

  it("finds a challenge nested inside another component", async () => {
    const r = await checkLessonMdx(
      '## S\n\n<Callout>\n\n<PythonChallenge id="p" tests={[{ input: "f()", expected: [1] }]} />\n\n</Callout>',
    );
    expect(r.ok).toBe(false);
  });
});

describe("what does not - everything else", () => {
  it("refuses MDX that does not compile", async () => {
    const r = await checkLessonMdx("## S\n\n<Quiz options={[ />");
    expect(r.ok).toBe(false);
  });

  it("refuses a name that does not exist", async () => {
    const r = await checkLessonMdx("## S\n\n<Quiz correct={reponse} />");
    if (r.ok) throw new Error("accepted an undefined name");
    expect(r.message).toContain("reponse");
  });

  it("names the introduction when the fault is before the first heading", async () => {
    const r = await checkLessonMdx("<Quiz correct={True} />\n\n## Suite\n\nOk.");
    if (r.ok) throw new Error("accepted True");
    expect(r.section).toBe("introduction");
  });

  it("stops at the first broken section, which is the one to fix", async () => {
    const r = await checkLessonMdx(
      "## A\n\n<Quiz correct={True} />\n\n## B\n\n<Quiz correct={None} />",
    );
    if (r.ok) throw new Error("accepted True");
    expect(r.section).toBe("A");
  });
});

describe("a hostile heading", () => {
  it("names a section quickly however much whitespace follows its ##", async () => {
    // The input CodeQL flagged: a regex took polynomial time on it.
    const start = performance.now();
    const r = await checkLessonMdx(`## ${"\t".repeat(50_000)}titre\n\n<Quiz correct={True} />`);
    expect(performance.now() - start).toBeLessThan(2_000);
    if (r.ok) throw new Error("accepted True");
    expect(r.section).toBe("titre");
  });
});

describe("braces hold values, never code", () => {
  // The first version of this check evaluated whatever an author put between
  // braces, on the server, and returned what it threw as the error message.
  // These two lessons read an environment variable through it.
  const SECRET = "check-must-not-read-this";

  function withSecret<T>(run: () => Promise<T>): Promise<T> {
    process.env.CL_TEST_SECRET = SECRET;
    return run().finally(() => {
      delete process.env.CL_TEST_SECRET;
    });
  }

  it("does not run an attribute written as code, nor echo what it would throw", async () => {
    const r = await withSecret(() =>
      checkLessonMdx(
        "## S\n\n<Callout title={(() => { throw new Error(process.env.CL_TEST_SECRET) })()}>x</Callout>",
      ),
    );
    if (r.ok) throw new Error("accepted code");
    expect(r.message).not.toContain(SECRET);
    expect(r.message).toContain("title");
  });

  it("drops an export instead of running it as the module loads", async () => {
    const r = await withSecret(() =>
      checkLessonMdx(
        "## S\n\nexport const x = (() => { throw new Error(process.env.CL_TEST_SECRET) })()\n\nDu texte.",
      ),
    );
    expect(r).toEqual({ ok: true });
  });

  it("drops an import", async () => {
    expect(await checkLessonMdx('## S\n\nimport fs from "node:fs"\n\nDu texte.')).toEqual({
      ok: true,
    });
  });

  it.each([
    ["a call", '<Quiz options={["a"].map((x) => x)} correct={0} />'],
    ["an operator", "<Quiz correct={1 + 0} />"],
    ["a template with ${}", "<CodePlayground starterCode={`${1}`} />"],
    ["a spread attribute", "<Quiz {...{ correct: 1 }} />"],
    ["a spread in a list", '<Quiz options={[..."ab"]} />'],
    ["a shorthand key", "<PythonChallenge tests={[{ input }]} />"],
    ["a computed key", '<PythonChallenge tests={[{ ["input"]: "f()" }]} />'],
    ["a member tag", "<process.exit />"],
    ["an arrow function", "<Quiz correct={() => 1} />"],
  ])("refuses %s", async (_label, component) => {
    const r = await checkLessonMdx(`## S\n\n${component}`);
    expect(r.ok).toBe(false);
  });

  it.each([
    ["text", '<Quiz id="q" question={"Qu\'est-ce ?"} options={["a", "b"]} correct={0} />'],
    ["a negative number", "<Callout offset={-1}>x</Callout>"],
    ["booleans and null", "<CodePlayground validate={true} expectedOutput={null} />"],
    ["a template without ${}", "<CodePlayground starterCode={`print(1)\n\\${montre}`} />"],
    [
      "nested lists and objects",
      '<PythonChallenge id="p" tests={[{ input: "f()", expected: "1" }]} />',
    ],
  ])("accepts %s", async (_label, component) => {
    expect(await checkLessonMdx(`## S\n\n${component}`)).toEqual({ ok: true });
  });

  it("still tells a Python author what to write instead of True", async () => {
    const r = await checkLessonMdx("## S\n\n<Quiz correct={False} />");
    if (r.ok) throw new Error("accepted False");
    expect(r.message).toContain("false");
    expect(r.message).toContain('"False"');
  });
});
