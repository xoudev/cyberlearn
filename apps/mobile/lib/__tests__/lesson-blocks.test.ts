import { describe, expect, it } from "vitest";
import { parseLesson } from "../lesson-blocks";

describe("parseLesson", () => {
  it("preserves native block order across lesson sections", () => {
    const lesson = parseLesson(`
## Comprendre

Premier paragraphe.

<Callout type="warning">Reste vigilant.</Callout>

\`\`\`ts
const safe = true;
\`\`\`

## Vérifier

- Un
- Deux
`);

    expect(lesson.sections).toHaveLength(2);
    expect(lesson.sections[0]?.title).toBe("Comprendre");
    expect(lesson.sections[0]?.blocks.map((block) => block.kind)).toEqual([
      "paragraph",
      "callout",
      "code",
    ]);
    expect(lesson.sections[1]?.blocks[0]).toEqual({
      kind: "list",
      ordered: false,
      items: ["Un", "Deux"],
    });
  });

  it("extracts quizzes for the native result flow", () => {
    const lesson = parseLesson(`
## Quiz

<Quiz id="q-1" question="Port sécurisé ?" options={["80","443"]} correct={1} />
`);

    expect(lesson.quizzes).toEqual([
      {
        kind: "quiz",
        id: "q-1",
        question: "Port sécurisé ?",
        options: ["80", "443"],
        correct: 1,
        explanation: null,
      },
    ]);
  });

  it("keeps a quiz's explanation, to show once it is answered", () => {
    const lesson = parseLesson(`
## Quiz

<Quiz id="q-1"
  question="Port sécurisé ?"
  options={["80", "443"]}
  correct={1}
  explanation="HTTPS écoute sur le port 443, HTTP sur le \\"80\\"."
/>
`);
    expect(lesson.quizzes[0]?.explanation).toBe('HTTPS écoute sur le port 443, HTTP sur le "80".');
  });

  it("keeps web-only media visible as labelled placeholders", () => {
    const lesson = parseLesson(`
## Observer

<LessonVideo src="/demo.mp4" />
<Diagram />
`);

    expect(lesson.sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Vidéo" },
      { kind: "placeholder", label: "Diagramme" },
    ]);
  });

  it("reads a real Linux terminal as the card of what to type", () => {
    const lesson = parseLesson(`
## Pratiquer

<LinuxTerminal title="Tes premiers droits" files={{ "notes.txt": "a" }} expectedCommands={["ls -l", "chmod 600 notes.txt"]} hints={["ls -l montre les droits."]} />
`);

    expect(lesson.sections[0]?.blocks).toEqual([
      {
        kind: "terminal",
        title: "Tes premiers droits",
        commands: ["ls -l", "chmod 600 notes.txt"],
        hints: ["ls -l montre les droits."],
      },
    ]);
  });

  it("keeps the time limit of a timed terminal, such as a practical exam", () => {
    const lesson = parseLesson(`
## L'épreuve

<LinuxTerminal title="L'épreuve pratique" timeLimitMinutes={30} checks={[{ "label": "a", "path": "a", "expect": "file" }]} hints={["Module 4."]} />
`);

    expect(lesson.sections[0]?.blocks).toEqual([
      {
        kind: "terminal",
        title: "L'épreuve pratique",
        commands: [],
        hints: ["Module 4."],
        timeLimitMinutes: 30,
      },
    ]);
  });

  it("shows the code of a playground written as starterCode", () => {
    const lesson = parseLesson(
      [
        "## Essayer",
        "",
        '<CodePlayground language="python" starterCode={`if a > b:',
        '    print("a")',
        "\\tprint(\\`b\\`)`} />",
        "",
        "Suite du texte.",
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks).toEqual([
      { kind: "playground", lang: "python", code: 'if a > b:\n    print("a")\n\tprint(`b`)' },
      { kind: "paragraph", text: "Suite du texte." },
    ]);
  });

  it("takes the list's indent off the code, not the code's own", () => {
    const lesson = parseLesson(
      [
        "## Essayer",
        "",
        "- Lance ceci :",
        "",
        '  <CodePlayground language="python" starterCode={`for i in range(3):',
        "      print(i)`} />",
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks[1]).toEqual({
      kind: "playground",
      lang: "python",
      code: "for i in range(3):\n    print(i)",
    });
  });

  it("shows a Python challenge: statement, starting code and tests", () => {
    const lesson = parseLesson(
      [
        "## Le défi",
        "",
        '<PythonChallenge id="py-1" title="Somme" description="Renvoie la somme, l\'entier n compris." starterCode="def solution(n):',
        '    pass" tests={[{ input: "solution(5)", expected: "15" }, { input: "solution({0: 1}[0])", expected: "1", label: "Cas \\"limite\\"" }]} />',
        "",
        "Après le défi.",
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks).toEqual([
      {
        kind: "challenge",
        title: "Somme",
        description: "Renvoie la somme, l'entier n compris.",
        code: "def solution(n):\n    pass",
        tests: [
          { input: "solution(5)", expected: "15", label: null },
          { input: "solution({0: 1}[0])", expected: "1", label: 'Cas "limite"' },
        ],
      },
      { kind: "paragraph", text: "Après le défi." },
    ]);
  });

  it("still reads a playground written with its code as children", () => {
    const lesson = parseLesson(
      [
        "## Essayer",
        "",
        '<CodePlayground language="javascript" starterCode={`a`} />',
        "",
        '<CodePlayground language="python">',
        "print(1)",
        "</CodePlayground>",
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks).toEqual([
      { kind: "playground", lang: "javascript", code: "a" },
      { kind: "playground", lang: "python", code: "print(1)" },
    ]);
  });
});

describe("FindTheFlaw", () => {
  it("is played in the app with the props the site reads", () => {
    const lesson = parseLesson(
      [
        "## Trouve la faille",
        "",
        '<FindTheFlaw id="f1" title="Connexion" language="python" code={`',
        'query = "SELECT * FROM users WHERE name = \'" + name + "\'"',
        "cursor.execute(query)",
        '`} line={1} options={["Injection SQL", "XSS"]} correct={0} explanation="La requête colle l\'entrée." hint="Regarde la requête." />',
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks).toEqual([
      {
        kind: "flaw",
        flaw: {
          id: "f1",
          title: "Connexion",
          language: "python",
          code: '\nquery = "SELECT * FROM users WHERE name = \'" + name + "\'"\ncursor.execute(query)\n',
          line: 1,
          options: ["Injection SQL", "XSS"],
          correct: 0,
          explanation: "La requête colle l'entrée.",
          hint: "Regarde la requête.",
        },
      },
    ]);
  });

  it("shows a placeholder for an exercise the site would refuse", () => {
    const lesson = parseLesson(
      '## T\n\n<FindTheFlaw id="f" code={`a = 1`} line={4} options={["a", "b"]} correct={0} explanation="x" />',
    );
    expect(lesson.sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Trouve la faille" },
    ]);
  });
});

describe("PhishingEmail", () => {
  const MAIL = [
    "## La boîte",
    "",
    "<PhishingEmail",
    '  id="ph"',
    '  fromName="DGFiP"',
    '  fromAddress="remboursement@impots-gouv-fr.net"',
    '  subject="Remboursement en attente"',
    '  body={["Bonjour,", "Confirmez vos coordonnées."]}',
    '  linkText="Confirmer"',
    '  linkUrl="http://impots.gouv.fr.remboursement-dgfip.net/c"',
    '  clues={[{ "part": "sender", "why": "Un faux domaine." }, { "part": "link", "why": "Le vrai domaine, ici : remboursement-dgfip.net." }]}',
    '  conclusion="Signale-le."',
    "/>",
  ].join("\n");

  it("is played in the app with the props the site reads", () => {
    expect(parseLesson(MAIL).sections[0]?.blocks).toEqual([
      {
        kind: "phishing",
        mail: {
          id: "ph",
          fromName: "DGFiP",
          fromAddress: "remboursement@impots-gouv-fr.net",
          subject: "Remboursement en attente",
          body: ["Bonjour,", "Confirmez vos coordonnées."],
          linkText: "Confirmer",
          linkUrl: "http://impots.gouv.fr.remboursement-dgfip.net/c",
          clues: [
            { part: "sender", why: "Un faux domaine." },
            { part: "link", why: "Le vrai domaine, ici : remboursement-dgfip.net." },
          ],
          conclusion: "Signale-le.",
        },
      },
    ]);
  });

  it("shows a placeholder when the clues are not written as JSON", () => {
    const unquoted = MAIL.replace(/"part"/g, "part").replace(/"why"/g, "why");
    expect(parseLesson(unquoted).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Boîte mail piégée" },
    ]);
  });
});

describe("SqlPlayground and SqlInjectionLab", () => {
  it("shows what to practise and the query, the database staying on the site", () => {
    const lesson = [
      "## Requêtes",
      "",
      "<SqlPlayground",
      '  id="p"',
      '  title="Une page produit"',
      "  schema={`CREATE TABLE products (id INTEGER);`}",
      '  starterQuery="SELECT name FROM products WHERE id = 10"',
      '  task="Greffe un UNION."',
      "/>",
      "",
      "<SqlInjectionLab",
      '  id="l"',
      "  schema={`CREATE TABLE users (id INTEGER);`}",
      "  query=\"SELECT id FROM users WHERE username = '{login}'\"",
      '  fields={[{ "name": "login", "label": "Identifiant" }]}',
      '  goal="Entre sans mot de passe."',
      "/>",
    ].join("\n");
    expect(parseLesson(lesson).sections[0]?.blocks).toEqual([
      {
        kind: "sql",
        lab: false,
        title: "Une page produit",
        task: "Greffe un UNION.",
        query: "SELECT name FROM products WHERE id = 10",
      },
      {
        kind: "sql",
        lab: true,
        title: null,
        task: "Entre sans mot de passe.",
        query: "SELECT id FROM users WHERE username = '{login}'",
      },
    ]);
  });
});

describe("GitSandbox", () => {
  const SANDBOX = [
    "## Le cycle",
    "",
    "<GitSandbox",
    '  id="cycle"',
    '  title="Le cycle d\'un commit"',
    '  setup={["git init", "echo \'<h1>Mon site</h1>\' > index.html", "git commit -m \\"vide\\""]}',
    '  task="Enregistre index.html."',
    '  checks={[{"label": "Le commit est dans main", "expect": "commit", "branch": "main", "message": "add"}, {"label": "Propre", "expect": "clean"}]}',
    '  hints={["git add index.html", "git commit -m \\"add\\""]}',
    "/>",
  ].join("\n");

  it("is played in the app with the props the site reads", () => {
    expect(parseLesson(SANDBOX).sections[0]?.blocks).toEqual([
      {
        kind: "git",
        sandbox: {
          id: "cycle",
          title: "Le cycle d'un commit",
          setup: ["git init", "echo '<h1>Mon site</h1>' > index.html", 'git commit -m "vide"'],
          task: "Enregistre index.html.",
          checks: [
            {
              label: "Le commit est dans main",
              expect: "commit",
              branch: "main",
              message: "add",
            },
            { label: "Propre", expect: "clean" },
          ],
          hints: ["git add index.html", 'git commit -m "add"'],
        },
      },
    ]);
  });

  it("shows a placeholder for a check the site would refuse", () => {
    const wrong = SANDBOX.replace('"expect": "clean"', '"expect": "tidy"');
    expect(parseLesson(wrong).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Bac à sable Git" },
    ]);
  });
});

describe("PhotoOsint", () => {
  it("shows what to look for; the metadata and the map stay on the site", () => {
    const lesson = [
      "## La photo",
      "",
      "<PhotoOsint",
      '  id="p"',
      '  title="Une légende à vérifier"',
      '  src="/osint/quais-inondes.jpg"',
      '  alt="Des quais."',
      '  caption="Inondations à Marseille, hier."',
      '  task="Lis les métadonnées, puis place le lieu."',
      '  answer={{ "latitude": 45.7623, "longitude": 4.827 }}',
      '  place="Lyon"',
      "/>",
    ].join("\n");
    expect(parseLesson(lesson).sections[0]?.blocks).toEqual([
      {
        kind: "osint",
        title: "Une légende à vérifier",
        task: "Lis les métadonnées, puis place le lieu.",
        caption: "Inondations à Marseille, hier.",
      },
    ]);
  });
});

describe("NetworkLab", () => {
  it("shows the task and the devices; the canvas and the ping stay on the site", () => {
    const lesson = [
      "## Le réseau",
      "",
      "<NetworkLab",
      '  id="n"',
      '  title="Deux réseaux, un routeur"',
      '  task="Donne une passerelle à chaque PC."',
      '  devices={[{"id": "pc1", "kind": "pc", "name": "PC1", "x": 40, "y": 200}, {"id": "r1", "kind": "router", "name": "R1", "x": 300, "y": 30, "addresses": {"eth0": "192.168.1.1/24"}, "routes": [{"to": "0.0.0.0/0", "via": "10.0.0.2"}]}, {"id": "sw1", "kind": "switch", "name": "SW1", "x": 170, "y": 100}]}',
      '  links={[["pc1", "sw1"], ["sw1", "r1"]]}',
      '  checks={[{"label": "PC1 joint R1", "expect": "ping", "from": "PC1", "to": "R1"}]}',
      "/>",
    ].join("\n");
    expect(parseLesson(lesson).sections[0]?.blocks).toEqual([
      {
        kind: "network",
        title: "Deux réseaux, un routeur",
        task: "Donne une passerelle à chaque PC.",
        devices: ["PC1 (PC)", "R1 (routeur)", "SW1 (switch)"],
      },
    ]);
  });
});

describe("PhpLab", () => {
  const LAB = [
    "## Le serveur",
    "",
    "<PhpLab",
    '  id="idor"',
    '  title="Les factures de la boutique"',
    '  task="Lisez la facture d\'une autre cliente, puis corrigez le code."',
    '  file="invoice.php"',
    "  code={`<?php",
    "$id = (int) ($_GET['id'] ?? 0);",
    "if ($id > 1) { echo $id; }",
    "?>`}",
    '  support={{ "auth.php": `<?php $title = "Admin"; $file = "x.php"; $code = "y";` }}',
    '  requests={[{"label": "Bob lit sa facture", "url": "/invoice.php?id=2", "cookie": "session=tok-bob"}]}',
    '  checks={[{"kind": "seen", "label": "Vu", "expect": {"status": 200}}]}',
    "/>",
  ].join("\n");

  it("shows the task and the page; the PHP stays on the site", () => {
    expect(parseLesson(LAB).sections[0]?.blocks).toEqual([
      {
        kind: "php",
        title: "Les factures de la boutique",
        task: "Lisez la facture d'une autre cliente, puis corrigez le code.",
        file: "invoice.php",
        code: "<?php\n$id = (int) ($_GET['id'] ?? 0);\nif ($id > 1) { echo $id; }\n?>",
      },
    ]);
  });

  it("takes index.php for the file when the lab names none", () => {
    const unnamed = LAB.replace('  file="invoice.php"\n', "");
    expect(parseLesson(unnamed).sections[0]?.blocks[0]).toMatchObject({
      kind: "php",
      file: "index.php",
    });
  });

  it("does not read the support pages for props of the lab, wherever they are written", () => {
    // `$title = "Admin"` in a support page is PHP, not the title of the exercise.
    const supportFirst = [
      "<PhpLab",
      '  support={{ "auth.php": `<?php $title = "Admin"; $file = "x.php"; $code = "y"; $task = "z";` }}',
      '  id="idor"',
      '  title="Les factures"',
      '  task="Corrigez."',
      '  file="invoice.php"',
      "  code={`<?php echo 1;`}",
      "/>",
    ].join("\n");
    expect(parseLesson(`## A\n\n${supportFirst}`).sections[0]?.blocks).toEqual([
      {
        kind: "php",
        title: "Les factures",
        task: "Corrigez.",
        file: "invoice.php",
        code: "<?php echo 1;",
      },
    ]);
  });

  it("shows a placeholder for a lab without a page", () => {
    const noCode = ["## A", "", '<PhpLab id="x" title="Sans page" task="Rien." />'].join("\n");
    expect(parseLesson(noCode).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Site vulnérable" },
    ]);
  });

  it("keeps the text around the lab, and the one after it", () => {
    const lesson = `## Serveur\n\nAvant.\n\n${LAB.split("\n").slice(2).join("\n")}\n\nAprès.`;
    const kinds = parseLesson(lesson).sections[0]?.blocks.map((b) => b.kind);
    expect(kinds).toEqual(["paragraph", "php", "paragraph"]);
  });
});

