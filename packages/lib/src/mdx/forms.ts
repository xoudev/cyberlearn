import {
  parseChallengeTests,
  parseCryptoWorkshop,
  parseFindTheFlaw,
  parseFirewallLab,
  parseGitSandbox,
  parseHexEditor,
  parseIncidentStory,
  parseJwtLab,
  parseLogHunt,
  parseMatchPairs,
  parseNetworkLab,
  parsePacketDissector,
  parsePhishingEmail,
  parsePhotoOsint,
  parsePhpLab,
  parsePutInOrder,
  parseSqlInjectionLab,
  parseSqlPlayground,
  parseStepAnimation,
  parseSubnetDrill,
} from "@cyberlearn/types";
import type { LessonComponentName } from "./names.js";

/**
 * How the block editor lays a component out as a form.
 *
 * A component block is its attributes and, between the tags, its children.
 * Rather than one hand-written form per component, each component declares
 * its fields: what they are called, what kind of value they hold, what is
 * required and within which bounds. The editor draws the fields, and
 * validateComponent says, field by field and in French, what is still
 * wrong. Every component the pipeline draws has its declaration here; the
 * field kinds were chosen for the exercises and labs too (rows, maps, groups,
 * nested blocks, and JSON for the few structures too deep for a form).
 *
 * The bounds repeat what the components check on the page, so a form says
 * before the save what the page would refuse after it; and the exercises
 * whose props have a parser in @cyberlearn/types are run through it, so the
 * form's last word is the page's own. The save still runs the full check
 * (checkLessonMdx): this is the early word, not the last.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface RowColumn {
  key: string;
  label: string;
  /** `texts`: one string, or several (written with a | between them in the form). */
  kind?: "text" | "texts" | "number" | "select" | "boolean";
  options?: readonly SelectOption[];
  required?: boolean;
  placeholder?: string;
}

interface FieldBase {
  key: string;
  label: string;
  /** One line under the field, when the label does not say enough. */
  hint?: string;
  required?: boolean;
}

export type FieldSpec =
  | (FieldBase & { kind: "text"; placeholder?: string; pattern?: RegExp; patternHint?: string })
  | (FieldBase & { kind: "textarea"; mono?: boolean; rows?: number; placeholder?: string })
  | (FieldBase & { kind: "number"; min?: number; max?: number; integer?: boolean })
  /** `default: true` means unchecked writes `false` and checked writes nothing. */
  | (FieldBase & { kind: "boolean"; default?: boolean })
  | (FieldBase & { kind: "select"; options: readonly SelectOption[] })
  /** Several of the options, in the options' order. */
  | (FieldBase & { kind: "multiselect"; options: readonly SelectOption[]; min?: number })
  /** A list of strings: options, hints, commands. */
  | (FieldBase & { kind: "list"; min?: number; max?: number; placeholder?: string })
  /** Strings keyed by strings: files, commands and their output. */
  | (FieldBase & {
      kind: "map";
      keyLabel: string;
      valueLabel: string;
      multiline?: boolean;
      max?: number;
    })
  /** A list of strings of which one is right: a quiz's options and `correct`. */
  | (FieldBase & { kind: "choices"; correctKey: string; min?: number })
  /** A list of objects with the same keys: tests, checks, probes. */
  | (FieldBase & { kind: "rows"; columns: readonly RowColumn[]; min?: number; max?: number })
  /** An object with named fields of its own: a photo's answer, a crypto challenge. */
  | (FieldBase & { kind: "group"; fields: readonly FieldSpec[] })
  /** A structure edited as JSON text, checked by the component's parser. */
  | (FieldBase & { kind: "json"; placeholder?: string; rows?: number })
  /** The children between the tags, as text: a callout's prose, a diagram's code. */
  | (FieldBase & { kind: "children"; mono?: boolean })
  /** The children between the tags, as component blocks of the allowed names. */
  | (FieldBase & { kind: "blocks"; allowed: readonly LessonComponentName[]; min?: number });

export type FieldKind = FieldSpec["kind"];

export interface ComponentForm {
  name: LessonComponentName;
  fields: readonly FieldSpec[];
}

/** The key under which the children's error is reported. */
export const INNER = "inner";

/** The key of an error about the block as a whole, from its parser. */
export const FORM = "form";

const ID_PATTERN = /^[A-Za-z0-9][\w-]*$/;
const ID_HINT = "Lettres, chiffres, tirets et tirets bas, sans espace.";

const idField = (hint = "Propre à la leçon."): FieldSpec => ({
  kind: "text",
  key: "id",
  label: "Identifiant",
  hint,
  required: true,
  pattern: ID_PATTERN,
  patternHint: ID_HINT,
});

const titleField: FieldSpec = { kind: "text", key: "title", label: "Titre" };

const taskField = (required: boolean, hint = "Ce que l'apprenant doit faire."): FieldSpec => ({
  kind: "textarea",
  key: "task",
  label: "Consigne",
  hint,
  required,
  rows: 2,
});

const hintsField = (max: number): FieldSpec => ({
  kind: "list",
  key: "hints",
  label: "Indices",
  max,
});

const explanationField: FieldSpec = {
  kind: "textarea",
  key: "explanation",
  label: "Explication",
  hint: "Affichée une fois l'exercice réussi.",
};

const hintField: FieldSpec = {
  kind: "text",
  key: "hint",
  label: "Indice",
  hint: "Après une première erreur.",
};

const TERMINAL_SCENARIOS: readonly SelectOption[] = [
  { value: "", label: "Aucun : les commandes de base" },
  { value: "bash-admin", label: "bash-admin : administration système" },
  { value: "bash-scripting", label: "bash-scripting : scripts shell" },
  { value: "file-recon", label: "file-recon : exploration de fichiers" },
  { value: "network-recon", label: "network-recon : réseau local" },
  { value: "nmap-basic", label: "nmap-basic : scan réseau" },
  { value: "sqli-basic", label: "sqli-basic : injection SQL avec sqlmap" },
  { value: "ctf-web", label: "ctf-web : cible web" },
  { value: "ctf-net", label: "ctf-net : cible réseau" },
  { value: "powershell-basics", label: "powershell-basics : fondamentaux" },
  { value: "powershell-sec", label: "powershell-sec : sécurité et forensics" },
];

