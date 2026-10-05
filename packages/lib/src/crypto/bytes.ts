/**
 * Bytes, text, hexadecimal and Base64, written by hand: the app's JavaScript
 * engine has neither TextEncoder nor atob to count on, and the site and the
 * app must give the same answers. Pure and dependency-free.
 */

/** The UTF-8 bytes of a text. */
export function utf8Encode(text: string): number[] {
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    }
  }
  return out;
}

/** The text of UTF-8 bytes; a byte that is no text becomes the replacement character. */
export function utf8Decode(bytes: readonly number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i] ?? 0;
    const more = b0 < 0x80 ? 0 : b0 >= 0xf0 ? 3 : b0 >= 0xe0 ? 2 : b0 >= 0xc0 ? 1 : -1;
    if (more === -1 || i + more >= bytes.length + (more === 0 ? 1 : 0)) {
      out += "�";
      i++;
      continue;
    }
    let code = more === 0 ? b0 : b0 & (0x3f >> more);
    let valid = true;
    for (let k = 1; k <= more; k++) {
      const b = bytes[i + k] ?? 0;
      if ((b & 0xc0) !== 0x80) valid = false;
      code = (code << 6) | (b & 63);
    }
    if (!valid || code > 0x10ffff) {
      out += "�";
      i++;
      continue;
    }
    out += String.fromCodePoint(code);
    i += more + 1;
  }
  return out;
}

/** Hexadecimal, two digits a byte, a space between bytes: the way a dump reads. */
export function toHex(bytes: readonly number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
}

/** The bytes of hexadecimal text, spaces ignored; null when it is not hexadecimal. */
export function fromHex(text: string): number[] | null {
  const digits = text.replace(/\s+/gu, "").replace(/^0x/iu, "");
  if (digits.length % 2 !== 0 || !/^[0-9a-f]*$/iu.test(digits)) return null;
  const out: number[] = [];
  for (let i = 0; i < digits.length; i += 2) out.push(parseInt(digits.slice(i, i + 2), 16));
  return out;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Standard Base64, with its = padding. */
export function toBase64(bytes: readonly number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const triple = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);
    out += ALPHABET.charAt((triple >> 18) & 63);
    out += ALPHABET.charAt((triple >> 12) & 63);
    out += b1 === undefined ? "=" : ALPHABET.charAt((triple >> 6) & 63);
    out += b2 === undefined ? "=" : ALPHABET.charAt(triple & 63);
  }
  return out;
}

/** The bytes of Base64 text, spaces ignored and padding optional; null when it is not Base64. */
export function fromBase64(text: string): number[] | null {
  const clean = text.replace(/\s+/gu, "").replace(/=+$/u, "");
  if (clean.length % 4 === 1 || !/^[A-Za-z0-9+/]*$/u.test(clean)) return null;
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | ALPHABET.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 255);
    }
  }
  return out;
}
