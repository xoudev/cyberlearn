// The attributes of a lesson component's opening tag, read off its text the way
// the MDX parser reads them on the server (packages/lib/src/mdx/attributes.ts).
// The app cannot ship that parser - @cyberlearn/lib/mdx-quizzes is a subpath of
// its own so that the bundle never pulls it in - so the same syntax is read here
// by hand. Nothing is evaluated: a value is what the attribute spells out.
//
//   id="q-1", id='q-1'       the text, as JSX has it (no escapes)
//   options={['a', "b"]}     the array, its strings in any JavaScript quotes
//   correct={1}, ok={false}  the number, the boolean
//   bare                     true
//
// Anything that computes a value (a name, a call, a template with `${}`) reads
// as undefined, as on the server.

const NOT_A_VALUE = Symbol("not a value");
type NotAValue = typeof NOT_A_VALUE;

/** A position in the source being read. */
interface Cursor {
  readonly src: string;
  at: number;
}

const BLANK = /\s/;
const IDENTIFIER = /[A-Za-z_$][\w$]*/y;
const ATTRIBUTE_NAME = /[A-Za-z_$][\w$-]*(?::[A-Za-z_$][\w$-]*)?/y;
const NUMBER =
  /(?:0[xX][\da-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?)(?![\w$])/y;
const HEX_2 = /[\da-fA-F]{2}/y;
const HEX_4 = /[\da-fA-F]{4}/y;
const HEX_BRACED = /\{([\da-fA-F]+)\}/y;
const ESCAPES = new Map([
  ["b", "\b"],
  ["f", "\f"],
  ["n", "\n"],
  ["r", "\r"],
  ["t", "\t"],
  ["v", "\v"],
]);

/** Whitespace and comments, which an expression may hold between any two tokens. */
function skipBlank(c: Cursor): void {
  for (;;) {
    if (BLANK.test(c.src.charAt(c.at))) {
      c.at++;
    } else if (c.src.startsWith("//", c.at)) {
      const end = c.src.indexOf("\n", c.at);
      c.at = end === -1 ? c.src.length : end;
    } else if (c.src.startsWith("/*", c.at)) {
      const end = c.src.indexOf("*/", c.at + 2);
      c.at = end === -1 ? c.src.length : end + 2;
    } else {
      return;
    }
  }
}

/** The character a `\x41`, `A` or `\u{41}` escape stands for. */
function hexEscape(c: Cursor, re: RegExp): string | NotAValue {
  re.lastIndex = c.at;
  const m = re.exec(c.src);
  if (!m) return NOT_A_VALUE;
  c.at = re.lastIndex;
  const code = parseInt(m[1] ?? m[0], 16);
  return code > 0x10ffff ? NOT_A_VALUE : String.fromCodePoint(code);
}

/** What the escape after a backslash comes to, the cursor moved past it. */
function escape(c: Cursor): string | NotAValue {
  const ch = c.src.charAt(c.at++);
  const known = ESCAPES.get(ch);
  if (known !== undefined) return known;
  // A backslash at the end of a line continues the string on the next one.
  if (ch === "\r") {
    if (c.src.charAt(c.at) === "\n") c.at++;
    return "";
  }
  if (ch === "\n" || ch === " " || ch === " ") return "";
  if (ch === "x") return hexEscape(c, HEX_2);
  if (ch === "u") return hexEscape(c, c.src.charAt(c.at) === "{" ? HEX_BRACED : HEX_4);
  if (ch === "0" && !/\d/.test(c.src.charAt(c.at))) return "\0";
  // MDX parses expressions as a module, where an octal escape does not parse.
  if (ch === "" || /\d/.test(ch)) return NOT_A_VALUE;
  return ch;
}

/** A '...' or "..." string. */
function readString(c: Cursor): string | NotAValue {
  const quote = c.src.charAt(c.at++);
  let out = "";
  for (;;) {
    const ch = c.src.charAt(c.at++);
    if (ch === quote) return out;
    if (ch === "" || ch === "\n" || ch === "\r") return NOT_A_VALUE;
    if (ch === "\\") {
      const escaped = escape(c);
      if (escaped === NOT_A_VALUE) return NOT_A_VALUE;
      out += escaped;
    } else {
      out += ch;
    }
  }
}

/** A `...` template, as long as nothing is substituted into it. */
function readTemplate(c: Cursor): string | NotAValue {
  c.at++;
  let out = "";
  for (;;) {
    const ch = c.src.charAt(c.at++);
    if (ch === "`") return out;
    if (ch === "" || (ch === "$" && c.src.charAt(c.at) === "{")) return NOT_A_VALUE;
    if (ch === "\\") {
      const escaped = escape(c);
      if (escaped === NOT_A_VALUE) return NOT_A_VALUE;
      out += escaped;
    } else if (ch === "\r") {
      // A template's line endings all read as \n.
      if (c.src.charAt(c.at) === "\n") c.at++;
      out += "\n";
    } else {
      out += ch;
    }
  }
}

function readNumber(c: Cursor): number | NotAValue {
  NUMBER.lastIndex = c.at;
  const raw = NUMBER.exec(c.src)?.[0];
  if (raw === undefined) return NOT_A_VALUE;
  const value = Number(raw.replace(/_/g, ""));
  if (Number.isNaN(value)) return NOT_A_VALUE;
  c.at += raw.length;
  return value;
}

function readArray(c: Cursor): unknown[] | NotAValue {
  c.at++;
  const items: unknown[] = [];
  for (;;) {
    skipBlank(c);
    const ch = c.src.charAt(c.at);
    if (ch === "]") {
      c.at++;
      return items;
    }
    // A hole or a spread computes the array; the end of the source never closes it.
    if (ch === "," || ch === "" || c.src.startsWith("...", c.at)) return NOT_A_VALUE;
    const item = readValue(c);
    if (item === NOT_A_VALUE) return NOT_A_VALUE;
    items.push(item);
    skipBlank(c);
    if (c.src.charAt(c.at) === ",") c.at++;
    else if (c.src.charAt(c.at) !== "]") return NOT_A_VALUE;
  }
}

/** An object's key: a name, a string or a number, never computed. */
function readKey(c: Cursor): string | NotAValue {
  const ch = c.src.charAt(c.at);
  if (ch === '"' || ch === "'") return readString(c);
  if (/[\d.]/.test(ch)) {
    const n = readNumber(c);
    return n === NOT_A_VALUE ? n : String(n);
  }
  IDENTIFIER.lastIndex = c.at;
  const name = IDENTIFIER.exec(c.src)?.[0];
  if (name === undefined) return NOT_A_VALUE;
  c.at += name.length;
  return name;
}

function readObject(c: Cursor): Record<string, unknown> | NotAValue {
  c.at++;
  const out: Record<string, unknown> = {};
  for (;;) {
    skipBlank(c);
    if (c.src.charAt(c.at) === "}") {
      c.at++;
      return out;
    }
    const key = readKey(c);
    if (key === NOT_A_VALUE) return NOT_A_VALUE;
    skipBlank(c);
    // A shorthand, a method or an accessor: not a value written out.
    if (c.src.charAt(c.at) !== ":") return NOT_A_VALUE;
    c.at++;
    const value = readValue(c);
    if (value === NOT_A_VALUE) return NOT_A_VALUE;
    // Defined rather than assigned, so that a `__proto__` key stays a key.
    Object.defineProperty(out, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    skipBlank(c);
    if (c.src.charAt(c.at) === ",") c.at++;
    else if (c.src.charAt(c.at) !== "}") return NOT_A_VALUE;
  }
}

function readValue(c: Cursor): unknown {
  skipBlank(c);
  const ch = c.src.charAt(c.at);
  if (ch === '"' || ch === "'") return readString(c);
  if (ch === "`") return readTemplate(c);
  if (ch === "[") return readArray(c);
  if (ch === "{") return readObject(c);
  if (ch === "-" || ch === "+") {
    // A sign applies to a number written out, nothing else.
    c.at++;
    skipBlank(c);
    const n = readNumber(c);
    if (n === NOT_A_VALUE) return NOT_A_VALUE;
    return ch === "-" ? -n : n;
  }
  const n = readNumber(c);
  if (n !== NOT_A_VALUE) return n;
  IDENTIFIER.lastIndex = c.at;
  const word = IDENTIFIER.exec(c.src)?.[0];
  const literal =
    word === "true" ? true : word === "false" ? false : word === "null" ? null : NOT_A_VALUE;
  if (word !== undefined && literal !== NOT_A_VALUE) c.at += word.length;
  return literal;
}

/** The value the source of a `{...}` attribute spells out, or undefined. */
function expressionValue(source: string): unknown {
  const c: Cursor = { src: source, at: 0 };
  const value = readValue(c);
  skipBlank(c);
  return value === NOT_A_VALUE || c.at < source.length ? undefined : value;
}

/** The index just past the string opening at `at`. */
function pastString(src: string, at: number): number {
  const quote = src.charAt(at);
  let i = at + 1;
  while (i < src.length && src.charAt(i) !== quote) i += src.charAt(i) === "\\" ? 2 : 1;
  return i + 1;
}

/** The index just past the template opening at `at`, its `${}` included. */
function pastTemplate(src: string, at: number): number {
  let i = at + 1;
  while (i < src.length) {
    const ch = src.charAt(i);
    if (ch === "`") return i + 1;
    if (ch === "\\") {
      i += 2;
    } else if (ch === "$" && src.charAt(i + 1) === "{") {
      const close = closingBrace(src, i + 1);
      if (close === -1) return src.length;
      i = close + 1;
    } else {
      i++;
    }
  }
  return src.length;
}

/**
 * The index of the `}` closing the expression whose `{` is at `open`, or -1.
 * Strings, templates and comments are skipped: an option may well hold a `}`
 * or a `]}` of its own, as `"${tab[*]}"` does.
 */
function closingBrace(src: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < src.length) {
    const ch = src.charAt(i);
    if (ch === '"' || ch === "'") {
      i = pastString(src, i);
    } else if (ch === "`") {
      i = pastTemplate(src, i);
    } else if (src.startsWith("//", i)) {
      const end = src.indexOf("\n", i);
      if (end === -1) return -1;
      i = end;
    } else if (src.startsWith("/*", i)) {
      const end = src.indexOf("*/", i + 2);
      if (end === -1) return -1;
      i = end + 2;
    } else {
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) return i;
      i++;
    }
  }
  return -1;
}