/** The scenes of ANIMATION_SCENE_IDS, with what each shows. */
const SCENES: readonly SelectOption[] = [
  { value: "tcp-handshake", label: "tcp-handshake : la poignée de main en trois temps" },
  { value: "symmetric-encryption", label: "symmetric-encryption : une clé partagée" },
  { value: "call-stack", label: "call-stack : la pile d'appels" },
];

/** SUBNET_DRILL_KINDS, in French. */
const SUBNET_KINDS: readonly SelectOption[] = [
  { value: "network", label: "adresse du réseau" },
  { value: "broadcast", label: "adresse de diffusion" },
  { value: "first-host", label: "première machine" },
  { value: "last-host", label: "dernière machine" },
  { value: "hosts", label: "nombre de machines" },
  { value: "mask", label: "masque d'un préfixe" },
  { value: "prefix", label: "préfixe d'un masque" },
  { value: "same-subnet", label: "même sous-réseau ?" },
  { value: "subnets", label: "nombre de sous-réseaux" },
];

/** CRYPTO_TOOLS, in French. */
const TOOLS: readonly SelectOption[] = [
  { value: "base64", label: "base64" },
  { value: "hex", label: "hexadécimal" },
  { value: "caesar", label: "César" },
  { value: "vigenere", label: "Vigenère" },
  { value: "xor", label: "XOR" },
  { value: "sha256", label: "SHA-256" },
];

/** JWT_LEVELS, in French. */
const JWT_LEVEL_OPTIONS: readonly SelectOption[] = [
  { value: "decode", label: "Lire un jeton" },
  { value: "none", label: "alg: none" },
  { value: "weak-secret", label: "Secret faible" },
  { value: "confusion", label: "Confusion d'algorithme" },
  { value: "fixed", label: "Services corrigés" },
];

