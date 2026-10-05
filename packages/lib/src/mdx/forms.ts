import type { LessonComponentName } from "./names.js";

/**
 * How the block editor lays a component out as a form.
 *
 * A component block is its attributes and, between the tags, its children.
 * Rather than one hand-written form per component, each component declares
 * its fields: what they are called, what kind of value they hold, what is
 * required and within which bounds. The editor draws the fields, and
 * validateComponent says, field by field and in French, what is still
 * wrong. The same declarations will carry the exercises and labs when their
 * forms come; the field kinds are chosen for them too (rows, maps, nested
 * blocks).
 *
 * The bounds repeat what the components check on the page, so a form says
 * before the save what the page would refuse after it. The save still runs
 * the full check (checkLessonMdx): this is the early word, not the last.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface RowColumn {
  key: string;
  label: string;
  kind?: "text" | "number" | "select";
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
  | (FieldBase & { kind: "textarea"; mono?: boolean; rows?: number })
  | (FieldBase & { kind: "number"; min?: number; max?: number; integer?: boolean })
  | (FieldBase & { kind: "boolean" })
  | (FieldBase & { kind: "select"; options: readonly SelectOption[] })
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

const ID_PATTERN = /^[A-Za-z0-9][\w-]*$/;
const ID_HINT = "Lettres, chiffres, tirets et tirets bas, sans espace.";

const idField = (hint: string): FieldSpec => ({
  kind: "text",
  key: "id",
  label: "Identifiant",
  hint,
  required: true,
  pattern: ID_PATTERN,
  patternHint: ID_HINT,
});

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

const FORMS: readonly ComponentForm[] = [
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
      { kind: "text", key: "title", label: "Titre" },
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
      idField("Propre à la leçon."),
      { kind: "text", key: "title", label: "Titre" },
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
      { kind: "list", key: "hints", label: "Indices", max: 20 },
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
      { kind: "text", key: "title", label: "Titre" },
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
];

export const COMPONENT_FORMS: ReadonlyMap<string, ComponentForm> = new Map(
  FORMS.map((form) => [form.name, form]),
);

export function componentForm(name: string): ComponentForm | undefined {
  return COMPONENT_FORMS.get(name);
}

// ── Validation ─────────────────────────────────────────────────────────────────

/** Errors by field key; `INNER` for the children. Empty when the block is good to go. */
export type FormErrors = Record<string, string>;

function isBlank(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === "string" && value.trim() === "")
  );
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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

/**
 * What is wrong with a block's attributes and children, for `form`. A
 * missing optional field is fine; a present one must be of its kind and in
 * its bounds. `inner` is the text between the tags (`null` when none), and
 * `innerBlocks` the names of the component blocks it holds, for the "blocks"
 * kind, which the editor parses on its side.
 */
export function validateComponent(
  form: ComponentForm,
  attrs: Readonly<Record<string, unknown>>,
  inner: string | null,
  innerBlocks: readonly string[] = [],
): FormErrors {
  const errors: FormErrors = {};
  for (const field of form.fields) {
    const value = field.kind === "children" || field.kind === "blocks" ? inner : attrs[field.key];
    const missing = isBlank(value) || (Array.isArray(value) && value.length === 0);
    if (missing) {
      if (field.required === true) errors[field.key] = "Obligatoire.";
      continue;
    }
    switch (field.kind) {
      case "text": {
        if (typeof value !== "string") errors[field.key] = "Du texte.";
        else if (field.pattern !== undefined && !field.pattern.test(value)) {
          errors[field.key] = field.patternHint ?? "Mal formé.";
        }
        break;
      }
      case "textarea":
      case "children": {
        if (typeof value !== "string") errors[field.key] = "Du texte.";
        break;
      }
      case "number": {
        const problem = checkNumber(field, value);
        if (problem !== undefined) errors[field.key] = problem;
        break;
      }
      case "boolean": {
        if (typeof value !== "boolean") errors[field.key] = "Oui ou non.";
        break;
      }
      case "select": {
        if (!field.options.some((option) => option.value === value)) {
          errors[field.key] = "Une des valeurs proposées.";
        }
        break;
      }
      case "list": {
        if (!isStringList(value)) errors[field.key] = "Une liste de textes.";
        else if (value.some((item) => item.trim() === ""))
          errors[field.key] = "Une ligne est vide.";
        else if (field.min !== undefined && value.length < field.min) {
          errors[field.key] = `Au moins ${String(field.min)}.`;
        } else if (field.max !== undefined && value.length > field.max) {
          errors[field.key] = `Au plus ${String(field.max)}.`;
        }
        break;
      }
      case "map": {
        if (typeof value !== "object" || Array.isArray(value)) {
          errors[field.key] = "Des paires clé et valeur.";
          break;
        }
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.some(([key, item]) => key.trim() === "" || typeof item !== "string")) {
          errors[field.key] = "Chaque ligne a une clé et un texte.";
        } else if (field.max !== undefined && entries.length > field.max) {
          errors[field.key] = `Au plus ${String(field.max)}.`;
        }
        break;
      }
      case "choices": {
        const correct = attrs[field.correctKey];
        if (!isStringList(value)) errors[field.key] = "Une liste de textes.";
        else if (value.some((item) => item.trim() === ""))
          errors[field.key] = "Une option est vide.";
        else if (value.length < (field.min ?? 2)) {
          errors[field.key] = `Au moins ${String(field.min ?? 2)} options.`;
        } else if (
          typeof correct !== "number" ||
          !Number.isInteger(correct) ||
          correct < 0 ||
          correct >= value.length
        ) {
          errors[field.key] = "Coche la bonne option.";
        }
        break;
      }
      case "rows": {
        if (!Array.isArray(value) || value.some((row) => typeof row !== "object" || row === null)) {
          errors[field.key] = "Une liste de lignes.";
          break;
        }
        const rows = value as Record<string, unknown>[];
        if (field.min !== undefined && rows.length < field.min) {
          errors[field.key] = `Au moins ${String(field.min)}.`;
          break;
        }
        if (field.max !== undefined && rows.length > field.max) {
          errors[field.key] = `Au plus ${String(field.max)}.`;
          break;
        }
        const problem = rows
          .map((row, index) => rowProblem(field.columns, row, index))
          .find(Boolean);
        if (problem !== undefined) errors[field.key] = problem;
        break;
      }
      case "blocks": {
        const stranger = innerBlocks.find((name) => !field.allowed.includes(name as never));
        if (stranger !== undefined) {
          errors[field.key] = `Seulement ${field.allowed.join(", ")} ici, pas ${stranger}.`;
        } else if (field.min !== undefined && innerBlocks.length < field.min) {
          errors[field.key] = `Au moins ${String(field.min)}.`;
        }
        break;
      }
    }
  }
  return errors;
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
    } else if (typeof value !== "string") {
      return `${line} : ${column.label} doit être du texte.`;
    }
  }
  return undefined;
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