const CHARACTER_REFERENCE = /&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|(amp|lt|gt|quot|apos|nbsp));/g;
const NAMED_REFERENCES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
]);

/**
 * The text of a quoted attribute, as MDX hands it over: the indentation of the
 * lines after the first dropped, character references decoded. The server
 * knows every name HTML has; the app knows those a lesson is likely to write,
 * and lesson-quizzes.test.ts fails on a lesson that would need another.
 */
function attributeText(raw: string): string {
  return raw
    .replace(/(\r\n|\r|\n)[ \t]+/g, "$1")
    .replace(
      CHARACTER_REFERENCE,
      (whole, decimal: string | undefined, hex: string | undefined, name: string | undefined) => {
        if (name !== undefined) return NAMED_REFERENCES.get(name) ?? whole;
        const code = decimal === undefined ? parseInt(hex ?? "", 16) : parseInt(decimal, 10);
        const invalid = code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff);
        return invalid ? "�" : String.fromCodePoint(code);
      },
    );
}

/**
 * The attributes of an opening tag, from its `<` to its `>`, by name. A later
 * attribute of the same name wins, as on the server; a `{...spread}` gives none.
 */
export function tagAttributes(tag: string): Map<string, unknown> {
  const attributes = new Map<string, unknown>();
  let i = 1;
  // The element's name.
  while (i < tag.length && !/[\s/>{]/.test(tag.charAt(i))) i++;
  for (;;) {
    while (BLANK.test(tag.charAt(i))) i++;
    if (tag.charAt(i) === "{") {
      const close = closingBrace(tag, i);
      if (close === -1) return attributes;
      i = close + 1;
      continue;
    }
    ATTRIBUTE_NAME.lastIndex = i;
    const name = ATTRIBUTE_NAME.exec(tag)?.[0];
    // The `/>` or `>` that ends the tag.
    if (name === undefined) return attributes;
    i += name.length;
    while (BLANK.test(tag.charAt(i))) i++;
    if (tag.charAt(i) !== "=") {
      attributes.set(name, true);
      continue;
    }
    i++;
    while (BLANK.test(tag.charAt(i))) i++;
    const open = tag.charAt(i);
    const quoted = open === '"' || open === "'";
    const close = open === "{" ? closingBrace(tag, i) : quoted ? tag.indexOf(open, i + 1) : -1;
    if (close === -1) return attributes;
    const raw = tag.slice(i + 1, close);
    attributes.set(name, quoted ? attributeText(raw) : expressionValue(raw));
    i = close + 1;
  }
}