const FORMS: readonly ComponentForm[] = [
  // ── Base components ────────────────────────────────────────────────────────
  {
    name: "Callout",
    fields: [
      {
        kind: "select",
        key: "type",
        label: "Ton",
        required: true,
        options: [
          { value: "info", label: "Information" },
          { value: "warning", label: "Attention" },
          { value: "danger", label: "Danger" },
          { value: "success", label: "Bonne pratique" },
        ],
      },
      { kind: "text", key: "title", label: "Titre", hint: "Remplace le libellé du ton." },
      { kind: "children", key: INNER, label: "Texte", hint: "Du Markdown.", required: true },
    ],
  },
  {
    name: "Quiz",
    fields: [
      idField("Propre à la leçon : les réponses des apprenants sont enregistrées dessous."),
      { kind: "text", key: "question", label: "Question", required: true },
      {
        kind: "choices",
        key: "options",
        correctKey: "correct",
        label: "Options",
        hint: "Coche la bonne. Elles sont mélangées pour chaque apprenant.",
        required: true,
        min: 2,
      },
      {
        kind: "textarea",
        key: "explanation",
        label: "Explication",
        hint: "Affichée après la réponse.",
      },
    ],
  },
  {
    name: "QuizGroup",
    fields: [
      {
        kind: "blocks",
        key: INNER,
        label: "Questions",
        hint: "Une après l'autre : la suivante n'apparaît qu'une fois la précédente répondue.",
        required: true,
        allowed: ["Quiz"],
        min: 1,
      },
    ],
  },
  {
    name: "CodePlayground",
    fields: [
      {
        kind: "select",
        key: "language",
        label: "Langage",
        required: true,
        options: [
          { value: "python", label: "Python" },
          { value: "javascript", label: "JavaScript" },
          { value: "c", label: "C" },
          { value: "asm", label: "Assembleur x86-64" },
        ],
      },
      { kind: "textarea", key: "starterCode", label: "Code de départ", mono: true, rows: 8 },
      titleField,
      {
        kind: "textarea",
        key: "expectedOutput",
        label: "Sortie attendue",
        hint: "Ce que le programme doit afficher, pour une validation.",
        mono: true,
        rows: 3,
      },
      {
        kind: "boolean",
        key: "validate",
        label: "Bloque la section",
        hint: "La section ne se termine qu'une fois la sortie attendue obtenue.",
      },
      {
        kind: "text",
        key: "id",
        label: "Identifiant",
        hint: "Facultatif : retrouve le brouillon de l'apprenant.",
        pattern: ID_PATTERN,
        patternHint: ID_HINT,
      },
    ],
  },
  {
    name: "PythonChallenge",
    fields: [
      idField(),
      titleField,
      { kind: "textarea", key: "description", label: "Énoncé", hint: "Ce qu'il faut écrire." },
      {
        kind: "textarea",
        key: "starterCode",
        label: "Code de départ",
        hint: "D'habitude, la signature de solution() et un pass.",
        mono: true,
        rows: 4,
      },
      {
        kind: "rows",
        key: "tests",
        label: "Cas de test",
        hint: "Chaque appel est affiché par print ; le résultat attendu est ce qu'il affiche.",
        required: true,
        min: 1,
        columns: [
          { key: "input", label: "Appel", required: true, placeholder: "solution(5)" },
          { key: "expected", label: "Résultat attendu", required: true, placeholder: "15" },
          { key: "label", label: "Libellé" },
        ],
      },
    ],
  },
  {
    name: "SimulatedTerminal",
    fields: [
      {
        kind: "select",
        key: "shell",
        label: "Shell",
        options: [
          { value: "bash", label: "bash" },
          { value: "powershell", label: "PowerShell" },
        ],
      },
      { kind: "select", key: "scenario", label: "Scénario", options: TERMINAL_SCENARIOS },
      { kind: "text", key: "title", label: "Titre de la barre" },
      {
        kind: "list",
        key: "expectedCommands",
        label: "Commandes attendues",
        hint: "Cochées quand l'apprenant les tape.",
        placeholder: "ps aux",
      },
      {
        kind: "list",
        key: "hints",
        label: "Indices",
        hint: "Toujours visibles, sous le terminal.",
      },
      {
        kind: "map",
        key: "commands",
        label: "Commandes personnalisées",
        hint: "S'ajoutent à celles du scénario et l'emportent.",
        keyLabel: "Commande",
        valueLabel: "Sortie",
        multiline: true,
      },
      { kind: "number", key: "height", label: "Hauteur (px)", min: 200, max: 900, integer: true },
    ],
  },
  {
    name: "LinuxTerminal",
    fields: [
      { kind: "text", key: "title", label: "Titre de la barre" },
      {
        kind: "map",
        key: "files",
        label: "Fichiers déposés",
        hint: "Dans /mnt, où le shell démarre. Chemin relatif, sans . ni .. ; au plus 40.",
        keyLabel: "Chemin",
        valueLabel: "Contenu",
        multiline: true,
        max: 40,
      },
      {
        kind: "list",
        key: "expectedCommands",
        label: "Commandes attendues",
        hint: "Cochées quand l'apprenant les tape.",
        max: 30,
      },
      {
        kind: "rows",
        key: "checks",
        label: "Vérifications",
        hint: "L'état final de /mnt, vérifié après chaque commande.",
        max: 30,
        columns: [
          { key: "label", label: "Libellé", required: true },
          { key: "path", label: "Chemin", required: true, placeholder: "docs/rapport.txt" },
          {
            key: "expect",
            label: "Attendu",
            kind: "select",
            required: true,
            options: [
              { value: "file", label: "un fichier" },
              { value: "dir", label: "un dossier" },
              { value: "link", label: "un lien symbolique" },
              { value: "absent", label: "rien" },
            ],
          },
          { key: "contains", label: "Contient" },
          { key: "mode", label: "Droits (octal)", placeholder: "640" },
          { key: "target", label: "Cible du lien" },
          { key: "links", label: "Liens physiques", kind: "number" },
        ],
      },
      hintsField(20),
      { kind: "number", key: "height", label: "Hauteur (px)", min: 200, max: 900, integer: true },
      {
        kind: "number",
        key: "timeLimitMinutes",
        label: "Chronomètre (minutes)",
        hint: "Démarre quand la machine est prête.",
        min: 1,
        max: 180,
        integer: true,
      },
    ],
  },
  {
    name: "LessonVideo",
    fields: [
      {
        kind: "text",
        key: "src",
        label: "Fichier",
        hint: "Un fichier du site, sous /videos.",
        required: true,
        placeholder: "/videos/welcome.mp4",
      },
      titleField,
      { kind: "text", key: "caption", label: "Légende" },
      {
        kind: "select",
        key: "aspect",
        label: "Format",
        options: [
          { value: "", label: "16/9" },
          { value: "4/3", label: "4/3" },
          { value: "1/1", label: "Carré" },
        ],
      },
    ],
  },
  {
    name: "LessonImage",
    fields: [
      {
        kind: "text",
        key: "src",
        label: "Image",
        hint: "Un fichier du site, ou une adresse https.",
        required: true,
      },
      {
        kind: "text",
        key: "alt",
        label: "Texte alternatif",
        hint: "Ce que montre l'image, pour qui ne la voit pas.",
        required: true,
      },
      { kind: "text", key: "caption", label: "Légende" },
      { kind: "number", key: "width", label: "Largeur (px)", min: 1, integer: true },
      { kind: "number", key: "height", label: "Hauteur (px)", min: 1, integer: true },
      {
        kind: "select",
        key: "variant",
        label: "Disposition",
        options: [
          { value: "", label: "Centrée, avec un cadre" },
          { value: "full", label: "Pleine largeur" },
          { value: "inline", label: "Dans le texte" },
        ],
      },
    ],
  },
  {
    name: "ExternalLink",
    fields: [
      {
        kind: "text",
        key: "href",
        label: "Adresse",
        required: true,
        pattern: /^https?:\/\/\S+$/,
        patternHint: "Une adresse complète, en http ou https.",
        placeholder: "https://",
      },
      { kind: "children", key: INNER, label: "Libellé", required: true },
      {
        kind: "text",
        key: "description",
        label: "Description",
        hint: "Sous le libellé, en carte.",
      },
      {
        kind: "select",
        key: "variant",
        label: "Forme",
        options: [
          { value: "", label: "Carte" },
          { value: "link", label: "En ligne, dans une phrase" },
        ],
      },
    ],
  },
  {
    name: "Diagram",
    fields: [
      { kind: "text", key: "caption", label: "Légende" },
      {
        kind: "children",
        key: INNER,
        label: "Schéma Mermaid",
        hint: "flowchart, sequenceDiagram ou gitGraph.",
        mono: true,
        required: true,
      },
    ],
  },

  // ── Exercises and labs ─────────────────────────────────────────────────────
  {
    name: "FindTheFlaw",
    fields: [
      idField(),
      titleField,
      {
        kind: "text",
        key: "language",
        label: "Langage",
        hint: "Pour la coloration : python, javascript, php, sql, bash…",
        placeholder: "python",
      },
      {
        kind: "textarea",
        key: "code",
        label: "Code",
        hint: "L'extrait à lire ; une ligne est fautive.",
        required: true,
        mono: true,
        rows: 8,
      },
      {
        kind: "number",
        key: "line",
        label: "Ligne fautive",
        hint: "À partir de 1, dans le code ci-dessus.",
        required: true,
        min: 1,
        integer: true,
      },
      {
        kind: "choices",
        key: "options",
        correctKey: "correct",
        label: "Failles proposées",
        hint: "Coche la bonne, de deux à six.",
        required: true,
        min: 2,
      },
      { ...explanationField, required: true },
      hintField,
    ],
  },
  {
    name: "PhishingEmail",
    fields: [
      idField(),
      titleField,
      { kind: "text", key: "fromName", label: "Nom de l'expéditeur", required: true },
      { kind: "text", key: "fromAddress", label: "Adresse de l'expéditeur", required: true },
      { kind: "text", key: "subject", label: "Objet", required: true },
      {
        kind: "list",
        key: "body",
        label: "Paragraphes",
        hint: "Le corps du message, un paragraphe par ligne ; au plus huit.",
        required: true,
        min: 1,
        max: 8,
      },
      { kind: "text", key: "linkText", label: "Texte du lien" },
      { kind: "text", key: "linkUrl", label: "Adresse du lien", placeholder: "http://" },
      { kind: "text", key: "attachment", label: "Pièce jointe", hint: "Son nom, s'il y en a une." },
      {
        kind: "rows",
        key: "clues",
        label: "Indices qui trahissent le message",
        hint: "part : sender, subject, link, attachment ou body-N (le paragraphe N, à partir de 1).",
        required: true,
        min: 1,
        max: 8,
        columns: [
          { key: "part", label: "Partie", required: true, placeholder: "sender" },
          { key: "why", label: "Pourquoi", required: true },
        ],
      },
      { kind: "textarea", key: "conclusion", label: "Conclusion", hint: "Une fois tout trouvé." },
    ],
  },
  {
    name: "SqlPlayground",
    fields: [
      idField(),
      titleField,
      {
        kind: "textarea",
        key: "schema",
        label: "Schéma SQL",
        hint: "Joué sur une base vide avant la première requête : tables et lignes.",
        required: true,
        mono: true,
        rows: 6,
      },
      { kind: "textarea", key: "starterQuery", label: "Requête de départ", mono: true, rows: 2 },
      taskField(false),
      {
        kind: "json",
        key: "expected",
        label: "Résultat attendu",
        hint: 'En JSON : { "rows": [["Clavier", 89]], "columns": ["name", "price"], "ordered": false }',
        rows: 4,
      },
      hintField,
    ],
  },
  {
    name: "SqlInjectionLab",
    fields: [
      idField(),
      titleField,
      {
        kind: "textarea",
        key: "schema",
        label: "Schéma SQL",
        hint: "Tables et lignes, dont le compte à atteindre.",
        required: true,
        mono: true,
        rows: 5,
      },
      {
        kind: "textarea",
        key: "query",
        label: "Requête du serveur",
        hint: "Un {nom} par champ du formulaire : WHERE login = '{login}'.",
        required: true,
        mono: true,
        rows: 2,
      },
      {
        kind: "rows",
        key: "fields",
        label: "Champs du formulaire",
        required: true,
        min: 1,
        max: 4,
        columns: [
          { key: "name", label: "Nom", required: true, placeholder: "login" },
          { key: "label", label: "Libellé", required: true, placeholder: "Identifiant" },
          { key: "secret", label: "Masqué", kind: "boolean" },
        ],
      },
      { kind: "textarea", key: "goal", label: "But", required: true, rows: 2 },
      {
        kind: "group",
        key: "success",
        label: "Réussite",
        hint: "La première ligne renvoyée doit avoir cette valeur dans cette colonne.",
        fields: [
          { kind: "text", key: "column", label: "Colonne", placeholder: "role" },
          { kind: "text", key: "equals", label: "Valeur", placeholder: "admin" },
        ],
      },
      hintField,
    ],
  },
  {
    name: "GitSandbox",
    fields: [
      idField(),
      titleField,
      {
        kind: "list",
        key: "setup",
        label: "Préparation",
        hint: "Les commandes jouées avant que l'apprenant prenne la main ; chacune doit réussir.",
        max: 60,
        placeholder: "git init",
      },
      taskField(false),
      {
        kind: "rows",
        key: "checks",
        label: "Vérifications",
        hint: "Selon l'attendu : la branche (branch, no-branch, on-branch, merge-commit, linear), le message (commit), le minimum (commits), le chemin et son contenu (file).",
        max: 20,
        columns: [
          { key: "label", label: "Libellé", required: true },
          {
            key: "expect",
            label: "Attendu",
            kind: "select",
            required: true,
            options: [
              { value: "branch", label: "la branche existe" },
              { value: "no-branch", label: "la branche a disparu" },
              { value: "on-branch", label: "HEAD est sur la branche" },
              { value: "commit", label: "un commit avec ce message" },
              { value: "commits", label: "au moins N commits" },
              { value: "file", label: "un fichier" },
              { value: "merge-commit", label: "un commit de fusion" },
              { value: "linear", label: "un historique linéaire" },
              { value: "clean", label: "rien à enregistrer" },
            ],
          },
          { key: "branch", label: "Branche", placeholder: "main" },
          { key: "message", label: "Message" },
          { key: "min", label: "Min", kind: "number" },
          { key: "path", label: "Chemin" },
          { key: "contains", label: "Contient" },
          { key: "lacks", label: "Ne contient pas" },
        ],
      },
      hintsField(10),
    ],
  },
  {
    name: "PhotoOsint",
    fields: [
      idField(),
      titleField,
      {
        kind: "text",
        key: "src",
        label: "Photo",
        hint: "Un .jpg de public/osint : /osint/nom.jpg.",
        required: true,
        placeholder: "/osint/",
      },
      { kind: "text", key: "alt", label: "Texte alternatif", required: true },
      { kind: "text", key: "caption", label: "Légende qui circule" },
      taskField(true),
      {
        kind: "group",
        key: "answer",
        label: "Lieu de la prise de vue",
        required: true,
        fields: [
          { kind: "number", key: "latitude", label: "Latitude", required: true, min: -90, max: 90 },
          {
            kind: "number",
            key: "longitude",
            label: "Longitude",
            required: true,
            min: -180,
            max: 180,
          },
          {
            kind: "number",
            key: "radiusKm",
            label: "Tolérance (km)",
            hint: "20 par défaut.",
            min: 0.1,
            max: 500,
          },
        ],
      },
      { kind: "text", key: "place", label: "Le lieu, nommé une fois trouvé", required: true },
      { kind: "textarea", key: "conclusion", label: "Conclusion" },
      hintsField(6),
    ],
  },
  {
    name: "NetworkLab",
    fields: [
      idField(),
      titleField,
      taskField(true),
      {
        kind: "json",
        key: "devices",
        label: "Appareils",
        hint: 'En JSON : [{ "id": "pc1", "kind": "pc", "name": "PC1", "x": 80, "y": 200, "addresses": { "eth0": "192.168.1.10/24" } }]',
        required: true,
        rows: 6,
      },
      {
        kind: "json",
        key: "links",
        label: "Câbles",
        hint: 'Des paires d\'identifiants : [["pc1", "sw1"], ["pc2", "sw1"]]',
        rows: 2,
      },
      {
        kind: "json",
        key: "checks",
        label: "Vérifications",
        hint: 'expect : ping (from, to), address (device, in), gateway (device, is), route (device, to, via), link (between), count (kind, min) ; [{ "label": "…", "expect": "ping", "from": "PC1", "to": "PC2" }]',
        rows: 4,
      },
      hintsField(8),
      {
        kind: "boolean",
        key: "locked",
        label: "Topologie figée",
        hint: "L'apprenant configure les appareils mais n'en ajoute ni n'en retire, ni de câble.",
      },
    ],
  },
  {
    name: "StepAnimation",
    fields: [
      idField(),
      { kind: "select", key: "scene", label: "Scène", required: true, options: SCENES },
      { ...titleField, hint: "Remplace le titre de la scène." },
      {
        kind: "text",
        key: "caption",
        label: "Légende",
        hint: "Ce que la leçon veut faire remarquer.",
      },
    ],
  },
  {
    name: "PhpLab",
    fields: [
      idField(),
      titleField,
      taskField(true),
      {
        kind: "text",
        key: "file",
        label: "Page à corriger",
        hint: "Son chemin : index.php, search.php, lib/data.php.",
        placeholder: "index.php",
      },
      {
        kind: "textarea",
        key: "code",
        label: "Code de la page",
        required: true,
        mono: true,
        rows: 10,
      },
      {
        kind: "map",
        key: "support",
        label: "Pages d'appui",
        hint: "Lues sans être modifiées : un auth.php, un data.php ; au plus cinq.",
        keyLabel: "Chemin",
        valueLabel: "Code",
        multiline: true,
        max: 5,
      },
      {
        kind: "rows",
        key: "requests",
        label: "Requêtes proposées",
        hint: "Des boutons ; la première remplit la barre d'adresse.",
        max: 8,
        columns: [
          { key: "label", label: "Libellé", required: true },
          {
            key: "method",
            label: "Méthode",
            kind: "select",
            options: [
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
            ],
          },
          { key: "url", label: "Adresse", required: true, placeholder: "/search.php?q=php" },
          { key: "cookie", label: "Cookie" },
          { key: "body", label: "Corps (POST)" },
        ],
      },
      {
        kind: "json",
        key: "checks",
        label: "Vérifications",
        hint: 'kind : seen (l\'attaque a marché, when) ou fixed (request rejouée) ; expect : status, contains, notContains, executable. [{ "kind": "seen", "label": "…", "expect": { "executable": true } }]',
        rows: 5,
      },
      hintsField(8),
    ],
  },
  {
    name: "SubnetDrill",
    fields: [
      idField(),
      titleField,
      taskField(false, "Une ligne au-dessus des questions."),
      {
        kind: "multiselect",
        key: "kinds",
        label: "Questions posées",
        hint: "Toutes, si aucune n'est cochée.",
        options: SUBNET_KINDS,
      },
      {
        kind: "group",
        key: "prefixes",
        label: "Préfixes tirés",
        hint: "De /24 à /30 par défaut ; entre /8 et /30.",
        fields: [
          { kind: "number", key: "min", label: "Minimum", min: 8, max: 30, integer: true },
          { kind: "number", key: "max", label: "Maximum", min: 8, max: 30, integer: true },
        ],
      },
      {
        kind: "number",
        key: "count",
        label: "Questions par série",
        hint: "5 par défaut.",
        min: 1,
        max: 20,
        integer: true,
      },
    ],
  },
  {
    name: "PacketDissector",
    fields: [
      idField(),
      titleField,
      taskField(false),
      {
        kind: "json",
        key: "frame",
        label: "Trame",
        hint: 'En JSON : eth (src, dst), puis ip (src, dst, ttl, id) avec tcp (sport, dport, seq, ack, flags, window), udp ou icmp, ou bien arp ; payload en texte. { "eth": { "src": "08:00:27:4e:66:a1", "dst": "00:0c:29:1a:2b:3c" }, "ip": { "src": "192.168.1.42", "dst": "93.184.216.34" }, "tcp": { "sport": 50324, "dport": 80 } }',
        required: true,
        rows: 6,
      },
      {
        kind: "list",
        key: "find",
        label: "Champs à retrouver",
        hint: "couche.champ : eth.dst, ip.dst, tcp.dport, payload.data ; au plus dix.",
        max: 10,
        placeholder: "ip.dst",
      },
    ],
  },
  {
    name: "PutInOrder",
    fields: [
      idField(),
      titleField,
      taskField(true),
      {
        kind: "list",
        key: "items",
        label: "Éléments, dans le bon ordre",
        hint: "De trois à dix ; mélangés à l'affichage.",
        required: true,
        min: 3,
        max: 10,
      },
      explanationField,
      hintField,
    ],
  },
  {
    name: "MatchPairs",
    fields: [
      idField(),
      titleField,
      taskField(true),
      {
        kind: "rows",
        key: "pairs",
        label: "Paires",
        hint: "De trois à huit ; la colonne de droite est mélangée.",
        required: true,
        min: 3,
        max: 8,
        columns: [
          { key: "left", label: "Gauche", required: true },
          { key: "right", label: "Droite", required: true },
        ],
      },
      explanationField,
      hintField,
    ],
  },
  {
    name: "CryptoWorkshop",
    fields: [
      idField(),
      titleField,
      taskField(false),
      {
        kind: "multiselect",
        key: "tools",
        label: "Outils",
        hint: "Dans cet ordre ; le premier est ouvert. Tous, si aucun n'est coché.",
        options: TOOLS,
      },
      {
        kind: "textarea",
        key: "input",
        label: "Texte de départ",
        hint: "Ce que l'entrée contient d'abord, pour avoir quelque chose à transformer.",
        rows: 2,
      },
      {
        kind: "group",
        key: "challenge",
        label: "Message à déchiffrer",
        fields: [
          {
            kind: "textarea",
            key: "ciphertext",
            label: "Chiffré",
            required: true,
            mono: true,
            rows: 2,
          },
          { kind: "text", key: "answer", label: "En clair", required: true },
          { kind: "text", key: "hint", label: "Indice", hint: "Après une première erreur." },
        ],
      },
    ],
  },
  {
    name: "JwtLab",
    fields: [
      idField(),
      titleField,
      taskField(false, "Au-dessus de l'atelier ; chaque étape donne la sienne."),
      {
        kind: "multiselect",
        key: "levels",
        label: "Étapes",
        hint: "Dans cet ordre ; la première est ouverte. Toutes, si aucune n'est cochée. « Services corrigés » rejoue les attaques des étapes cochées : il en faut au moins une.",
        options: JWT_LEVEL_OPTIONS,
      },
    ],
  },
  {
    name: "FirewallLab",
    fields: [
      idField(),
      titleField,
      taskField(true),
      {
        kind: "textarea",
        key: "rules",
        label: "Règles de départ",
        hint: "Une par ligne ; « policy accept » si rien.",
        mono: true,
        rows: 3,
        placeholder: "policy accept",
      },
      {
        kind: "rows",
        key: "probes",
        label: "Sondes",
        hint: "Des paquets d'essai : ce que le pare-feu doit en faire une fois l'exercice fini. Pas de port pour icmp.",
        required: true,
        min: 1,
        max: 10,
        columns: [
          { key: "label", label: "Libellé", required: true },
          {
            key: "proto",
            label: "Protocole",
            kind: "select",
            required: true,
            options: [
              { value: "tcp", label: "tcp" },
              { value: "udp", label: "udp" },
              { value: "icmp", label: "icmp" },
            ],
          },
          { key: "from", label: "Depuis", required: true, placeholder: "203.0.113.5" },
          { key: "port", label: "Port", kind: "number" },
          {
            key: "state",
            label: "État",
            kind: "select",
            options: [
              { value: "new", label: "nouvelle connexion" },
              { value: "established", label: "réponse à une connexion ouverte" },
            ],
          },
          {
            key: "expect",
            label: "Attendu",
            kind: "select",
            required: true,
            options: [
              { value: "accept", label: "accepté" },
              { value: "block", label: "bloqué" },
            ],
          },
        ],
      },
      hintsField(6),
    ],
  },
  {
    name: "LogHunt",
    fields: [
      idField(),
      titleField,
      taskField(true),
      {
        kind: "rows",
        key: "events",
        label: "Événements écrits un par un",
        hint: "Ceux qui comptent. L'heure s'écrit AAAA-MM-JJ HH:MM:SS.",
        max: 80,
        columns: [
          { key: "time", label: "Heure", required: true, placeholder: "2026-01-10 03:14:02" },
          { key: "source", label: "Source", required: true, placeholder: "sshd" },
          { key: "host", label: "Hôte" },
          { key: "ip", label: "IP" },
          { key: "user", label: "Compte" },
          { key: "action", label: "Action", required: true, placeholder: "Accepted password" },
        ],
      },
      {
        kind: "json",
        key: "series",
        label: "Séries générées",
        hint: 'Le bruit et les rafales : [{ "count": 24, "from": "2026-01-10 03:09:00", "to": "2026-01-10 03:14:00", "source": "sshd", "hosts": ["web01"], "ips": ["203.0.113.9"], "users": ["admin"], "actions": ["Failed password"] }]',
        rows: 5,
      },
      {
        kind: "rows",
        key: "questions",
        label: "Questions",
        hint: "La réponse est dans la table ; plusieurs réponses acceptées se séparent par |.",
        required: true,
        min: 1,
        max: 6,
        columns: [
          { key: "label", label: "Question", required: true },
          { key: "answer", label: "Réponse", kind: "texts", required: true },
          { key: "hint", label: "Indice" },
        ],
      },
    ],
  },
  {
    name: "HexEditor",
    fields: [
      idField(),
      titleField,
      taskField(true),
      {
        kind: "textarea",
        key: "bytes",
        label: "Octets",
        hint: "En hexadécimal, deux chiffres par octet : 89 50 4e 47.",
        required: true,
        mono: true,
        rows: 4,
      },
      { kind: "text", key: "filename", label: "Nom du fichier", placeholder: "photo.png" },
      { kind: "boolean", key: "editable", label: "Octets modifiables", default: true },
      {
        kind: "rows",
        key: "repairs",
        label: "Réparations",
        hint: "Les octets attendus à un décalage, pour que le fichier soit réparé.",
        max: 8,
        columns: [
          { key: "label", label: "Libellé", required: true },
          { key: "offset", label: "Décalage", kind: "number", required: true },
          { key: "bytes", label: "Octets", required: true, placeholder: "89 50" },
        ],
      },
      {
        kind: "rows",
        key: "questions",
        label: "Questions",
        hint: "Plusieurs réponses acceptées se séparent par |.",
        max: 6,
        columns: [
          { key: "label", label: "Question", required: true },
          { key: "answer", label: "Réponse", kind: "texts", required: true },
          { key: "hint", label: "Indice" },
        ],
      },
      hintsField(6),
    ],
  },
  {
    name: "IncidentStory",
    fields: [
      idField(),
      titleField,
      {
        kind: "text",
        key: "role",
        label: "Rôle",
        hint: "Qui est l'apprenant dans l'histoire.",
        placeholder: "Tu es la personne d'astreinte.",
      },
      taskField(false, "Au-dessus de l'histoire ; les scènes disent le reste."),
      {
        kind: "json",
        key: "scenes",
        label: "Scènes",
        hint: "La première est le début. Chacune : id, title, text, puis choices (text, next, verdict good/risky/bad, consequence) ou ending (success, partial, failure).",
        required: true,
        rows: 18,
        placeholder:
          '[{ "id": "alerte", "title": "9 h 04", "text": "…", "choices": [{ "text": "…", "next": "fin", "verdict": "good", "consequence": "…" }, { "text": "…", "next": "fin", "verdict": "bad", "consequence": "…" }] }, { "id": "fin", "text": "…", "ending": "success" }]',
      },
    ],
  },
];