describe("SubnetDrill", () => {
  const DRILL = [
    "## Les calculs",
    "",
    "<SubnetDrill",
    '  id="drill"',
    '  title="Pose le calcul"',
    '  task="Deux essais."',
    '  kinds={["hosts", "same-subnet"]}',
    '  prefixes={{ "min": 24, "max": 28 }}',
    "  count={6}",
    "/>",
  ].join("\n");

  it("is played in the app with the props the site reads", () => {
    expect(parseLesson(DRILL).sections[0]?.blocks).toEqual([
      {
        kind: "subnet",
        drill: {
          id: "drill",
          title: "Pose le calcul",
          task: "Deux essais.",
          kinds: ["hosts", "same-subnet"],
          prefixes: { min: 24, max: 28 },
          count: 6,
        },
      },
    ]);
  });

  it("fills in what the lesson leaves out, as the site does", () => {
    const bare = '## A\n\n<SubnetDrill id="drill" />';
    expect(parseLesson(bare).sections[0]?.blocks[0]).toMatchObject({
      kind: "subnet",
      drill: { prefixes: { min: 24, max: 30 }, count: 5 },
    });
  });

  it("shows a placeholder for a drill the site would refuse", () => {
    const wrong = DRILL.replace('"max": 28', '"max": 32');
    expect(parseLesson(wrong).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Calcul de sous-réseaux" },
    ]);
  });
});

