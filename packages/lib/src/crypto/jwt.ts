import { jsonObjectSchema, jwtClaimsSchema, jwtHeaderSchema } from "@cyberlearn/types";
import type { JwtClaims, JwtHeader } from "@cyberlearn/types";
import { p256 } from "@noble/curves/nist.js";
import { fromBase64, toBase64, utf8Decode, utf8Encode } from "./bytes";
import { sha256 } from "./sha256";

/**
 * What a JWT is made of, and the three signatures the lab uses: HMAC-SHA256
 * (HS256), RSASSA-PKCS1-v1_5 with SHA-256 (RS256) and ECDSA over P-256 with
 * SHA-256 (ES256). Verification only for the two public-key ones: the lab
 * never holds a private key, which is the point of the last lesson.
 *
 * Pure, synchronous and free of platform APIs, so that the site and the app
 * give the same answers: the app's JavaScript engine has no WebCrypto and no
 * TextEncoder, which is what the `jose` library needs (the tests check
 * everything here against it). HMAC and RSA are written out on top of the
 * hand-written SHA-256 and BigInt; ECDSA is @noble/curves, pure JavaScript.
 */

// ── base64url and the three parts ────────────────────────────────────────────

/** Base64 without padding, with - and _ instead of + and /: the alphabet of a token. */
export function base64UrlEncode(bytes: readonly number[]): string {
  return toBase64(bytes).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

/** The bytes of base64url text; null when it holds anything else (padding included). */
export function base64UrlDecode(text: string): number[] | null {
  if (!/^[A-Za-z0-9_-]*$/u.test(text)) return null;
  return fromBase64(text.replace(/-/gu, "+").replace(/_/gu, "/"));
}

export interface TokenParts {
  readonly header: string;
  readonly payload: string;
  readonly signature: string;
}

/** The three dot-separated parts of a token, still encoded; null when there are not three. */
export function splitToken(token: string): TokenParts | null {
  const parts = token.trim().split(".");
  const [header, payload, signature] = parts;
  if (parts.length !== 3 || header === undefined || payload === undefined) return null;
  return { header, payload, signature: signature ?? "" };
}

/** A part as the text it encodes (UTF-8); null when it is not base64url. */
export function decodePart(part: string): string | null {
  const bytes = base64UrlDecode(part);
  return bytes === null ? null : utf8Decode(bytes);
}

/** A token from the text of its header, the text of its payload and its signature as written. */
export function joinToken(headerText: string, payloadText: string, signature: string): string {
  return `${base64UrlEncode(utf8Encode(headerText))}.${base64UrlEncode(utf8Encode(payloadText))}.${signature}`;
}

/** The bytes the signature covers: the first two parts, as they stand in the token. */
export function signingInput(parts: Pick<TokenParts, "header" | "payload">): string {
  return `${parts.header}.${parts.payload}`;
}

type Read<T> = { ok: true; value: T } | { ok: false; problem: string };

/** JSON object text, read with Zod; the problem says in French what is not an object. */
export function readJsonObject(text: string): Read<Record<string, unknown>> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, problem: "Ce n'est pas du JSON valide." };
  }
  const parsed = jsonObjectSchema.safeParse(raw);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, problem: "Le JSON doit être un objet, entre accolades." };
}

/** The header of a token, as text: JSON with an `alg`. */
export function readHeader(text: string): Read<JwtHeader> {
  const object = readJsonObject(text);
  if (!object.ok) return object;
  const parsed = jwtHeaderSchema.safeParse(object.value);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, problem: "L'en-tête doit nommer son algorithme, dans « alg »." };
}

/** The claims of a token, as text: JSON, with the claims the lab reads of the right kind. */
export function readClaims(text: string): Read<JwtClaims> {
  const object = readJsonObject(text);
  if (!object.ok) return object;
  const parsed = jwtClaimsSchema.safeParse(object.value);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        problem: "Une revendication est d'un type inattendu (rôle en texte, dates en nombres).",
      };
}

// ── HS256 ────────────────────────────────────────────────────────────────────

const HMAC_BLOCK = 64;

/** HMAC-SHA256 (RFC 2104): a key longer than a block is hashed first. */
export function hmacSha256(key: readonly number[], message: readonly number[]): number[] {
  const block = key.length > HMAC_BLOCK ? sha256(key) : [...key];
  while (block.length < HMAC_BLOCK) block.push(0);
  const inner = sha256([...block.map((b) => b ^ 0x36), ...message]);
  return sha256([...block.map((b) => b ^ 0x5c), ...inner]);
}

