import { type CommandSpec, commandSpec, type OptionSpec } from "./commands.js";

/**
 * A command line explained word by word: what the command does, what each
 * option means, what the other words are, what the pipes and redirections
 * do. The learner clicks a command in a terminal (a step of the exercise, or
 * one they typed) and reads this. The words come from commands.ts; what is
 * not there is still named for what it is: an option, an argument, a path,
 * a variable, a pattern.
 *
 * Pure: the site and the app read the same explanation.
 */

export type PartKind =
  | "command"
  | "subcommand"
  | "option"
  | "value"
  | "operand"
  | "operator"
  | "assignment"
  | "unknown";

export interface ExplainedPart {
  /** The word as typed, quotes included. */
  text: string;
  kind: PartKind;
  /** In French: what this word does here. */
  role: string;
}

export interface ExplainedCommand {
  name: string;
  summary: string;
  known: boolean;
}

export interface Explanation {
  parts: ExplainedPart[];
  /** The commands the line runs, in order. */
  commands: ExplainedCommand[];
}

/** In French, for a label next to a part. */
export const PART_KIND_LABELS: Record<PartKind, string> = {
  command: "commande",
  subcommand: "action",
  option: "option",
  value: "valeur",
  operand: "argument",
  operator: "opérateur",
  assignment: "variable",
  unknown: "inconnu",
};

// ── Tokens ───────────────────────────────────────────────────────────────────

type Quoted = "none" | "single" | "double";

export interface Token {
  /** As typed, quotes and backslashes included. */
  text: string;
  /** Without the quotes and the escaping backslashes. */
  plain: string;
  quoted: Quoted;
  operator: boolean;
}

/** Longest first, so that `2>&1` is not read as `2`, `>`, `&`, `1`. */
const OPERATORS = [
  "2>&1",
  "1>&2",
  "&>>",
  "&>",
  "2>>",
  "2>",
  "1>",
  ">>",
  ">",
  "<<",
  "<",
  "||",
  "|&",
  "|",
  "&&",
  "&",
  ";;",
  ";",
  "(",
  ")",
];

/** The line cut into words and operators, the shell's way: quotes, backslashes, `$(...)`. */
export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let text = "";
  let plain = "";
  let quoted: Quoted = "none";
  let inQuote: "'" | '"' | "`" | null = null;
  let depth = 0;

  const flush = (): void => {
    if (text !== "") tokens.push({ text, plain, quoted, operator: false });
    text = "";
    plain = "";
    quoted = "none";
  };

  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (inQuote !== null) {
      text += ch;
      if (ch === inQuote) {
        inQuote = null;
        if (ch === "`") plain += ch;
      } else if (ch === "\\" && inQuote === '"' && i + 1 < line.length) {
        text += line.charAt(i + 1);
        plain += line.charAt(i + 1);
        i++;
      } else {
        plain += ch;
      }
      continue;
    }
    if (depth > 0) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      text += ch;
      plain += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      text += ch;
      if (quoted === "none") quoted = ch === "'" ? "single" : "double";
      continue;
    }
    if (ch === "`") {
      inQuote = "`";
      text += ch;
      plain += ch;
      continue;
    }
    if (ch === "\\" && i + 1 < line.length) {
      text += ch + line.charAt(i + 1);
      plain += line.charAt(i + 1);
      i++;
      continue;
    }
    if (ch === "$" && line.charAt(i + 1) === "(") {
      depth = 1;
      text += "$(";
      plain += "$(";
      i++;
      continue;
    }
    if (ch === " " || ch === "\t") {
      flush();
      continue;
    }
    const op = OPERATORS.find((candidate) => line.startsWith(candidate, i));
    if (op !== undefined) {
      flush();
      tokens.push({ text: op, plain: op, quoted: "none", operator: true });
      i += op.length - 1;
      continue;
    }
    text += ch;
    plain += ch;
  }
  flush();
  return tokens;
}