describe("PacketDissector", () => {
  const FRAME = [
    "## La trame",
    "",
    "<PacketDissector",
    '  id="syn"',
    '  title="Le SYN, octet par octet"',
    '  task="Retrouve les ports."',
    '  frame={{ "eth": { "src": "08:00:27:4e:66:a1", "dst": "00:0c:29:1a:2b:3c" }, "ip": { "src": "192.168.1.42", "dst": "93.184.216.34" }, "tcp": { "sport": 50324, "dport": 443, "flags": ["SYN"] }, "payload": "GET / HTTP/1.1\\r\\n" }}',
    '  find={["tcp.sport", "tcp.dport"]}',
    "/>",
  ].join("\n");

  it("is played in the app with the frame the site builds", () => {
    const [block] = parseLesson(FRAME).sections[0]?.blocks ?? [];
    expect(block?.kind).toBe("packet");
    if (block?.kind !== "packet") throw new Error("not a packet");
    expect(block.dissector.title).toBe("Le SYN, octet par octet");
    expect(block.dissector.find).toEqual(["tcp.sport", "tcp.dport"]);
    expect(block.dissector.frame.tcp).toMatchObject({ sport: 50324, dport: 443, flags: ["SYN"] });
    expect(block.dissector.frame.ip).toMatchObject({ ttl: 64 });
    // The JSON escapes of the payload are the line break itself.
    expect(block.dissector.frame.payload).toBe("GET / HTTP/1.1\r\n");
  });

  it("shows a placeholder for a frame the site would refuse", () => {
    const wrong = FRAME.replace('"dport": 443', '"dport": 70000');
    expect(parseLesson(wrong).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Décortiquer un paquet" },
    ]);
  });
});