/** Whether two byte lists are equal, looking at every byte whatever the first difference. */
export function sameBytes(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

/** The HS256 signature of a signing input, as it is written in a token. */
export function signHs256(input: string, secret: readonly number[]): string {
  return base64UrlEncode(hmacSha256(secret, utf8Encode(input)));
}

/**
 * A token signed with HMAC-SHA256 whatever its header says: the header and
 * the payload as text, the secret as bytes. An attacker's token and an honest
 * one are built the same way; only the secret differs.
 */
export function signToken(
  headerText: string,
  payloadText: string,
  secret: readonly number[],
): string {
  const input = joinToken(headerText, payloadText, "").slice(0, -1);
  return `${input}.${signHs256(input, secret)}`;
}

/** Whether a signature is the HS256 one for this input and this secret. */
export function verifyHs256(input: string, signature: string, secret: readonly number[]): boolean {
  const bytes = base64UrlDecode(signature);
  return bytes !== null && sameBytes(bytes, hmacSha256(secret, utf8Encode(input)));
}

/**
 * Tries each word as the HMAC secret of a token, the way an offline attack
 * does: a signature that matches names the secret. The tokens the lab hands
 * out are the only ones it ever feeds this.
 */
export function guessSecret(
  token: string,
  words: readonly string[],
): { found: string | null; tried: number } {
  const parts = splitToken(token);
  if (parts === null) return { found: null, tried: 0 };
  const input = signingInput(parts);
  let tried = 0;
  for (const word of words) {
    tried++;
    if (verifyHs256(input, parts.signature, utf8Encode(word))) return { found: word, tried };
  }
  return { found: null, tried };
}

// ── RS256 ────────────────────────────────────────────────────────────────────

/** An RSA public key: the modulus' bytes, most significant first, and the exponent. */
export interface RsaPublicKey {
  readonly modulus: readonly number[];
  readonly exponent: number;
}

/** The DigestInfo prefix of SHA-256 (RFC 8017, section 9.2). */
const SHA256_DIGEST_INFO = [
  0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05,
  0x00, 0x04, 0x20,
];

function bytesToBigInt(bytes: readonly number[]): bigint {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

function bigIntToBytes(value: bigint, length: number): number[] {
  const out: number[] = new Array<number>(length).fill(0);
  let rest = value;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let power = base % modulus;
  let rest = exponent;
  while (rest > 0n) {
    if ((rest & 1n) === 1n) result = (result * power) % modulus;
    power = (power * power) % modulus;
    rest >>= 1n;
  }
  return result;
}

/**
 * RSASSA-PKCS1-v1_5 with SHA-256 (RFC 8017): the signature raised to the
 * public exponent must give exactly the block 00 01 FF..FF 00 DigestInfo hash.
 * The whole block is rebuilt and compared, never parsed, so that a padding
 * the standard does not allow is no shortcut.
 */
export function verifyRs256(input: string, signature: string, key: RsaPublicKey): boolean {
  const bytes = base64UrlDecode(signature);
  const size = key.modulus.length;
  if (bytes?.length !== size) return false;
  const modulus = bytesToBigInt(key.modulus);
  const value = bytesToBigInt(bytes);
  if (value >= modulus) return false;
  const block = bigIntToBytes(modPow(value, BigInt(key.exponent), modulus), size);
  const digest = [...SHA256_DIGEST_INFO, ...sha256(utf8Encode(input))];
  if (size < digest.length + 11) return false;
  const expected = [
    0x00,
    0x01,
    ...new Array<number>(size - digest.length - 3).fill(0xff),
    0x00,
    ...digest,
  ];
  return sameBytes(block, expected);
}

// ── ES256 ────────────────────────────────────────────────────────────────────

/**
 * ECDSA over P-256 with SHA-256, the signature as the two 32-byte numbers
 * r and s one after the other (what a JWT carries, not the DER of X.509).
 * `lowS: false` because other libraries do not normalise s, and a token they
 * signed must verify. A public key or a signature that does not parse is a
 * signature that does not verify.
 */
export function verifyEs256(
  input: string,
  signature: string,
  publicPoint: readonly number[],
): boolean {
  const bytes = base64UrlDecode(signature);
  if (bytes?.length !== 64) return false;
  try {
    return p256.verify(
      Uint8Array.from(bytes),
      Uint8Array.from(utf8Encode(input)),
      Uint8Array.from(publicPoint),
      {
        lowS: false,
      },
    );
  } catch {
    return false;
  }
}

// ── public keys as PEM ───────────────────────────────────────────────────────

function derLength(length: number): number[] {
  if (length < 0x80) return [length];
  const digits: number[] = [];
  for (let rest = length; rest > 0; rest = Math.floor(rest / 256)) digits.unshift(rest % 256);
  return [0x80 | digits.length, ...digits];
}

function der(tag: number, body: readonly number[]): number[] {
  return [tag, ...derLength(body.length), ...body];
}

function derInteger(bytes: readonly number[]): number[] {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  const trimmed = bytes.slice(start);
  return der(0x02, (trimmed[0] ?? 0) >= 0x80 ? [0, ...trimmed] : trimmed);
}

/** rsaEncryption (1.2.840.113549.1.1.1) with its NULL parameters. */
const RSA_ALGORITHM = der(
  0x30,
  [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00],
);

/** id-ecPublicKey (1.2.840.10045.2.1) on prime256v1 (1.2.840.10045.3.1.7). */
const EC_ALGORITHM = der(
  0x30,
  [
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07,
  ],
);

function pemOf(derBytes: readonly number[]): string {
  const lines = toBase64(derBytes).match(/.{1,64}/gu) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----\n`;
}

/** The PEM (SubjectPublicKeyInfo) of an RSA public key, the file a server would publish. */
export function rsaPublicKeyPem(key: RsaPublicKey): string {
  const exponent: number[] = [];
  for (let rest = key.exponent; rest > 0; rest = Math.floor(rest / 256))
    exponent.unshift(rest % 256);
  const publicKey = der(0x30, [...derInteger(key.modulus), ...derInteger(exponent)]);
  return pemOf(der(0x30, [...RSA_ALGORITHM, ...der(0x03, [0, ...publicKey])]));
}

/** The PEM (SubjectPublicKeyInfo) of a P-256 public key given as its 65-byte uncompressed point. */
export function ecPublicKeyPem(point: readonly number[]): string {
  return pemOf(der(0x30, [...EC_ALGORITHM, ...der(0x03, [0, ...point])]));
}