export const COMPONENT_FORMS: ReadonlyMap<string, ComponentForm> = new Map(
  FORMS.map((form) => [form.name, form]),
);

export function componentForm(name: string): ComponentForm | undefined {
  return COMPONENT_FORMS.get(name);
}

// ── The components' own parsers ───────────────────────────────────────────────

type Parser = (
  attrs: Readonly<Record<string, unknown>>,
) => { ok: true } | { ok: false; problem: string };

/**
 * The parsers of @cyberlearn/types, which the page and the save-time check
 * read the props with. Run on the attributes once the fields are in order,
 * so a form refuses what the page refuses, in the page's words.
 */
const PARSERS: ReadonlyMap<string, Parser> = new Map<string, Parser>([
  ["PythonChallenge", (attrs) => parseChallengeTests(attrs.tests)],
  ["FindTheFlaw", (attrs) => parseFindTheFlaw(attrs)],
  ["PhishingEmail", (attrs) => parsePhishingEmail(attrs)],
  ["SqlPlayground", (attrs) => parseSqlPlayground(attrs)],
  ["SqlInjectionLab", (attrs) => parseSqlInjectionLab(attrs)],
  ["GitSandbox", (attrs) => parseGitSandbox(attrs)],
  ["PhotoOsint", (attrs) => parsePhotoOsint(attrs)],
  ["NetworkLab", (attrs) => parseNetworkLab(attrs)],
  ["StepAnimation", (attrs) => parseStepAnimation(attrs)],
  ["PhpLab", (attrs) => parsePhpLab(attrs)],
  ["SubnetDrill", (attrs) => parseSubnetDrill(attrs)],
  ["PacketDissector", (attrs) => parsePacketDissector(attrs)],
  ["PutInOrder", (attrs) => parsePutInOrder(attrs)],
  ["MatchPairs", (attrs) => parseMatchPairs(attrs)],
  ["CryptoWorkshop", (attrs) => parseCryptoWorkshop(attrs)],
  ["FirewallLab", (attrs) => parseFirewallLab(attrs)],
  ["LogHunt", (attrs) => parseLogHunt(attrs)],
  ["HexEditor", (attrs) => parseHexEditor(attrs)],
  ["IncidentStory", (attrs) => parseIncidentStory(attrs)],
  ["JwtLab", (attrs) => parseJwtLab(attrs)],
]);

