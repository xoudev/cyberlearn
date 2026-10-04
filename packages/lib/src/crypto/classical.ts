/**
 * The toy ciphers of the lessons: Caesar, Vigenère, XOR. Teaching material,
 * not protection: the crypto project breaks the first two by counting letters,
 * and the symmetric lesson says why a one-byte XOR falls in seconds.
 */

const A = "A".charCodeAt(0);
const LOWER_A = "a".charCodeAt(0);

/** A letter of the plain alphabet shifted, case kept; anything else unchanged. */
function shiftLetter(char: string, shift: number): string {
  const code = char.charCodeAt(0);
  const base =
    code >= A && code <= A + 25 ? A : code >= LOWER_A && code <= LOWER_A + 25 ? LOWER_A : -1;
  if (base === -1) return char;
  return String.fromCharCode(base + ((((code - base + shift) % 26) + 26) % 26));
}

/** Caesar: every letter moved `shift` places, wrapping; -shift undoes it. */
export function caesar(text: string, shift: number): string {
  let out = "";
  for (const char of text) out += shiftLetter(char, shift);
  return out;
}

/** The letters of a key, lower-cased: what Vigenère reads of it. */
export function keyLetters(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/gu, "");
}

/**
 * Vigenère: each letter shifted by the matching letter of the key, which
 * repeats and advances on letters only, as the lesson's Python does.
 */
export function vigenere(text: string, key: string, direction: "encrypt" | "decrypt"): string {
  const letters = keyLetters(key);
  if (letters === "") return text;
  const sign = direction === "encrypt" ? 1 : -1;
  let out = "";
  let i = 0;
  for (const char of text) {
    const shifted = shiftLetter(char, sign * (letters.charCodeAt(i % letters.length) - LOWER_A));
    if (shifted !== char || /[a-zA-Z]/u.test(char)) i++;
    out += shifted;
  }
  return out;
}

/** XOR of each byte with the key, which repeats: applied twice, it gives the bytes back. */
export function xorBytes(bytes: readonly number[], key: readonly number[]): number[] {
  if (key.length === 0) return [...bytes];
  return bytes.map((b, i) => b ^ (key[i % key.length] ?? 0));
}