describe("PutInOrder and MatchPairs", () => {
  it("are played in the app with the props the site reads", () => {
    const lesson = [
      "## Les couches",
      "",
      "<PutInOrder",
      '  id="osi"',
      '  title="Du câble au programme"',
      '  task="De la plus basse à la plus haute."',
      '  items={["Physique", "Liaison", "Réseau"]}',
      '  explanation="Le support d\'abord."',
      '  hint="Le câble d\'abord."',
      "/>",
      "",
      '<MatchPairs id="ports" task="Chaque port à son service." pairs={[{ "left": "22", "right": "SSH" }, { "left": "53", "right": "DNS" }, { "left": "80", "right": "HTTP" }]} />',
    ].join("\n");
    expect(parseLesson(lesson).sections[0]?.blocks).toEqual([
      {
        kind: "order",
        exercise: {
          id: "osi",
          title: "Du câble au programme",
          task: "De la plus basse à la plus haute.",
          items: ["Physique", "Liaison", "Réseau"],
          explanation: "Le support d'abord.",
          hint: "Le câble d'abord.",
        },
      },
      {
        kind: "match",
        exercise: {
          id: "ports",
          task: "Chaque port à son service.",
          pairs: [
            { left: "22", right: "SSH" },
            { left: "53", right: "DNS" },
            { left: "80", right: "HTTP" },
          ],
        },
      },
    ]);
  });

  it("show a placeholder for an exercise the site would refuse", () => {
    const two = '## A\n\n<PutInOrder id="o" task="Ordre." items={["a", "b"]} />';
    expect(parseLesson(two).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Dans l'ordre" },
    ]);
    const twice =
      '## A\n\n<MatchPairs id="m" task="Associe." pairs={[{ "left": "1", "right": "x" }, { "left": "2", "right": "x" }, { "left": "3", "right": "z" }]} />';
    expect(parseLesson(twice).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Associe" },
    ]);
  });
});