/**
 * The field a parser's problem is about, and the problem without that
 * prefix. A parser writes `path.to.field : message`; the first segment is a
 * field of the form, or the problem is about the block as a whole (FORM).
 */
export function problemField(form: ComponentForm, problem: string): [string, string] {
  const match = /^([A-Za-z_]\w*)((?:\.\w+)*) : ([\s\S]*)$/.exec(problem);
  const key = match?.[1];
  if (key !== undefined && form.fields.some((field) => field.key === key)) {
    const rest = match?.[2] ?? "";
    const message = match?.[3] ?? problem;
    return [key, rest === "" ? message : `${rest.slice(1)} : ${message}`];
  }
  return [FORM, problem];
}

// ── Validation ─────────────────────────────────────────────────────────────────

/** Errors by field key; `INNER` for the children, `FORM` for the block as a whole. */
export type FormErrors = Record<string, string>;

function isBlank(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === "string" && value.trim() === "")
  );
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkNumber(
  field: Extract<FieldSpec, { kind: "number" }>,
  value: unknown,
): string | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return "Un nombre.";
  if (field.integer === true && !Number.isInteger(value)) return "Un nombre entier.";
  if (field.min !== undefined && value < field.min) return `Au moins ${String(field.min)}.`;
  if (field.max !== undefined && value > field.max) return `Au plus ${String(field.max)}.`;
  return undefined;
}

