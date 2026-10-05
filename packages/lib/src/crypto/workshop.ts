import type { CryptoTool } from "@cyberlearn/types";
import { fromBase64, fromHex, toBase64, toHex, utf8Decode, utf8Encode } from "./bytes";
import { caesar, keyLetters, vigenere, xorBytes } from "./classical";
import { sha256Hex } from "./sha256";

/**
 * <CryptoWorkshop>: one tool at a time, a direction, a key when the tool takes
 * one, and the text to transform. What the bench says of each tool and of
 * what went wrong is here too, so the site and the app say it alike.
 */

export type Direction = "encode" | "decode";

export interface ToolRun {
  readonly tool: CryptoTool;
  readonly direction: Direction;
  readonly input: string;
  readonly key: string;
}

export type ToolResult = { ok: true; output: string } | { ok: false; problem: string };

export const TOOL_NAMES: Record<CryptoTool, string> = {
  base64: "Base64",
  hex: "Hexadécimal",
  caesar: "César",
  vigenere: "Vigenère",
  xor: "XOR",
  sha256: "SHA-256",
};

/** What each tool does, in a line, for the bench's header. */
export const TOOL_NOTES: Record<CryptoTool, string> = {
  base64:
    "Un encodage, pas un chiffrement : n'importe quels octets deviennent du texte sans accent ni espace, et n'importe qui les retrouve.",
  hex: "Chaque octet écrit avec deux chiffres de 0 à f : la façon dont on lit les octets d'un fichier ou d'une trame.",
  caesar:
    "Chaque lettre décalée d'un nombre fixe de places dans l'alphabet. Vingt-cinq clés possibles : un cadenas à deux chiffres.",
  vigenere:
    "Un mot-clé répété donne le décalage de chaque lettre. La même lettre ne se chiffre plus toujours pareil, mais la clé qui se répète finit par trahir sa longueur.",
  xor: "Chaque octet mélangé à la clé par un ou exclusif. La même opération chiffre et déchiffre ; une clé courte et réutilisée tombe en quelques secondes.",
  sha256:
    "Une empreinte de 64 caractères, la même pour la même entrée, impossible à remonter : on ne la déchiffre pas, on compare.",
};

/** Whether the tool has two directions; SHA-256 only ever goes one way. */
export function hasDirections(tool: CryptoTool): boolean {
  return tool !== "sha256";
}

/** The two directions as the buttons say them. */
export function directionLabels(tool: CryptoTool): { encode: string; decode: string } {
  return tool === "base64" || tool === "hex"
    ? { encode: "Encoder", decode: "Décoder" }
    : { encode: "Chiffrer", decode: "Déchiffrer" };
}

/** What the key field asks for, or null for a tool without key. */
export function keyLabel(tool: CryptoTool): string | null {
  switch (tool) {
    case "caesar":
      return "Décalage";
    case "vigenere":
      return "Mot-clé";
    case "xor":
      return "Clé (un nombre de 0 à 255, ou un texte)";
    case "base64":
    case "hex":
    case "sha256":
      return null;
  }
}

/** A key the field can start with, so the tool answers at once. */
export function defaultKey(tool: CryptoTool): string {
  switch (tool) {
    case "caesar":
      return "3";
    case "vigenere":
      return "CLE";
    case "xor":
      return "42";
    case "base64":
    case "hex":
    case "sha256":
      return "";
  }
}

const HEX_PROBLEM =
  "Ce n'est pas de l'hexadécimal : des chiffres de 0 à 9 et des lettres de a à f, deux par octet.";

/** The bytes of a XOR key: a number from 0 to 255 (42 or 0x2a) is one byte, anything else is text. */
export function xorKeyBytes(key: string): number[] | null {
  const trimmed = key.trim();
  if (trimmed === "") return null;
  if (/^\d{1,3}$/u.test(trimmed)) {
    const n = Number(trimmed);
    return n <= 255 ? [n] : null;
  }
  if (/^0x[0-9a-f]{1,2}$/iu.test(trimmed)) return [parseInt(trimmed.slice(2), 16)];
  return utf8Encode(trimmed);
}

/** What the tool makes of the input, or what is wrong with the input or the key. */
export function runTool(run: ToolRun): ToolResult {
  const { tool, direction, input, key } = run;
  switch (tool) {
    case "base64": {
      if (direction === "encode") return { ok: true, output: toBase64(utf8Encode(input)) };
      const bytes = fromBase64(input);
      return bytes === null
        ? {
            ok: false,
            problem:
              "Ce n'est pas du Base64 : des lettres, des chiffres, + et /, par groupes de quatre, avec = pour finir.",
          }
        : { ok: true, output: utf8Decode(bytes) };
    }
    case "hex": {
      if (direction === "encode") return { ok: true, output: toHex(utf8Encode(input)) };
      const bytes = fromHex(input);
      return bytes === null
        ? { ok: false, problem: HEX_PROBLEM }
        : { ok: true, output: utf8Decode(bytes) };
    }
    case "caesar": {
      const shift = Number(key.trim());
      if (key.trim() === "" || !Number.isInteger(shift)) {
        return { ok: false, problem: "Le décalage est un nombre entier, par exemple 3 ou -3." };
      }
      return { ok: true, output: caesar(input, direction === "encode" ? shift : -shift) };
    }
    case "vigenere": {
      if (keyLetters(key) === "") {
        return { ok: false, problem: "Le mot-clé a besoin d'au moins une lettre." };
      }
      return {
        ok: true,
        output: vigenere(input, key, direction === "encode" ? "encrypt" : "decrypt"),
      };
    }
    case "xor": {
      const keyBytes = xorKeyBytes(key);
      if (keyBytes === null) {
        return { ok: false, problem: "La clé est un nombre de 0 à 255 (ou 0x2a), ou un texte." };
      }
      if (direction === "encode")
        return { ok: true, output: toHex(xorBytes(utf8Encode(input), keyBytes)) };
      const bytes = fromHex(input);
      return bytes === null
        ? { ok: false, problem: HEX_PROBLEM }
        : { ok: true, output: utf8Decode(xorBytes(bytes, keyBytes)) };
    }
    case "sha256":
      return { ok: true, output: sha256Hex(utf8Encode(input)) };
  }
}

/** Whether what the learner proposes is the message in clear: spaces and case do not count. */
export function isAnswer(expected: string, proposed: string): boolean {
  const fold = (text: string): string => text.replace(/\s+/gu, " ").trim().toLowerCase();
  return fold(expected) === fold(proposed);
}