describe("CryptoWorkshop", () => {
  it("is played in the app with the props the site reads", () => {
    const lesson = [
      "## Le XOR",
      "",
      "<CryptoWorkshop",
      '  id="atelier-xor"',
      '  title="Le XOR à la main"',
      '  tools={["xor", "hex"]}',
      '  input="BONJOUR"',
      '  challenge={{ "ciphertext": "68 65", "answer": "BO", "hint": "La clé est 42." }}',
      "/>",
    ].join("\n");
    expect(parseLesson(lesson).sections[0]?.blocks).toEqual([
      {
        kind: "crypto",
        workshop: {
          id: "atelier-xor",
          title: "Le XOR à la main",
          tools: ["xor", "hex"],
          input: "BONJOUR",
          challenge: { ciphertext: "68 65", answer: "BO", hint: "La clé est 42." },
        },
      },
    ]);
  });

  it("shows a placeholder for a tool the site does not have", () => {
    const wrong = '## A\n\n<CryptoWorkshop id="w" tools={["rot13"]} />';
    expect(parseLesson(wrong).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Atelier crypto" },
    ]);
  });
});

describe("JwtLab", () => {
  it("is played in the app with the props the site reads", () => {
    const lesson = [
      "## Les jetons",
      "",
      "<JwtLab",
      '  id="jwt-sans-signature"',
      '  title="Le jeton sans signature"',
      '  task="Fais-toi accepter comme administrateur."',
      '  levels={["none", "fixed"]}',
      "/>",
    ].join("\n");
    expect(parseLesson(lesson).sections[0]?.blocks).toEqual([
      {
        kind: "jwt",
        lab: {
          id: "jwt-sans-signature",
          title: "Le jeton sans signature",
          task: "Fais-toi accepter comme administrateur.",
          levels: ["none", "fixed"],
        },
      },
    ]);
  });

  it("offers every step when the lesson names none", () => {
    const blocks = parseLesson('## A\n\n<JwtLab id="j" />').sections[0]?.blocks ?? [];
    expect(blocks).toEqual([
      {
        kind: "jwt",
        lab: { id: "j", levels: ["decode", "none", "weak-secret", "confusion", "fixed"] },
      },
    ]);
  });

  it("shows a placeholder for a lab the site would refuse", () => {
    const wrong = '## A\n\n<JwtLab id="j" levels={["rsa"]} />';
    expect(parseLesson(wrong).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Atelier JWT" },
    ]);
    const noAttack = '## A\n\n<JwtLab id="j" levels={["decode", "fixed"]} />';
    expect(parseLesson(noAttack).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Atelier JWT" },
    ]);
  });
});