/** The errors of `fields` over `values`; children and nested blocks are read from `inner`. */
function validateFields(
  fields: readonly FieldSpec[],
  values: Readonly<Record<string, unknown>>,
  inner: string | null,
  innerBlocks: readonly string[],
): FormErrors {
  const errors: FormErrors = {};
  for (const field of fields) {
    const value = field.kind === "children" || field.kind === "blocks" ? inner : values[field.key];
    const missing =
      isBlank(value) ||
      (Array.isArray(value) && value.length === 0) ||
      (isRecord(value) && Object.keys(value).length === 0);
    if (missing) {
      if (field.required === true) errors[field.key] = "Obligatoire.";
      continue;
    }
    const problem = fieldProblem(field, value, values, innerBlocks);
    if (problem !== undefined) errors[field.key] = problem;
  }
  return errors;
}

function fieldProblem(
  field: FieldSpec,
  value: unknown,
  values: Readonly<Record<string, unknown>>,
  innerBlocks: readonly string[],
): string | undefined {
  switch (field.kind) {
    case "text": {
      if (typeof value !== "string") return "Du texte.";
      if (field.pattern !== undefined && !field.pattern.test(value)) {
        return field.patternHint ?? "Mal formé.";
      }
      return undefined;
    }
    case "textarea":
    case "children":
      return typeof value === "string" ? undefined : "Du texte.";
    case "number":
      return checkNumber(field, value);
    case "boolean":
      return typeof value === "boolean" ? undefined : "Oui ou non.";
    case "select":
      return field.options.some((option) => option.value === value)
        ? undefined
        : "Une des valeurs proposées.";
    case "multiselect": {
      if (!isStringList(value)) return "Une liste de choix.";
      const stranger = value.find((item) => !field.options.some((o) => o.value === item));
      if (stranger !== undefined) return `« ${stranger} » n'est pas un des choix.`;
      if (field.min !== undefined && value.length < field.min) {
        return `Au moins ${String(field.min)}.`;
      }
      return undefined;
    }
    case "list": {
      if (!isStringList(value)) return "Une liste de textes.";
      if (value.some((item) => item.trim() === "")) return "Une ligne est vide.";
      if (field.min !== undefined && value.length < field.min) {
        return `Au moins ${String(field.min)}.`;
      }
      if (field.max !== undefined && value.length > field.max) {
        return `Au plus ${String(field.max)}.`;
      }
      return undefined;
    }
    case "map": {
      if (!isRecord(value)) return "Des paires clé et valeur.";
      const entries = Object.entries(value);
      if (entries.some(([key, item]) => key.trim() === "" || typeof item !== "string")) {
        return "Chaque ligne a une clé et un texte.";
      }
      if (field.max !== undefined && entries.length > field.max) {
        return `Au plus ${String(field.max)}.`;
      }
      return undefined;
    }
    case "choices": {
      const correct = values[field.correctKey];
      if (!isStringList(value)) return "Une liste de textes.";
      if (value.some((item) => item.trim() === "")) return "Une option est vide.";
      if (value.length < (field.min ?? 2)) return `Au moins ${String(field.min ?? 2)} options.`;
      if (
        typeof correct !== "number" ||
        !Number.isInteger(correct) ||
        correct < 0 ||
        correct >= value.length
      ) {
        return "Coche la bonne option.";
      }
      return undefined;
    }
    case "rows": {
      if (!Array.isArray(value) || !value.every(isRecord)) return "Une liste de lignes.";
      if (field.min !== undefined && value.length < field.min) {
        return `Au moins ${String(field.min)}.`;
      }
      if (field.max !== undefined && value.length > field.max) {
        return `Au plus ${String(field.max)}.`;
      }
      return value.map((row, index) => rowProblem(field.columns, row, index)).find(Boolean);
    }
    case "group": {
      if (!isRecord(value)) return "Un groupe de champs.";
      const nested = validateFields(field.fields, value, null, []);
      const [key, problem] = Object.entries(nested)[0] ?? [];
      if (key === undefined || problem === undefined) return undefined;
      const label = field.fields.find((f) => f.key === key)?.label ?? key;
      return `${label} : ${problem}`;
    }
    case "json":
      return undefined;
    case "blocks": {
      const stranger = innerBlocks.find((name) => !field.allowed.includes(name as never));
      if (stranger !== undefined) {
        return `Seulement ${field.allowed.join(", ")} ici, pas ${stranger}.`;
      }
      if (field.min !== undefined && innerBlocks.length < field.min) {
        return `Au moins ${String(field.min)}.`;
      }
      return undefined;
    }
  }
}

