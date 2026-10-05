import { fromHex } from "../crypto/bytes";

/**
 * <HexEditor>: the bytes of a small file, what they say about it (the magic
 * number at its start, the text that can be read in it), and the edits a
 * learner makes to repair it. Pure: the site and the app read the bytes alike.
 */

export interface FileKind {
  /** The format, in French: "image PNG". */
  readonly name: string;
  readonly magic: readonly number[];
  /** What the lesson says about this signature. */
  readonly note: string;
}

const ascii = (text: string): number[] => Array.from(text, (c) => c.charCodeAt(0));

/** The signatures the lessons name, sorted longest first so that none hides another. */
export const FILE_KINDS: readonly FileKind[] = [
  {
    name: "image PNG",
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    note: "Huit octets fixes : un octet non imprimable, les lettres PNG, puis des fins de ligne qui détectent un transfert en mode texte.",
  },
  {
    name: "base SQLite",
    magic: [...ascii("SQLite format 3"), 0x00],
    note: "Le texte « SQLite format 3 » suivi d'un octet nul.",
  },
  { name: "archive 7-Zip", magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], note: "Six octets fixes." },
  {
    name: "programme Linux (ELF)",
    magic: [0x7f, 0x45, 0x4c, 0x46],
    note: "Un octet 7F puis les lettres ELF.",
  },
  {
    name: "image GIF",
    magic: [0x47, 0x49, 0x46, 0x38],
    note: "Les lettres GIF8, suivies de la version, 7a ou 9a.",
  },
  {
    name: "document PDF",
    magic: [0x25, 0x50, 0x44, 0x46],
    note: "Le texte %PDF, suivi de la version.",
  },
  {
    name: "archive ZIP (aussi .docx, .xlsx, .jar, .apk)",
    magic: [0x50, 0x4b, 0x03, 0x04],
    note: "PK, les initiales de l'auteur du format, puis 03 04.",
  },
  {
    name: "classe Java",
    magic: [0xca, 0xfe, 0xba, 0xbe],
    note: "CAFEBABE : une plaisanterie des auteurs de Java.",
  },
  {
    name: "conteneur RIFF (WAV, AVI)",
    magic: [0x52, 0x49, 0x46, 0x46],
    note: "Les lettres RIFF ; le type précis se lit à l'octet 8.",
  },
  {
    name: "image JPEG",
    magic: [0xff, 0xd8, 0xff],
    note: "FF D8 : le début d'image du format JPEG.",
  },
  {
    name: "son MP3 (étiquette ID3)",
    magic: [0x49, 0x44, 0x33],
    note: "Les lettres ID3 : l'étiquette qui porte le titre et l'artiste, avant le son.",
  },
  {
    name: "programme Windows (.exe, .dll)",
    magic: [0x4d, 0x5a],
    note: "MZ, les initiales de Mark Zbikowski, qui a conçu ce format pour MS-DOS.",
  },
  {
    name: "archive gzip",
    magic: [0x1f, 0x8b],
    note: "Deux octets fixes, puis la méthode de compression.",
  },
  { name: "image BMP", magic: [0x42, 0x4d], note: "Les lettres BM, puis la taille du fichier." },
  {
    name: "script (shebang)",
    magic: [0x23, 0x21],
    note: "#! puis le chemin de l'interpréteur : le système sait quoi lancer.",
  },
].sort((a, b) => b.magic.length - a.magic.length);

/** The bytes of a hexadecimal text, spaces ignored; null when it is not hexadecimal. */
export function parseBytes(text: string): number[] | null {
  return fromHex(text);
}

/** The format the first bytes announce, or null when no known signature matches. */
export function identify(bytes: readonly number[]): FileKind | null {
  return FILE_KINDS.find((kind) => kind.magic.every((b, i) => bytes[i] === b)) ?? null;
}

/** Two hexadecimal digits. */
export const hex2 = (byte: number): string => byte.toString(16).padStart(2, "0");

/** The character a byte shows in the right-hand column of a dump: printable ASCII, or a dot. */
export function asciiOf(byte: number): string {
  return byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : ".";
}

export interface TextRun {
  readonly offset: number;
  readonly text: string;
}

/** The stretches of printable text in the bytes, `minLength` characters or more: what `strings` prints. */
export function printableRuns(bytes: readonly number[], minLength = 4): TextRun[] {
  const runs: TextRun[] = [];
  let start = -1;
  let text = "";
  const flush = (): void => {
    if (text.length >= minLength) runs.push({ offset: start, text });
    start = -1;
    text = "";
  };
  bytes.forEach((byte, i) => {
    if (byte >= 0x20 && byte < 0x7f) {
      if (start === -1) start = i;
      text += String.fromCharCode(byte);
    } else {
      flush();
    }
  });
  flush();
  return runs;
}

/** The bytes with one of them changed. */
export function editByte(bytes: readonly number[], offset: number, value: number): number[] {
  const out = [...bytes];
  if (offset >= 0 && offset < out.length) out[offset] = value & 255;
  return out;
}

export interface Repair {
  readonly offset: number;
  /** The bytes expected from `offset`, in hexadecimal. */
  readonly bytes: string;
}

/** For each repair, whether the bytes now read as expected. */
export function repairsMet(bytes: readonly number[], repairs: readonly Repair[]): boolean[] {
  return repairs.map((repair) => {
    const expected = fromHex(repair.bytes) ?? [];
    return expected.length > 0 && expected.every((b, i) => bytes[repair.offset + i] === b);
  });
}

const ACCENTS: Record<string, string> = {
  à: "a",
  â: "a",
  ä: "a",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  î: "i",
  ï: "i",
  ô: "o",
  ö: "o",
  ù: "u",
  û: "u",
  ü: "u",
  ç: "c",
};

/** The text as compared: lower case, no accents, one space between words. */
export function foldAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àâäéèêëîïôöùûüç]/gu, (c) => ACCENTS[c] ?? c)
    .replace(/\s+/gu, " ")
    .trim();
}

/** Whether the learner's answer is one of those accepted, case, accents and spacing aside. */
export function isFileAnswer(expected: string | readonly string[], proposed: string): boolean {
  const accepted = typeof expected === "string" ? [expected] : expected;
  const given = foldAnswer(proposed);
  return given !== "" && accepted.some((answer) => foldAnswer(answer) === given);
}