describe("FirewallLab", () => {
  it("is played in the app with the rules the site reads, their indent taken off", () => {
    const lesson = [
      "## Le pare-feu",
      "",
      "- Une liste :",
      "",
      "  <FirewallLab",
      '    id="srv-web"',
      '    task="Ferme l\'entrée."',
      "    rules={`policy accept",
      "  accept tcp port 22   # SSH",
      "  accept tcp port 80,443`}",
      '    probes={[{ "label": "Un visiteur ouvre le site", "proto": "tcp", "from": "203.0.113.5", "port": 443, "expect": "accept" }, { "label": "Un ping", "proto": "icmp", "from": "192.0.2.10", "expect": "accept" }]}',
      '    hints={["policy drop en premier."]}',
      "  />",
    ].join("\n");
    const blocks = parseLesson(lesson).sections[0]?.blocks ?? [];
    const lab = blocks.find((b) => b.kind === "firewall");
    if (lab?.kind !== "firewall") throw new Error("no firewall lab");
    expect(lab.lab.rules).toBe("policy accept\naccept tcp port 22   # SSH\naccept tcp port 80,443");
    expect(lab.lab.probes).toHaveLength(2);
    expect(lab.lab.probes[1]).toEqual({
      label: "Un ping",
      proto: "icmp",
      from: "192.0.2.10",
      state: "new",
      expect: "accept",
    });
    expect(lab.lab.hints).toEqual(["policy drop en premier."]);
  });

  it("starts from an open firewall when the lesson gives no rules, and shows a placeholder for a bad lab", () => {
    const bare =
      '## A\n\n<FirewallLab id="f" task="x" probes={[{ "label": "a", "proto": "tcp", "from": "203.0.113.5", "port": 443, "expect": "accept" }]} />';
    expect(parseLesson(bare).sections[0]?.blocks[0]).toMatchObject({
      kind: "firewall",
      lab: { rules: "policy accept" },
    });
    const wrong =
      '## A\n\n<FirewallLab id="f" task="x" probes={[{ "label": "a", "proto": "tcp", "from": "203.0.113.5", "expect": "accept" }]} />';
    expect(parseLesson(wrong).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Pare-feu" },
    ]);
  });
});