function rowProblem(
  columns: readonly RowColumn[],
  row: Record<string, unknown>,
  index: number,
): string | undefined {
  const line = `Ligne ${String(index + 1)}`;
  for (const column of columns) {
    const value = row[column.key];
    if (isBlank(value)) {
      if (column.required === true) return `${line} : ${column.label} manque.`;
      continue;
    }
    if (column.kind === "number") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return `${line} : ${column.label} doit être un nombre.`;
      }
    } else if (column.kind === "select") {
      if (!column.options?.some((option) => option.value === value)) {
        return `${line} : ${column.label} n'est pas une des valeurs proposées.`;
      }
    } else if (column.kind === "boolean") {
      if (typeof value !== "boolean") return `${line} : ${column.label} vaut oui ou non.`;
    } else if (column.kind === "texts") {
      if (typeof value !== "string" && !isStringList(value)) {
        return `${line} : ${column.label} doit être du texte, ou plusieurs séparés par |.`;
      }
    } else if (typeof value !== "string") {
      return `${line} : ${column.label} doit être du texte.`;
    }
  }
  return undefined;
}

/**
 * What is wrong with a block's attributes and children, for `form`. A
 * missing optional field is fine; a present one must be of its kind and in
 * its bounds. `inner` is the text between the tags (`null` when none), and
 * `innerBlocks` the names of the component blocks it holds, for the "blocks"
 * kind, which the editor parses on its side. Once the fields are in order,
 * the component's parser, when it has one, has the last word.
 */
export function validateComponent(
  form: ComponentForm,
  attrs: Readonly<Record<string, unknown>>,
  inner: string | null,
  innerBlocks: readonly string[] = [],
): FormErrors {
  const errors = validateFields(form.fields, attrs, inner, innerBlocks);
  if (Object.keys(errors).length > 0) return errors;
  const parser = PARSERS.get(form.name);
  if (!parser) return errors;
  const result = parser(attrs);
  if (!result.ok) {
    const [key, problem] = problemField(form, result.problem);
    errors[key] = problem;
  }
  return errors;
}

// ── Identifiers ────────────────────────────────────────────────────────────────

/**
 * `base`, or `base` with its trailing number bumped until no block has it:
 * a second Quiz pasted from the guide becomes q-2, not a twin of q-1 whose
 * answers would be recorded under the same key.
 */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  const match = /^(.*?)(\d+)$/.exec(base);
  const stem = match?.[1] ?? `${base}-`;
  let n = match?.[2] === undefined ? 2 : Number(match[2]) + 1;
  while (taken.has(`${stem}${String(n)}`)) n += 1;
  return `${stem}${String(n)}`;
}
