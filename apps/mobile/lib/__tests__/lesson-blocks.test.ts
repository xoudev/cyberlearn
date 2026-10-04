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