describe("LogHunt", () => {
  it("is played in the app with the events, series and questions the site reads", () => {
    const lesson = [
      "## Les journaux",
      "",
      "<LogHunt",
      '  id="web01"',
      '  task="Trouve le coupable."',
      '  events={[{ "time": "2026-01-10 03:14:02", "source": "sshd", "ip": "203.0.113.9", "user": "deploy", "action": "Accepted password" }]}',
      '  series={[{ "count": 30, "from": "2026-01-10 03:09:00", "to": "2026-01-10 03:14:00", "source": "sshd", "ips": ["203.0.113.9"], "actions": ["Failed password"] }]}',
      '  questions={[{ "label": "Quelle adresse ?", "answer": "203.0.113.9" }, { "label": "Quand ?", "answer": ["03:14:02", "03:14"] }]}',
      "/>",
    ].join("\n");
    const [block] = parseLesson(lesson).sections[0]?.blocks ?? [];
    if (block?.kind !== "loghunt") throw new Error("not a log hunt");
    expect(block.hunt.events).toHaveLength(1);
    expect(block.hunt.series[0]?.count).toBe(30);
    expect(block.hunt.questions[1]?.answer).toEqual(["03:14:02", "03:14"]);
  });

  it("shows a placeholder for a hunt without events", () => {
    const empty = [
      "## A",
      "",
      '<LogHunt id="h" task="x" questions={[{ "label": "Qui ?", "answer": "x" }]} />',
    ].join("\n");
    expect(parseLesson(empty).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Chasse dans les logs" },
    ]);
  });
});

