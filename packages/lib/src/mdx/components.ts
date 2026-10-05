import type { LessonComponentName } from "./check.js";

/**
 * What each lesson component is, for the people who write lessons.
 *
 * The MDX pipeline knows twenty-eight component names (LESSON_COMPONENT_NAMES,
 * in check.ts); the editor's guide used to describe five of them, the five
 * that existed when it was written. Each component added since got a section
 * in docs/LESSON_AUTHORING_GUIDE.md and an example in the showcase lesson, and
 * nothing in the editor. This registry is the one place that says, for every
 * name the pipeline accepts: what the reader sees, the family it belongs to,
 * where its section in the guide is, and one or more examples that render.
 * The editor's guide panel is built from it, and a test holds it to the
 * pipeline's list and runs every example through the same check the editors
 * run before saving.
 *
 * Plain data: nothing here imports the MDX compiler, so the client bundle that
 * draws the guide carries only the text.
 */

export const LESSON_COMPONENT_FAMILIES = [
  { id: "callout", label: "Encadrés" },
  { id: "quiz", label: "Questions" },
  { id: "code", label: "Code" },
  { id: "terminal", label: "Terminaux" },
  { id: "media", label: "Médias et schémas" },
  { id: "reading", label: "Lecture critique" },
  { id: "database", label: "Bases de données" },
  { id: "git", label: "Git" },
  { id: "network", label: "Réseau" },
  { id: "investigation", label: "Enquête" },
  { id: "crypto", label: "Crypto et animation" },
  { id: "ordering", label: "Ordre et associations" },
  { id: "web", label: "Web en PHP" },
] as const;

export type LessonComponentFamily = (typeof LESSON_COMPONENT_FAMILIES)[number]["id"];

export interface LessonComponentExample {
  /** On the insert button: a variant ("info"), a language ("Python"), a use ("Exercice"). */
  label: string;
  /** The MDX inserted, ending with a newline; it renders as written. */
  snippet: string;
  /** One line under the row, when the label does not say enough. */
  description?: string;
}

export interface LessonComponentSpec {
  name: LessonComponentName;
  /** In French, as the guide and the panel name it. */
  label: string;
  family: LessonComponentFamily;
  /** What the reader sees and does; one or two sentences. */
  description: string;
  /** The heading of its section in docs/LESSON_AUTHORING_GUIDE.md, verbatim. */
  guide: string;
  examples: readonly LessonComponentExample[];
}

export const LESSON_AUTHORING_GUIDE_URL =
  "https://github.com/xoudev/cyberlearn-revamp/blob/main/docs/LESSON_AUTHORING_GUIDE.md";

/**
 * The fragment GitHub gives a Markdown heading: lowercased, punctuation
 * dropped, spaces turned into hyphens. "5.9b FindTheFlaw - Trouve la faille"
 * becomes "59b-findtheflaw---trouve-la-faille".
 */
export function guideAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}

export function guideUrl(spec: Pick<LessonComponentSpec, "guide">): string {
  return `${LESSON_AUTHORING_GUIDE_URL}#${guideAnchor(spec.guide)}`;
}

export function lessonComponent(name: string): LessonComponentSpec | undefined {
  return LESSON_COMPONENTS.find((spec) => spec.name === name);
}