// ── Words of the shell ───────────────────────────────────────────────────────

const OPERATOR_ROLES: Readonly<Record<string, string>> = {
  "|": "tube : la sortie de la commande de gauche devient l'entrée de celle de droite",
  "|&": "tube qui emporte aussi les erreurs de la commande de gauche",
  "||": "ou : la commande de droite ne s'exécute que si celle de gauche a échoué",
  "&&": "et : la commande de droite ne s'exécute que si celle de gauche a réussi",
  ";": "puis : enchaîne la commande suivante, quel que soit le résultat",
  ";;": "la fin d'un cas, dans un case",
  "&": "en arrière-plan : le shell rend la main sans attendre la fin",
  ">": "redirige la sortie vers le fichier qui suit, écrasé s'il existe",
  "1>": "redirige la sortie normale (descripteur 1) vers le fichier qui suit",
  ">>": "ajoute la sortie à la fin du fichier qui suit",
  "<": "lit l'entrée dans le fichier qui suit, au lieu du clavier",
  "<<": "un document en ligne : l'entrée est le texte qui suit, jusqu'au mot de fin",
  "2>": "redirige les erreurs (la sortie d'erreur, descripteur 2) vers le fichier qui suit",
  "2>>": "ajoute les erreurs à la fin du fichier qui suit",
  "2>&1": "envoie les erreurs là où va la sortie normale",
  "1>&2": "envoie la sortie normale là où vont les erreurs",
  "&>": "redirige la sortie et les erreurs vers le fichier qui suit",
  "&>>": "ajoute la sortie et les erreurs à la fin du fichier qui suit",
  "(": "ouvre un sous-shell : ce qui est entre parenthèses s'exécute à part",
  ")": "ferme le sous-shell",
};

const REDIRECTS = new Set(["<", "<<", ">", "1>", ">>", "2>", "2>>", "&>", "&>>"]);

const PS_LETTERS: Readonly<Record<string, string>> = {
  a: "les processus de tous les utilisateurs, pas seulement les tiens",
  u: "le format utilisateur : propriétaire, CPU, mémoire, heure de lancement",
  x: "aussi les processus sans terminal, les services",
  e: "avec les variables d'environnement",
  f: "l'arbre des processus",
  w: "des lignes plus larges",
  l: "le format long",
  r: "ceux qui tournent seulement",
};

const SIGNALS: Readonly<Record<string, string>> = {
  "1": "HUP, raccrocher : beaucoup de services relisent leur configuration",
  HUP: "raccrocher : beaucoup de services relisent leur configuration",
  "2": "INT, interruption : comme Ctrl+C",
  INT: "interruption : comme Ctrl+C",
  "3": "QUIT : quitter, avec un fichier core",
  QUIT: "quitter, avec un fichier core",
  "9": "KILL : arrêt immédiat par le noyau, impossible à ignorer, sans rien fermer proprement",
  KILL: "arrêt immédiat par le noyau, impossible à ignorer, sans rien fermer proprement",
  "15": "TERM : une demande d'arrêt propre, le signal par défaut",
  TERM: "une demande d'arrêt propre, le signal par défaut",
  "18": "CONT : reprend un processus suspendu",
  CONT: "reprend un processus suspendu",
  "19": "STOP : suspend le processus, impossible à ignorer",
  STOP: "suspend le processus, impossible à ignorer",
  "20": "TSTP : suspend le processus, comme Ctrl+Z",
  TSTP: "suspend le processus, comme Ctrl+Z",
  "10": "USR1 : un signal libre, au programme d'en décider",
  USR1: "un signal libre, au programme d'en décider",
  "12": "USR2 : un signal libre, au programme d'en décider",
  USR2: "un signal libre, au programme d'en décider",
};