describe("HexEditor", () => {
  it("is played in the app with the bytes, repairs and questions the site reads", () => {
    const lesson = [
      "## Les octets",
      "",
      "<HexEditor",
      '  id="png"',
      '  filename="photo.png"',
      '  task="Répare la signature."',
      '  bytes="00 50 4e 47 0d 0a 1a 0a"',
      '  repairs={[{ "label": "La signature PNG", "offset": 0, "bytes": "89" }]}',
      '  questions={[{ "label": "Quel type ?", "answer": ["PNG", "image PNG"] }]}',
      "/>",
    ].join("\n");
    const [block] = parseLesson(lesson).sections[0]?.blocks ?? [];
    if (block?.kind !== "hex") throw new Error("not a hex editor");
    expect(block.editor.bytes).toBe("00 50 4e 47 0d 0a 1a 0a");
    expect(block.editor.filename).toBe("photo.png");
    expect(block.editor.editable).toBe(true);
    expect(block.editor.repairs?.[0]).toEqual({
      label: "La signature PNG",
      offset: 0,
      bytes: "89",
    });
  });

  it("reads editable={false}, and shows a placeholder for a file the site would refuse", () => {
    const readOnly =
      '## A\n\n<HexEditor id="h" task="Lis." bytes="4d 5a 90 00" editable={false} />';
    expect(parseLesson(readOnly).sections[0]?.blocks[0]).toMatchObject({
      kind: "hex",
      editor: { editable: false },
    });
    const wrong = '## A\n\n<HexEditor id="h" task="x" bytes="89 5" />';
    expect(parseLesson(wrong).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Éditeur hexadécimal" },
    ]);
  });
});

describe("StepAnimation", () => {
  it("lists the steps of the scene; the drawing stays on the site", () => {
    const lesson =
      '## TCP\n\n<StepAnimation id="a" scene="tcp-handshake" caption="Trois segments." />';
    const blocks = parseLesson(lesson).sections[0]?.blocks ?? [];
    expect(blocks[0]?.kind).toBe("animation");
    if (blocks[0]?.kind !== "animation") throw new Error("not an animation");
    expect(blocks[0].title).toBe("La poignée de main TCP");
    expect(blocks[0].steps).toHaveLength(5);
    expect(blocks[0].steps[1]?.title).toBe("SYN");
  });

  it("shows a placeholder for a scene the site does not have", () => {
    expect(parseLesson('## X\n\n<StepAnimation id="a" scene="dns" />').sections[0]?.blocks).toEqual(
      [{ kind: "placeholder", label: "Animation" }],
    );
  });
});

describe("IncidentStory", () => {
  it("is played in the app with the scenes the site reads", () => {
    const lesson = [
      "## L'astreinte",
      "",
      "<IncidentStory",
      '  id="poste"',
      '  title="Le poste qui chiffre"',
      '  role="Tu es la personne d\'astreinte."',
      '  scenes={[{ "id": "a", "text": "Un collègue appelle.", "choices": [{ "text": "Éteindre", "next": "fin", "verdict": "bad", "consequence": "La mémoire vive est perdue." }, { "text": "Isoler", "next": "fin", "verdict": "good", "consequence": "Le programme ne se propage plus." }] }, { "id": "fin", "text": "Incident clos.", "ending": "success" }]}',
      "/>",
    ].join("\n");
    const [block] = parseLesson(lesson).sections[0]?.blocks ?? [];
    if (block?.kind !== "story") throw new Error("not a story");
    expect(block.story.title).toBe("Le poste qui chiffre");
    expect(block.story.role).toBe("Tu es la personne d'astreinte.");
    expect(block.story.scenes).toHaveLength(2);
    expect(block.story.scenes[0]?.choices?.[1]?.verdict).toBe("good");
    expect(block.story.scenes[1]?.ending).toBe("success");
  });

  it("shows a placeholder for a story the site would refuse", () => {
    const wrong =
      '## A\n\n<IncidentStory id="s" scenes={[{ "id": "a", "text": "x", "ending": "success" }, { "id": "b", "text": "y", "ending": "failure" }]} />';
    expect(parseLesson(wrong).sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Incident à choix" },
    ]);
  });
});