export const LESSON_COMPONENTS: readonly LessonComponentSpec[] = [
  // ── Encadrés ───────────────────────────────────────────────────────────────
  {
    name: "Callout",
    label: "Encadré",
    family: "callout",
    description:
      "Un bloc coloré qui attire l'œil sur un point : une information, une mise en garde, une erreur à éviter, une bonne pratique. Un ou deux par section, pas plus.",
    guide: "5.1 Callout",
    examples: [
      {
        label: "info",
        snippet:
          '<Callout type="info">\n  Une information complémentaire, un contexte utile.\n</Callout>\n',
      },
      {
        label: "warning",
        snippet:
          "<Callout type=\"warning\">\n  Un point d'attention : ce qu'il faut regarder à deux fois avant de continuer.\n</Callout>\n",
      },
      {
        label: "danger",
        snippet:
          '<Callout type="danger">\n  Une erreur à ne pas commettre, une pratique interdite.\n</Callout>\n',
      },
      {
        label: "success",
        snippet:
          '<Callout type="success">\n  Une bonne pratique confirmée, le résultat attendu.\n</Callout>\n',
      },
    ],
  },

  // ── Questions ──────────────────────────────────────────────────────────────
  {
    name: "Quiz",
    label: "QCM",
    family: "quiz",
    description:
      "Une question à réponse unique, enregistrée par le serveur. Les options sont mélangées pour chaque apprenant ; l'explication s'affiche après la réponse.",
    guide: "5.2 Quiz (QCM)",
    examples: [
      {
        label: "QCM",
        snippet:
          '<Quiz\n  id="q-1"\n  question="Quel port utilise HTTPS par défaut ?"\n  options={["80", "443", "8080", "22"]}\n  correct={1}\n  explanation="HTTPS écoute sur 443 ; 80 est le port de HTTP, en clair."\n/>\n',
        description: "correct : l'index de la bonne option, à partir de 0",
      },
    ],
  },
  {
    name: "QuizGroup",
    label: "Série de QCM",
    family: "quiz",
    description:
      "Plusieurs quiz à la suite : la question suivante n'apparaît qu'une fois la précédente répondue.",
    guide: "5.2b QuizGroup - Série de QCM séquentiels",
    examples: [
      {
        label: "Série",
        snippet:
          '<QuizGroup>\n  <Quiz\n    id="q-serie-1"\n    question="Quelle couche OSI gère le routage IP ?"\n    options={["Liaison", "Réseau", "Transport", "Application"]}\n    correct={1}\n    explanation="La couche 3, réseau, adresse et route les paquets."\n  />\n  <Quiz\n    id="q-serie-2"\n    question="Que signifie TLS ?"\n    options={["Transport Layer Security", "Trusted Link System", "Token Login Service"]}\n    correct={0}\n    explanation="Transport Layer Security : le chiffrement sous HTTPS."\n  />\n</QuizGroup>\n',
      },
    ],
  },

  // ── Code ───────────────────────────────────────────────────────────────────
  {
    name: "CodePlayground",
    label: "Bac à sable",
    family: "code",
    description:
      "Du code que l'apprenant modifie et exécute dans son navigateur, sans serveur : Python, JavaScript, C ou assembleur x86-64. Le code de départ va dans starterCode, entre accents graves : ses accolades y sont permises, ce qu'elles ne sont pas entre les balises.",
    guide: "5.3 CodePlayground - Sandbox interactif",
    examples: [
      {
        label: "Python",
        snippet:
          '<CodePlayground language="python" starterCode={`print("Hello, World!")\n\nfor i in range(3):\n    print(f"Itération {i}")`} />\n',
        description: "Pyodide · WASM · Python 3.11",
      },
      {
        label: "JavaScript",
        snippet:
          '<CodePlayground language="javascript" starterCode={`function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log("Fib(10) =", fibonacci(10));`} />\n',
        description: "Web Worker · ES2022",
      },
      {
        label: "C",
        snippet:
          '<CodePlayground language="c" starterCode={`#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\\\n");\n    return 0;\n}`} />\n',
        description: "jscpp · C11",
      },
      {
        label: "ASM x86-64",
        snippet:
          '<CodePlayground language="asm" starterCode={`global main\nsection .text\nmain:\n    mov rax, 10\n    mov rbx, 32\n    add rax, rbx        ; rax = 42\n    println rax         ; affiche 42\n    ret`} />\n',
        description: "Simulateur NASM · mov add sub push pop cmp jmp call ret",
      },
    ],
  },
  {
    name: "PythonChallenge",
    label: "Défi Python",
    family: "code",
    description:
      "Une fonction à écrire, comparée à des cas de test ; la section ne se termine que lorsqu'ils passent tous.",
    guide: "5.9 PythonChallenge - Exercice Python avec tests automatiques",
    examples: [
      {
        label: "Défi",
        snippet:
          '<PythonChallenge\n  id="py-1"\n  title="Calculer la somme des entiers de 1 à n"\n  description="Écris une fonction solution(n) qui retourne la somme des entiers de 1 à n inclus. Par exemple, solution(5) doit retourner 15."\n  starterCode="def solution(n):\n    pass"\n  tests={[\n    { input: "solution(1)", expected: "1" },\n    { input: "solution(5)", expected: "15" },\n    { input: "solution(0)", expected: "0", label: "Cas limite : n = 0" },\n  ]}\n/>\n',
        description: "expected : ce que print(input) doit afficher",
      },
    ],
  },

  // ── Terminaux ──────────────────────────────────────────────────────────────
  {
    name: "SimulatedTerminal",
    label: "Terminal simulé",
    family: "terminal",
    description:
      "Un terminal qui ne connaît que les commandes de son scénario et répond avec des sorties écrites d'avance. Des commandes attendues en font un exercice.",
    guide: "5.4 SimulatedTerminal - Terminal interactif",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<SimulatedTerminal\n  shell="bash"\n  scenario="bash-admin"\n  title="Exercice : état de la machine"\n  expectedCommands={["ps aux", "df -h"]}\n  hints={["ps aux liste tous les processus.", "df -h montre l\'espace disque, en unités lisibles."]}\n/>\n',
        description: "expectedCommands cochées au fur et à mesure · hints toujours visibles",
      },
      {
        label: "bash",
        snippet: '<SimulatedTerminal shell="bash" />\n',
        description: "ls · pwd · whoami · cat · echo · mkdir · touch · clear · help",
      },
      {
        label: "bash-admin",
        snippet: '<SimulatedTerminal shell="bash" scenario="bash-admin" />\n',
        description: "ps aux · df -h · free -h · ss -tlnp · systemctl · journalctl · who",
      },
      {
        label: "bash-scripting",
        snippet: '<SimulatedTerminal shell="bash" scenario="bash-scripting" />\n',
        description: "cat script.sh · bash -n · bash -x · chmod +x · echo $? · history",
      },
      {
        label: "file-recon",
        snippet:
          '<SimulatedTerminal shell="bash" scenario="file-recon" title="Terminal : exploration de fichiers" />\n',
        description: "ls -la · cat notes.txt · cat .hidden/flag.txt · find . -name '*.bak'",
      },
      {
        label: "network-recon",
        snippet:
          '<SimulatedTerminal shell="bash" scenario="network-recon" title="Terminal : réseau" />\n',
        description: "ping · traceroute · netstat -tuln · ss -tlnp · ip addr · ip route",
      },
      {
        label: "nmap-basic",
        snippet:
          '<SimulatedTerminal shell="bash" scenario="nmap-basic" title="Terminal : scan réseau" />\n',
        description: "nmap 192.168.1.100 · -sV · -p 80 · -p 1-1000 · -A · -sV -sC · -p-",
      },
      {
        label: "sqli-basic",
        snippet:
          '<SimulatedTerminal shell="bash" scenario="sqli-basic" title="Terminal : SQLi" />\n',
        description: "sqlmap -u 'http://vulnerable.ctf/login?id=1' · --dbs · --tables · --dump",
      },
      {
        label: "ctf-web",
        snippet: '<SimulatedTerminal shell="bash" scenario="ctf-web" />\n',
        description: "curl http://target.ctf/ · gobuster dir · nikto -h · cat robots.txt",
      },
      {
        label: "ctf-net",
        snippet: '<SimulatedTerminal shell="bash" scenario="ctf-net" />\n',
        description: "nmap -sV -sC target.ctf · nc -nv 10.10.10.42 31337 · host · dig",
      },
      {
        label: "powershell-basics",
        snippet: '<SimulatedTerminal shell="powershell" scenario="powershell-basics" />\n',
        description: "Get-ChildItem · Get-Date · $PSVersionTable · Get-Process · Get-Content",
      },
      {
        label: "powershell-sec",
        snippet: '<SimulatedTerminal shell="powershell" scenario="powershell-sec" />\n',
        description: "Get-LocalUser · Get-NetTCPConnection · Get-WinEvent · netstat -ano",
      },
      {
        label: "Commandes perso",
        snippet:
          '<SimulatedTerminal\n  shell="bash"\n  title="Serveur de développement"\n  commands={{\n    "git status": "On branch main\\nnothing to commit, working tree clean",\n    "npm run dev": "  ▲ Next.js 16.0.0\\n  - Local: http://localhost:3000",\n  }}\n/>\n',
        description: "commande → sortie ; s'ajoutent à celles du scénario et l'emportent",
      },
    ],
  },
  {
    name: "LinuxTerminal",
    label: "Vrai Linux",
    family: "terminal",
    description:
      "Un vrai Linux démarré dans le navigateur au clic : toutes les commandes font ce qu'elles font sur une machine. Des fichiers déposés, des commandes attendues et des vérifications de l'état final en font un exercice.",
    guide: "5.4b LinuxTerminal - Un vrai Linux dans la leçon",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<LinuxTerminal\n  title="Ranger un dossier"\n  files={{ "rapport_v3.txt": "Rapport trimestriel, version finale.\\n", "brouillon.tmp": "texte temporaire\\n" }}\n  expectedCommands={["mkdir docs", "mv rapport_v3.txt docs/rapport.txt"]}\n  checks={[{ "label": "Le rapport est dans docs, sous son nouveau nom", "path": "docs/rapport.txt", "expect": "file", "contains": "Rapport trimestriel" }, { "label": "Le brouillon est supprimé", "path": "brouillon.tmp", "expect": "absent" }]}\n  hints={["mkdir docs crée le dossier.", "mv déplace et renomme en une seule commande."]}\n/>\n',
        description: "files déposés dans /mnt · checks : file, dir, link ou absent, contains, mode",
      },
      {
        label: "Libre",
        snippet: '<LinuxTerminal title="Linux · root@cyberlearn" />\n',
        description: "sans consigne : la machine seule, pour essayer",
      },
      {
        label: "Chronométré",
        snippet:
          '<LinuxTerminal\n  title="Épreuve pratique"\n  files={{ "notes.txt": "Réunion lundi 9 h\\n" }}\n  expectedCommands={["chmod 600 notes.txt"]}\n  checks={[{ "label": "notes.txt n\'est lisible que par son propriétaire", "path": "notes.txt", "expect": "file", "mode": "600" }]}\n  timeLimitMinutes={20}\n/>\n',
        description: "timeLimitMinutes : le compte à rebours démarre quand la machine est prête",
      },
    ],
  },

  // ── Médias et schémas ──────────────────────────────────────────────────────
  {
    name: "LessonVideo",
    label: "Vidéo",
    family: "media",
    description: "Une vidéo du site, avec son titre et une légende sous le lecteur.",
    guide: "5.5 LessonVideo - Vidéo pédagogique",
    examples: [
      {
        label: "Vidéo",
        snippet:
          '<LessonVideo\n  src="/videos/welcome.mp4"\n  title="La vidéo de bienvenue"\n  caption="Une phrase sous la vidéo, pour ce qu\'il faut y voir."\n/>\n',
        description: "src : un fichier du site, sous /videos",
      },
    ],
  },
  {
    name: "LessonImage",
    label: "Image",
    family: "media",
    description:
      "Une image centrée avec sa légende, aux dimensions déclarées pour éviter les sauts de page.",
    guide: "5.6 LessonImage - Image annotée",
    examples: [
      {
        label: "Image",
        snippet:
          '<LessonImage\n  src="/videos/welcome-poster.jpg"\n  alt="Ce que montre l\'image, pour qui ne la voit pas."\n  caption="Une légende sous l\'image."\n  width={1280}\n  height={720}\n/>\n',
        description: "alt obligatoire · width et height en pixels",
      },
    ],
  },
  {
    name: "ExternalLink",
    label: "Lien externe",
    family: "media",
    description:
      "Un lien vers une ressource extérieure : en carte avec sa description, ou en ligne au milieu d'une phrase.",
    guide: "5.7 ExternalLink - Lien externe",
    examples: [
      {
        label: "Carte",
        snippet:
          '<ExternalLink\n  href="https://nmap.org/book/man.html"\n  description="Documentation officielle des options et techniques de scan"\n>\n  Nmap Reference Guide\n</ExternalLink>\n',
      },
      {
        label: "En ligne",
        snippet:
          'Pour en savoir plus, consulte la <ExternalLink href="https://owasp.org/www-project-top-ten/" variant="link">liste OWASP Top 10</ExternalLink>.\n',
        description: 'variant="link" : sur une seule ligne, dans la phrase',
      },
    ],
  },
  {
    name: "Diagram",
    label: "Schéma Mermaid",
    family: "media",
    description:
      "Un schéma dessiné à partir d'un texte Mermaid : un flux, une séquence d'échanges ou un graphe de branches Git.",
    guide: "5.8 Diagram - Diagrammes Mermaid",
    examples: [
      {
        label: "Flux",
        snippet:
          '<Diagram caption="Architecture d\'une application web 3-tiers">\nflowchart LR\n  A(["Client"]) -->|"HTTPS"| B["Serveur Web"]\n  B --> C[("Base de données")]\n  B --> D["Cache Redis"]\n</Diagram>\n',
        description: "flowchart LR ou TD · pas de class diagram",
      },
      {
        label: "Séquence",
        snippet:
          '<Diagram caption="Handshake TCP en trois phases">\nsequenceDiagram\n  participant C as Client\n  participant S as Serveur\n  C->>S: SYN (seq=100)\n  S->>C: SYN-ACK (seq=200, ack=101)\n  C->>S: ACK (ack=201)\n  Note over C,S: Connexion établie\n</Diagram>\n',
      },
      {
        label: "Git",
        snippet:
          '<Diagram>\ngitGraph\n  commit id: "init"\n  branch feature/auth\n  checkout feature/auth\n  commit id: "add login"\n  checkout main\n  merge feature/auth id: "merge auth"\n</Diagram>\n',
      },
    ],
  },

  // ── Lecture critique ───────────────────────────────────────────────────────
  {
    name: "FindTheFlaw",
    label: "Trouve la faille",
    family: "reading",
    description:
      "Un extrait de code où l'apprenant clique la ligne vulnérable, puis nomme la faille parmi les options.",
    guide: "5.9b FindTheFlaw - Trouve la faille",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<FindTheFlaw\n  id="flaw-1"\n  title="Une requête à moitié paramétrée"\n  language="python"\n  code={`\ndef connexion(cursor, login, mot_de_passe):\n    empreinte = hacher(mot_de_passe)\n    requete = "SELECT id FROM users WHERE login = \'" + login + "\' AND hash = ?"\n    cursor.execute(requete, (empreinte,))\n    return cursor.fetchone() is not None\n`}\n  line={3}\n  options={["Mot de passe stocké en clair", "Injection SQL", "Faille XSS", "Aucune : la requête est paramétrée"]}\n  correct={1}\n  explanation="Le login est collé dans le texte de la requête : chaque valeur venue de l\'extérieur doit avoir son propre paramètre."\n  hint="Toutes les valeurs de la requête passent-elles par un paramètre ?"\n/>\n',
        description:
          "line : la ligne fautive, à partir de 1 · correct : l'index de la bonne option",
      },
    ],
  },
  {
    name: "PhishingEmail",
    label: "Hameçonnage",
    family: "reading",
    description:
      "Un courriel piégé où l'apprenant clique chaque élément qui le trahit : expéditeur, objet, paragraphe, lien.",
    guide: "5.9c PhishingEmail - Boîte mail piégée",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<PhishingEmail\n  id="phishing-1"\n  title="Un remboursement inattendu"\n  fromName="DGFiP - Finances publiques"\n  fromAddress="remboursement@impots-gouv-fr.net"\n  subject="Remboursement de 238,40 € en attente : action requise sous 48 h"\n  body={["Bonjour,", "Vous êtes éligible à un remboursement de 238,40 €.", "Pour le recevoir, confirmez vos coordonnées bancaires sous 48 h.", "Cordialement, le service des remboursements"]}\n  linkText="Confirmer mes coordonnées"\n  linkUrl="http://impots.gouv.fr.remboursement-dgfip.net/confirmation"\n  clues={[{ "part": "sender", "why": "L\'adresse se termine par impots-gouv-fr.net, un domaine que n\'importe qui peut acheter." }, { "part": "body-2", "why": "L\'administration ne demande jamais tes coordonnées bancaires par courriel." }, { "part": "link", "why": "Le lien mène à remboursement-dgfip.net : impots.gouv.fr n\'est qu\'un sous-domaine placé devant." }]}\n  conclusion="Ne clique pas et ne réponds pas. Signale-le, puis supprime-le."\n/>\n',
        description: "clues.part : sender, subject, body-N (paragraphe N, à partir de 0) ou link",
      },
    ],
  },

  // ── Bases de données ───────────────────────────────────────────────────────
  {
    name: "SqlPlayground",
    label: "Base SQL",
    family: "database",
    description:
      "Une vraie base SQLite dans le navigateur : l'apprenant écrit des requêtes, voit leur résultat et doit obtenir celui qui est attendu.",
    guide: "5.9d SqlPlayground - Une vraie base SQL",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<SqlPlayground\n  id="sql-1"\n  title="Une page produit qui en dit trop"\n  schema={`CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL);\nINSERT INTO products (id, name, price) VALUES (10, \'Clavier mécanique\', 89), (11, \'Souris\', 25);\nCREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL);\nINSERT INTO users (username, password) VALUES (\'alice\', \'secret123\'), (\'admin\', \'Zx9!kQ2#vT\');`}\n  starterQuery="SELECT name, price FROM products WHERE id = 10"\n  task="Fais afficher par cette requête le produit 10 et, dans les mêmes deux colonnes, l\'identifiant et le mot de passe de chaque compte."\n  expected={{ "rows": [["Clavier mécanique", 89], ["alice", "secret123"], ["admin", "Zx9!kQ2#vT"]] }}\n  hint="Ajoute à la fin de la requête : UNION SELECT username, password FROM users"\n/>\n',
        description: "schema : le SQL joué au départ · expected.rows : le résultat à obtenir",
      },
    ],
  },
  {
    name: "SqlInjectionLab",
    label: "Labo d'injection SQL",
    family: "database",
    description:
      "Un formulaire de connexion devant une base, avec la requête du serveur sous les yeux : l'apprenant entre sans connaître le mot de passe.",
    guide: "5.9e SqlInjectionLab - Labo d'injection SQL",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<SqlInjectionLab\n  id="sqli-1"\n  title="Le formulaire de connexion"\n  schema={`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL);\nINSERT INTO users (username, password, role) VALUES (\'alice\', \'secret123\', \'user\'), (\'admin\', \'Zx9!kQ2#vT\', \'admin\');`}\n  query="SELECT id, username, role FROM users WHERE username = \'{login}\' AND password = \'{password}\'"\n  fields={[{ "name": "login", "label": "Identifiant" }, { "name": "password", "label": "Mot de passe", "secret": true }]}\n  goal="Entre dans le compte dont le rôle est admin, sans connaître son mot de passe."\n  success={{ "column": "role", "equals": "admin" }}\n  hint="Dans Identifiant : admin\' --  puis n\'importe quoi dans le mot de passe."\n/>\n',
        description: "query : {nom} remplacé par la valeur du champ · success : la ligne à obtenir",
      },
    ],
  },

  // ── Git ────────────────────────────────────────────────────────────────────
  {
    name: "GitSandbox",
    label: "Bac à sable Git",
    family: "git",
    description:
      "Un dépôt simulé piloté au terminal, le graphe des branches redessiné à chaque commande, des vérifications cochées au fil de l'exercice.",
    guide: "5.9f GitSandbox - Bac à sable Git",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<GitSandbox\n  id="git-1"\n  title="Le cycle d\'un commit"\n  setup={["git init", "echo \'<h1>Mon site</h1>\' > index.html", "git add index.html", "git commit -m \\"initial commit\\"", "echo \'<nav>Accueil | Contact</nav>\' >> index.html"]}\n  task="index.html vient d\'être modifié. Regarde l\'état du dépôt, prépare le fichier, enregistre-le avec le message « add navigation menu », puis relis l\'historique."\n  checks={[{ "label": "Le commit « add navigation menu » est dans main", "expect": "commit", "branch": "main", "message": "add navigation menu" }, { "label": "Plus rien à enregistrer", "expect": "clean" }]}\n  hints={["git status montre index.html modifié, pas encore préparé.", "git add index.html le prépare, puis git commit -m \\"add navigation menu\\" l\'enregistre."]}\n/>\n',
        description: "setup : les commandes jouées avant · checks : commit, file, branch ou clean",
      },
    ],
  },

  // ── Réseau ─────────────────────────────────────────────────────────────────
  {
    name: "NetworkLab",
    label: "Atelier réseau",
    family: "network",
    description:
      "Des machines à câbler et à adresser sur un canevas, avec des vérifications : une adresse dans le bon réseau, un ping qui passe.",
    guide: "5.9h NetworkLab - Atelier réseau",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<NetworkLab\n  id="net-1"\n  title="Un réseau, trois machines"\n  task="PC1 ne joint pas PC2 : lance un ping, puis compare leurs deux adresses. Corrige celle de PC2 pour qu\'elle soit dans le réseau de PC1, 192.168.1.0/24."\n  devices={[{ "id": "sw1", "kind": "switch", "name": "SW1", "x": 260, "y": 40 }, { "id": "pc1", "kind": "pc", "name": "PC1", "x": 80, "y": 200, "addresses": { "eth0": "192.168.1.10/24" } }, { "id": "pc2", "kind": "pc", "name": "PC2", "x": 440, "y": 200, "addresses": { "eth0": "192.168.2.20/24" } }]}\n  links={[["pc1", "sw1"], ["pc2", "sw1"]]}\n  checks={[{ "label": "PC2 a une adresse dans 192.168.1.0/24", "expect": "address", "device": "PC2", "in": "192.168.1.0/24" }, { "label": "PC1 joint PC2", "expect": "ping", "from": "PC1", "to": "PC2" }]}\n  hints={["Les 24 premiers bits de l\'adresse sont le réseau.", "Donne à PC2 une adresse 192.168.1.x/24."]}\n/>\n',
        description: "devices : pc, switch, router · links : paires d'id · checks : address, ping",
      },
    ],
  },
  {
    name: "SubnetDrill",
    label: "Calcul de sous-réseaux",
    family: "network",
    description:
      "Des questions de sous-réseaux tirées au hasard : adresse de réseau, masque, nombre d'hôtes, préfixe. Deux essais par question.",
    guide: "5.9k SubnetDrill - Calcul de sous-réseaux",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<SubnetDrill\n  id="drill-1"\n  title="Pose le calcul"\n  task="Réponds en notation décimale pointée pour une adresse ou un masque, en chiffres pour un nombre ou un préfixe."\n  count={4}\n/>\n',
        description: "count : le nombre de questions tirées",
      },
    ],
  },
  {
    name: "PacketDissector",
    label: "Décortiquer un paquet",
    family: "network",
    description:
      "Une trame à lire octet par octet, couche par couche, pour retrouver les champs demandés.",
    guide: "5.9l PacketDissector - Décortiquer un paquet",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<PacketDissector\n  id="trame-1"\n  title="Quatre enveloppes dans une trame"\n  task="Retrouve les quatre champs demandés, un par couche."\n  frame={{ "eth": { "src": "08:00:27:4e:66:a1", "dst": "00:0c:29:1a:2b:3c" }, "ip": { "src": "192.168.1.42", "dst": "93.184.216.34", "id": 7238 }, "tcp": { "sport": 50324, "dport": 80, "seq": 1001, "ack": 5001, "flags": ["PSH", "ACK"], "window": 64240 }, "payload": "GET / HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n" }}\n  find={["eth.dst", "ip.dst", "tcp.dport", "payload.data"]}\n/>\n',
        description: "frame : eth, ip, tcp et payload · find : les champs à retrouver",
      },
    ],
  },
  {
    name: "FirewallLab",
    label: "Pare-feu",
    family: "network",
    description:
      "Des règles de pare-feu à écrire, vérifiées contre des sondes : ce qui doit passer, ce qui doit être bloqué.",
    guide: "5.9p FirewallLab - Pare-feu",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<FirewallLab\n  id="pare-feu-1"\n  title="Tout fermé par défaut, puis ouvrir le nécessaire"\n  task="Bloque tout par défaut, puis autorise le port 443 depuis n\'importe où et le port 22 seulement depuis l\'adresse du bureau, 192.0.2.10."\n  probes={[{ "label": "Un visiteur ouvre le site en HTTPS", "proto": "tcp", "from": "203.0.113.5", "port": 443, "expect": "accept" }, { "label": "Le bureau se connecte en SSH", "proto": "tcp", "from": "192.0.2.10", "port": 22, "expect": "accept" }, { "label": "Un inconnu tente SSH", "proto": "tcp", "from": "198.51.100.7", "port": 22, "expect": "block" }]}\n  hints={["La première ligne : policy drop. Tout ce qui suit est une ouverture.", "accept tcp port 443 ouvre le web à tout le monde."]}\n/>\n',
        description: "probes : des paquets d'essai, expect accept ou block",
      },
    ],
  },

  // ── Enquête ────────────────────────────────────────────────────────────────
  {
    name: "PhotoOsint",
    label: "OSINT sur photo",
    family: "investigation",
    description:
      "Une photo dont l'apprenant lit les métadonnées pour la placer sur une carte et vérifier la légende qui circule.",
    guide: "5.9g PhotoOsint - OSINT sur photo",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<PhotoOsint\n  id="osint-1"\n  title="Une légende à vérifier"\n  src="/osint/quais-inondes.jpg"\n  alt="Des quais inondés devant des façades colorées, une basilique blanche au sommet d\'une colline."\n  caption="Inondations à Marseille, hier matin. Partagez !"\n  task="Lis les métadonnées de la photo, place sur la carte l\'endroit où elle a été prise, puis compare avec la légende."\n  answer={{ "latitude": 45.7623, "longitude": 4.827, "radiusKm": 15 }}\n  place="Lyon, sur les quais de Saône, sous la colline de Fourvière"\n  conclusion="La photo a été prise à Lyon le 21 mai 2024 : ni à Marseille, ni hier."\n  hints={["Regarde la ligne GPS Latitude : 45° 45′ N, c\'est bien plus au nord que Marseille.", "La date de prise de vue est dans la ligne Date/Time Original."]}\n/>\n',
        description:
          "src : une photo du site avec ses métadonnées · answer : le lieu et sa tolérance en km",
      },
    ],
  },
  {
    name: "LogHunt",
    label: "Chasse dans les logs",
    family: "investigation",
    description:
      "Des journaux à filtrer jusqu'à l'attaquant : des événements écrits un par un, des séries générées, des questions à répondre.",
    guide: "5.9q LogHunt - Chasse dans les logs",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<LogHunt\n  id="logs-1"\n  title="La règle de corrélation, à la main"\n  task="Trouve l\'adresse qui correspond à la règle « plus de vingt échecs puis un succès », et le compte visé."\n  events={[{ "time": "2026-01-10 03:14:02", "source": "sshd", "host": "web01", "ip": "203.0.113.9", "user": "admin", "action": "Accepted password" }]}\n  series={[{ "count": 24, "from": "2026-01-10 03:09:00", "to": "2026-01-10 03:14:00", "source": "sshd", "hosts": ["web01"], "ips": ["203.0.113.9"], "users": ["admin"], "actions": ["Failed password"] }, { "count": 60, "from": "2026-01-10 02:30:00", "to": "2026-01-10 03:30:00", "source": "nginx", "hosts": ["web01"], "ips": ["198.51.100.23", "192.0.2.44"], "actions": ["GET / 200", "POST /login 302"] }]}\n  questions={[{ "label": "Quelle adresse source correspond à la règle ?", "answer": "203.0.113.9", "hint": "Filtre sur Failed password, puis compte par adresse IP." }, { "label": "Quel compte a été visé ?", "answer": "admin" }]}\n/>\n',
        description:
          "events : écrits un par un · series : générés au hasard dans une plage · answer : texte ou liste",
      },
    ],
  },
  {
    name: "HexEditor",
    label: "Éditeur hexadécimal",
    family: "investigation",
    description:
      "Un fichier à lire et à réparer octet par octet, avec des questions sur ce qu'il contient.",
    guide: "5.9r HexEditor - Éditeur hexadécimal",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<HexEditor\n  id="hex-1"\n  title="Une image à réparer"\n  filename="photo.png"\n  task="Remets la signature PNG, octet par octet, puis lis la taille de l\'image."\n  bytes="00 00 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52 00 00 00 01 00 00 00 01 08 02 00 00 00"\n  repairs={[{ "label": "La signature PNG est rétablie", "offset": 0, "bytes": "89 50" }]}\n  questions={[{ "label": "Quelle est la taille de l\'image ?", "answer": ["1x1", "1 x 1"], "hint": "Après IHDR : la largeur, puis la hauteur, sur quatre octets chacune." }]}\n/>\n',
        description:
          "bytes : le fichier en hexadécimal · repairs : les octets à rétablir à un offset",
      },
    ],
  },

  // ── Crypto et animation ────────────────────────────────────────────────────
  {
    name: "CryptoWorkshop",
    label: "Atelier crypto",
    family: "crypto",
    description:
      "Un établi d'outils (base64, hexadécimal, César, Vigenère, XOR, SHA-256) avec, en option, un message à déchiffrer.",
    guide: "5.9o CryptoWorkshop - Atelier crypto",
    examples: [
      {
        label: "Défi",
        snippet:
          '<CryptoWorkshop\n  id="crypto-1"\n  title="Le XOR à la main"\n  tools={["xor", "hex"]}\n  input="BONJOUR"\n  challenge={{ "ciphertext": "79 73 67 6f 7e 78 63 7b 7f 6f", "answer": "SYMETRIQUE", "hint": "La clé est 42 : déchiffrer, c\'est appliquer la même clé une seconde fois." }}\n/>\n',
        description: "tools : base64, hex, caesar, vigenere, xor, sha256 · le premier est ouvert",
      },
      {
        label: "Libre",
        snippet:
          '<CryptoWorkshop id="crypto-2" title="Encoder, décoder" tools={["base64", "hex", "caesar"]} input="Bonjour" />\n',
        description: "sans challenge : les outils seuls, pour manipuler",
      },
    ],
  },
  {
    name: "StepAnimation",
    label: "Animation pas à pas",
    family: "crypto",
    description:
      "Une animation que l'apprenant fait avancer étape par étape, avec le texte de chaque étape à côté. Les scènes sont dessinées par le site.",
    guide: "5.9i StepAnimation - Animation pas à pas",
    examples: [
      {
        label: "tcp-handshake",
        snippet:
          '<StepAnimation id="anim-tcp" scene="tcp-handshake" caption="Trois segments avant le moindre octet de données." />\n',
        description: "la poignée de main en trois temps, puis les données",
      },
      {
        label: "symmetric-encryption",
        snippet:
          '<StepAnimation id="anim-symetrique" scene="symmetric-encryption" caption="Une seule clé, partagée avant l\'échange." />\n',
        description: "le message d'Alice chiffré, capté par Ève, déchiffré par Bob",
      },
      {
        label: "call-stack",
        snippet:
          '<StepAnimation id="anim-pile" scene="call-stack" caption="Chaque appel empile un cadre ; chaque retour le dépile." />\n',
        description: "un programme Python, ses cadres empilés et dépilés",
      },
    ],
  },

  // ── Ordre et associations ──────────────────────────────────────────────────
  {
    name: "PutInOrder",
    label: "Remettre dans l'ordre",
    family: "ordering",
    description: "Des éléments mélangés que l'apprenant remet dans le bon ordre.",
    guide: "5.9m PutInOrder - Remettre dans l'ordre",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<PutInOrder\n  id="ordre-1"\n  title="Les sept couches, du câble au programme"\n  task="Place les couches de la plus basse (1) à la plus haute (7)."\n  items={["Physique", "Liaison de données", "Réseau", "Transport", "Session", "Présentation", "Application"]}\n  explanation="De bas en haut : le signal, les trames, les adresses IP, les ports, puis le dialogue, le format et le programme."\n  hint="La couche 1 est la plus matérielle."\n/>\n',
        description: "items : dans le bon ordre ; ils sont mélangés à l'affichage",
      },
    ],
  },
  {
    name: "MatchPairs",
    label: "Associer",
    family: "ordering",
    description: "Deux colonnes à apparier, élément par élément.",
    guide: "5.9n MatchPairs - Associer",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<MatchPairs\n  id="paires-1"\n  title="Chaque port à son service"\n  task="Associe chaque numéro de port au service qui écoute dessus par convention."\n  pairs={[{ "left": "22", "right": "SSH" }, { "left": "53", "right": "DNS" }, { "left": "80", "right": "HTTP" }, { "left": "443", "right": "HTTPS" }]}\n  explanation="Des conventions écrites dans /etc/services."\n/>\n',
        description: "pairs : left et right ; la colonne de droite est mélangée",
      },
    ],
  },

  // ── Web en PHP ─────────────────────────────────────────────────────────────
  {
    name: "PhpLab",
    label: "Site en vrai PHP",
    family: "web",
    description:
      "Une page PHP qui tourne dans le navigateur : l'apprenant l'attaque, puis corrige son code ; la vérification rejoue les attaques sur sa version.",
    guide: "5.9j PhpLab - Site vulnérable, en vrai PHP",
    examples: [
      {
        label: "Exercice",
        snippet:
          '<PhpLab\n  id="php-1"\n  title="Le moteur de recherche du blog"\n  task="Le blog rappelle au visiteur ce qu\'il a cherché. Envoie une recherche piégée, puis corrige le code PHP pour qu\'aucune recherche ne puisse plus y glisser du code."\n  file="search.php"\n  code={`<?php\n$q = $_GET[\'q\'] ?? \'\';\n?>\n<!doctype html>\n<html lang="fr">\n<body>\n  <form method="get" action="/search.php">\n    <input name="q" value="<?php echo $q; ?>">\n    <button>Rechercher</button>\n  </form>\n  <p>Résultats pour : <?php echo $q; ?></p>\n</body>\n</html>\n`}\n  requests={[{ "label": "Recherche normale", "url": "/search.php?q=php" }, { "label": "Page sans recherche", "url": "/search.php" }]}\n  checks={[{ "kind": "seen", "label": "Une recherche a fait apparaître du code exécutable dans la page", "expect": { "executable": true } }, { "kind": "fixed", "label": "Une balise piégée dans la recherche ne s\'exécute plus", "request": { "url": "/search.php?q=%3Cscript%3Ealert(1)%3C/script%3E" }, "expect": { "executable": false, "contains": "alert(1)" } }]}\n  hints={["htmlspecialchars($q, ENT_QUOTES, \'UTF-8\') transforme les chevrons et les guillemets en entités."]}\n/>\n',
        description:
          "requests : des pages à ouvrir · checks : seen (l'attaque a marché), fixed (elle ne marche plus)",
      },
    ],
  },
];