const DD_KEYS: Readonly<Record<string, string>> = {
  if: "le fichier ou le périphérique lu",
  of: "le fichier ou le périphérique écrit : tout son contenu est remplacé",
  bs: "la taille d'un bloc : 1M, 4k",
  count: "le nombre de blocs à copier",
  skip: "saute N blocs au début de l'entrée",
  seek: "saute N blocs au début de la sortie",
  status: "ce qui est affiché : progress montre l'avancement, none rien",
  conv: "des conversions : fsync écrit tout avant de finir, notrunc ne tronque pas la sortie",
  iflag: "des options de lecture",
  oflag: "des options d'écriture : direct, sync",
};

const PERM_NAMES: Readonly<Record<string, string>> = {
  r: "lecture",
  w: "écriture",
  x: "exécution",
  X: "exécution, pour les dossiers et ce qui l'est déjà",
  s: "setuid ou setgid",
  t: "sticky",
};

const WHO_NAMES: Readonly<Record<string, string>> = {
  u: "le propriétaire",
  g: "le groupe",
  o: "les autres",
  a: "tout le monde",
};

function octalDigitRole(digit: number, isSpecial: boolean): string {
  if (isSpecial) {
    const parts: string[] = [];
    if (digit & 4) parts.push("setuid : s'exécute avec les droits du propriétaire");
    if (digit & 2)
      parts.push(
        "setgid : s'exécute avec les droits du groupe, ou hérite du groupe pour un dossier",
      );
    if (digit & 1) parts.push("sticky : dans ce dossier, chacun ne supprime que ses fichiers");
    return parts.length === 0 ? "aucun bit spécial" : parts.join(", ");
  }
  const parts: string[] = [];
  if (digit & 4) parts.push("lecture");
  if (digit & 2) parts.push("écriture");
  if (digit & 1) parts.push("exécution");
  return parts.length === 0 ? "rien" : parts.join(" + ");
}

/** "640" or "u+x,go-w" in words; null when the word is not a mode. */
export function modeRole(word: string): string | null {
  if (/^[0-7]{3,4}$/u.test(word)) {
    const digits = Array.from(word, (d) => Number(d));
    const special = digits.length === 4 ? digits[0] : undefined;
    const [owner, group, others] = digits.slice(-3);
    const line = `propriétaire : ${octalDigitRole(owner ?? 0, false)} ; groupe : ${octalDigitRole(group ?? 0, false)} ; autres : ${octalDigitRole(others ?? 0, false)}`;
    return special === undefined ? line : `${octalDigitRole(special, true)} ; ${line}`;
  }
  const clauses = word.split(",");
  const roles: string[] = [];
  for (const clause of clauses) {
    const m = /^([ugoa]*)([-+=])([rwxXst]*)$/u.exec(clause);
    if (m === null) return null;
    const who =
      m[1] === undefined || m[1] === ""
        ? "tout le monde"
        : Array.from(m[1], (w) => WHO_NAMES[w] ?? w).join(" et ");
    const verb = m[2] === "+" ? "ajoute" : m[2] === "-" ? "retire" : "fixe exactement";
    const perms =
      m[3] === undefined || m[3] === ""
        ? "aucun droit"
        : Array.from(m[3], (p) => PERM_NAMES[p] ?? p).join(" + ");
    roles.push(`${verb} ${perms} pour ${who}`);
  }
  return roles.join(" ; ");
}

/** A sed program, in words; null when it is not one this reads. */
export function sedRole(program: string): string | null {
  const sub = /^s(.)(.*?)\1(.*?)\1([gipI0-9]*)$/u.exec(program);
  if (sub !== null) {
    const flags: string[] = [];
    const letters = sub[4] ?? "";
    if (letters.includes("g")) flags.push("partout sur la ligne, pas seulement la première fois");
    if (/[iI]/u.test(letters)) flags.push("sans distinguer majuscules et minuscules");
    if (letters.includes("p")) flags.push("et affiche la ligne");
    const nth = /\d+/u.exec(letters);
    if (nth !== null) flags.push(`la ${nth[0]}e occurrence seulement`);
    const base = `remplace « ${sub[2] ?? ""} » par « ${sub[3] ?? ""} »`;
    return flags.length === 0 ? base : `${base} (${flags.join(", ")})`;
  }
  const grepLike = /^\/(.+)\/([dp])$/u.exec(program);
  if (grepLike !== null) {
    return grepLike[2] === "d"
      ? `supprime les lignes qui contiennent « ${grepLike[1] ?? ""} »`
      : `affiche les lignes qui contiennent « ${grepLike[1] ?? ""} »`;
  }
  const range = /^(\d+)(?:,(\d+|\$))?([dp])$/u.exec(program);
  if (range !== null) {
    const what = range[3] === "d" ? "supprime" : "affiche";
    const to = range[2];
    if (to === undefined) return `${what} la ligne ${range[1] ?? ""}`;
    return `${what} les lignes ${range[1] ?? ""} à ${to === "$" ? "la fin" : to}`;
  }
  return null;
}

/** An awk program, in words; null when it is not one this reads. */
export function awkRole(program: string): string | null {
  const m = /^(?:\/(.+?)\/\s*)?\{\s*print\s+(\$\w+(?:\s*,\s*\$\w+)*)\s*\}$/u.exec(program);
  if (m === null) return null;
  const columns = (m[2] ?? "")
    .split(",")
    .map((c) => c.trim().slice(1))
    .map((c) => (c === "NF" ? "dernière" : c === "0" ? "ligne entière" : `${c}e`));
  const single = columns[0];
  const what =
    columns.length === 1 && single !== undefined
      ? single === "ligne entière"
        ? "affiche la ligne entière"
        : `affiche la ${single} colonne`
      : `affiche les colonnes ${columns.join(", ")}`;
  return m[1] === undefined ? what : `pour les lignes qui contiennent « ${m[1]} », ${what}`;
}

function findOption(spec: CommandSpec | undefined, name: string): OptionSpec | undefined {
  return spec?.options?.find((option) => option.names.includes(name));
}

function baseName(word: string): string {
  const slash = word.lastIndexOf("/");
  return slash === -1 ? word : word.slice(slash + 1);
}

function operandRole(token: Token, spec: CommandSpec | undefined, name: string): string {
  const w = token.plain;
  const own = spec?.operands;
  if (token.quoted === "single") {
    return `un texte pris tel quel : entre apostrophes, le shell n'interprète rien${own === undefined ? "" : ` (${own})`}`;
  }
  if (token.quoted === "double") {
    return `un texte où le shell remplace les variables mais garde les espaces${own === undefined ? "" : ` (${own})`}`;
  }
  if (w === "/dev/null")
    return "le trou noir : ce qui y est écrit disparaît, ce qu'on y lit est vide";
  if (w === ".") return "le dossier courant";
  if (w === "..") return "le dossier parent";
  if (w === "~") return "ton dossier personnel";
  if (w.startsWith("~/")) return "un chemin depuis ton dossier personnel";
  if (w === "/") return "la racine du système de fichiers";
  if (w === "-")
    return name === "cd" ? "le dossier précédent" : "l'entrée standard, à la place d'un fichier";
  if (w.startsWith("$(") || w.startsWith("`"))
    return "le résultat de la commande entre parenthèses, inséré ici";
  const variable = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/u.exec(w);
  if (variable !== null) return `la valeur de la variable ${variable[1] ?? ""}`;
  if (w === "*") return "tous les fichiers du dossier courant, sauf les cachés";
  const suffix = /^\*\.(\w+)$/u.exec(w);
  if (suffix !== null) return `tous les fichiers dont le nom finit par .${suffix[1] ?? ""}`;
  if (/[*?[]/u.test(w))
    return "un motif : le shell le remplace par les noms de fichiers qui correspondent";
  if (
    /^[^@\s]+@[^@\s]+$/u.test(w) &&
    ["ssh", "scp", "sftp", "rsync", "ssh-copy-id"].includes(name)
  ) {
    return "utilisateur@machine : le compte et la machine distante";
  }
  if (w.startsWith("/"))
    return `un chemin absolu, depuis la racine${own === undefined ? "" : ` : ${own}`}`;
  return own ?? `un argument de ${name}`;
}

// ── The line, word by word ──────────────────────────────────────────────────

interface Cursor {
  spec: CommandSpec | undefined;
  name: string;
  expectCommand: boolean;
  redirectTarget: boolean;
  sawSubcommand: boolean;
  positional: number;
  /** Options whose value is the next word, in order: tar's f then C. */
  pendingValues: { option: OptionSpec; text: string }[];
  /** Inside find's -exec, until \; or +. */
  execUntil: boolean;
}

function fresh(): Cursor {
  return {
    spec: undefined,
    name: "",
    expectCommand: true,
    redirectTarget: false,
    sawSubcommand: false,
    positional: 0,
    pendingValues: [],
    execUntil: false,
  };
}

function clusterRole(
  spec: CommandSpec | undefined,
  text: string,
  name: string,
  pending: Cursor["pendingValues"],
): { role: string; kind: PartKind } {
  const letters = text.startsWith("-") ? text.slice(1) : text;
  const roles: string[] = [];
  let unknown = 0;
  for (let k = 0; k < letters.length; k++) {
    const letter = letters.charAt(k);
    const option = findOption(spec, `-${letter}`);
    if (option === undefined) {
      unknown++;
      roles.push(
        `-${letter} : ${spec === undefined ? `une option de ${name}` : "une option que cette fiche ne détaille pas"}`,
      );
      continue;
    }
    if (option.value !== undefined) {
      const rest = letters.slice(k + 1);
      if (rest !== "") {
        roles.push(`-${letter} : ${option.role} (${option.value} : ${rest})`);
        return { role: roles.join(" · "), kind: "option" };
      }
      pending.push({ option, text: `-${letter}` });
    }
    roles.push(`-${letter} : ${option.role}`);
  }
  return { role: roles.join(" · "), kind: unknown === letters.length ? "unknown" : "option" };
}

function explainArgument(token: Token, cursor: Cursor, parts: ExplainedPart[]): void {
  const { spec, name } = cursor;
  const w = token.plain;
  const text = token.text;
  const style = spec?.style ?? "gnu";

  // The pending value of an option: tar f, head -n, ssh -p.
  const pending = cursor.pendingValues.shift();
  if (pending !== undefined) {
    parts.push({
      text,
      kind: "value",
      role: `${pending.option.value ?? "la valeur"} pour ${pending.text} : ${pending.option.role}`,
    });
    return;
  }

  if (cursor.execUntil) {
    if (w === ";" || w === "+") {
      cursor.execUntil = false;
      parts.push({
        text,
        kind: "operator",
        role:
          w === ";"
            ? "termine la commande de -exec, lancée une fois par fichier trouvé"
            : "termine la commande de -exec, lancée une fois avec tous les fichiers trouvés",
      });
    } else if (w === "{}") {
      parts.push({ text, kind: "value", role: "remplacé par le chemin de chaque fichier trouvé" });
    } else {
      parts.push({ text, kind: "operand", role: "un mot de la commande que -exec lance" });
    }
    return;
  }

  if (w === "--") {
    parts.push({
      text,
      kind: "operator",
      role: "la fin des options : ce qui suit est pris tel quel, même si ça commence par un tiret",
    });
    return;
  }

  // Styles that read a word by its position.
  if (style === "chmod" && cursor.positional === 0 && !w.startsWith("-")) {
    const role = modeRole(w);
    cursor.positional++;
    parts.push(
      role === null
        ? { text, kind: "operand", role: operandRole(token, spec, name) }
        : { text, kind: "value", role },
    );
    return;
  }
  if (style === "dd") {
    const eq = w.indexOf("=");
    if (eq > 0) {
      const key = w.slice(0, eq);
      const value = w.slice(eq + 1);
      const role = DD_KEYS[key];
      parts.push({
        text,
        kind: role === undefined ? "unknown" : "value",
        role:
          role === undefined
            ? `un paramètre de dd que cette fiche ne connaît pas (${value})`
            : `${role} : ${value}`,
      });
      return;
    }
  }
  if (style === "ps" && cursor.positional === 0 && /^[a-z]+$/u.test(w)) {
    cursor.positional++;
    const roles = Array.from(
      w,
      (letter) => `${letter} : ${PS_LETTERS[letter] ?? "une option de ps"}`,
    );
    parts.push({ text, kind: "option", role: `à l'ancienne, sans tiret · ${roles.join(" · ")}` });
    return;
  }
  if (style === "tar" && cursor.positional === 0 && /^[a-zA-Z]+$/u.test(w)) {
    cursor.positional++;
    const { role } = clusterRole(spec, w, name, cursor.pendingValues);
    parts.push({ text, kind: "option", role: `à l'ancienne, sans tiret · ${role}` });
    return;
  }
  if (style === "kill") {
    const signal = /^-(\d+|SIG([A-Z]+)|([A-Z]+))$/u.exec(w);
    if (signal !== null) {
      const key = signal[2] ?? signal[3] ?? signal[1] ?? "";
      const role = SIGNALS[key];
      parts.push({
        text,
        kind: role === undefined ? "unknown" : "option",
        role:
          role === undefined
            ? "un signal que cette fiche ne connaît pas"
            : `le signal ${key} : ${role}`,
      });
      return;
    }
  }
  if (style === "find" && (w.startsWith("-") || w === "!")) {
    const option = findOption(spec, w);
    if (option === undefined) {
      parts.push({
        text,
        kind: "unknown",
        role: "un critère de find que cette fiche ne détaille pas",
      });
      return;
    }
    if (w === "-exec" || w === "-execdir" || w === "-ok") cursor.execUntil = true;
    else if (option.value !== undefined) cursor.pendingValues.push({ option, text: w });
    parts.push({ text, kind: "option", role: option.role });
    return;
  }

  // Long options: --all, --lines=5.
  if (w.startsWith("--") && w.length > 2 && token.quoted === "none") {
    const eq = w.indexOf("=");
    const optionName = eq === -1 ? w : w.slice(0, eq);
    const inline = eq === -1 ? null : w.slice(eq + 1);
    const option = findOption(spec, optionName);
    if (option === undefined) {
      parts.push({
        text,
        kind: "unknown",
        role:
          spec === undefined
            ? `une option longue de ${name}`
            : `une option longue de ${name} que cette fiche ne détaille pas`,
      });
      return;
    }
    if (inline !== null) {
      parts.push({
        text,
        kind: "option",
        role: `${option.role} (${option.value ?? "valeur"} : ${inline})`,
      });
      return;
    }
    if (option.value !== undefined) cursor.pendingValues.push({ option, text: optionName });
    parts.push({ text, kind: "option", role: option.role });
    return;
  }

  // Short options: -l, -la, -n5, +short.
  if ((w.startsWith("-") || w.startsWith("+")) && w.length > 1 && token.quoted === "none") {
    const exact = findOption(spec, w);
    if (exact !== undefined) {
      if (exact.value !== undefined) cursor.pendingValues.push({ option: exact, text: w });
      parts.push({ text, kind: "option", role: exact.role });
      return;
    }
    if (w.startsWith("+") || /^-\d+$/u.test(w)) {
      parts.push({ text, kind: "operand", role: operandRole(token, spec, name) });
      return;
    }
    const { role, kind } = clusterRole(spec, w, name, cursor.pendingValues);
    parts.push({ text, kind, role });
    return;
  }

  // The verb of systemctl, ip, apt, git.
  if (spec?.subcommands !== undefined && !cursor.sawSubcommand) {
    cursor.sawSubcommand = true;
    const role = spec.subcommands[w];
    parts.push({
      text,
      kind: role === undefined ? "unknown" : "subcommand",
      role: role ?? `une action de ${name} que cette fiche ne connaît pas`,
    });
    return;
  }

  // The program of sed or awk.
  if (name === "sed" && cursor.positional === 0) {
    const role = sedRole(w);
    if (role !== null) {
      cursor.positional++;
      parts.push({ text, kind: "value", role: `le programme : ${role}` });
      return;
    }
  }
  if (name === "awk" && cursor.positional === 0) {
    const role = awkRole(w);
    if (role !== null) {
      cursor.positional++;
      parts.push({ text, kind: "value", role: `le programme : ${role}` });
      return;
    }
  }

  cursor.positional++;
  parts.push({ text, kind: "operand", role: operandRole(token, spec, name) });
}

function startCommand(token: Token, cursor: Cursor, out: Explanation): void {
  const w = token.plain;
  const name = baseName(w);
  const spec = commandSpec(name);
  const summary =
    spec?.summary ??
    (w.includes("/")
      ? `lance le programme ou le script ${w}`
      : "une commande que cette fiche ne connaît pas");
  out.parts.push({ text: token.text, kind: "command", role: summary });
  out.commands.push({ name, summary, known: spec !== undefined });
  cursor.spec = spec;
  cursor.name = name;
  cursor.expectCommand = false;
  cursor.sawSubcommand = false;
  cursor.positional = 0;
  cursor.pendingValues = [];
  cursor.execUntil = false;
}

/** The line explained word by word. An empty line explains nothing. */
export function explainLine(line: string): Explanation {
  const out: Explanation = { parts: [], commands: [] };
  const cursor = fresh();
  for (const token of tokenize(line)) {
    if (token.operator) {
      out.parts.push({
        text: token.text,
        kind: "operator",
        role: OPERATOR_ROLES[token.text] ?? "un opérateur du shell",
      });
      if (REDIRECTS.has(token.text)) {
        cursor.redirectTarget = true;
      } else if (token.text !== ")" && token.text !== "2>&1" && token.text !== "1>&2") {
        Object.assign(cursor, fresh());
      }
      continue;
    }
    if (cursor.redirectTarget) {
      cursor.redirectTarget = false;
      out.parts.push({
        text: token.text,
        kind: "value",
        role:
          token.plain === "/dev/null"
            ? "le trou noir : ce qui y est redirigé disparaît"
            : "le fichier visé par la redirection",
      });
      continue;
    }
    if (cursor.expectCommand) {
      const assignment = /^([A-Za-z_][A-Za-z0-9_]*)=/u.exec(token.plain);
      if (assignment !== null) {
        out.parts.push({
          text: token.text,
          kind: "assignment",
          role: `donne une valeur à la variable ${assignment[1] ?? ""}, pour la commande qui suit seulement (ou pour le shell, s'il n'y en a pas)`,
        });
        continue;
      }
      startCommand(token, cursor, out);
      continue;
    }
    // sudo, time, xargs, watch: the command they run comes next.
    if (
      cursor.spec?.prefix === true &&
      cursor.pendingValues.length === 0 &&
      !token.plain.startsWith("-") &&
      token.quoted === "none"
    ) {
      startCommand(token, cursor, out);
      continue;
    }
    explainArgument(token, cursor, out.parts);
  }
  return out;
}

/** The last lines typed, most recent first, each once, at most `max`. */
export function rememberTyped(typed: readonly string[], line: string, max = 8): string[] {
  const trimmed = line.trim();
  if (trimmed === "") return [...typed];
  return [trimmed, ...typed.filter((t) => t !== trimmed)].slice(0, max);
}
