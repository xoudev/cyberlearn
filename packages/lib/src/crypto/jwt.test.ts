import { createPublicKey } from "node:crypto";
import { p256 } from "@noble/curves/nist.js";
import {
  SignJWT,
  compactVerify,
  exportJWK,
  generateKeyPair,
  importJWK,
  importSPKI,
  jwtVerify,
  type JWK,
} from "jose";
import { describe, expect, it } from "vitest";
import { toHex, utf8Encode } from "./bytes";
import {
  base64UrlDecode,
  base64UrlEncode,
  decodePart,
  ecPublicKeyPem,
  guessSecret,
  hmacSha256,
  joinToken,
  readClaims,
  readHeader,
  readJsonObject,
  rsaPublicKeyPem,
  sameBytes,
  signHs256,
  signingInput,
  splitToken,
  verifyEs256,
  verifyHs256,
  verifyRs256,
} from "./jwt";

/**
 * Checked against `jose`, the reference JOSE library, and against Node's own
 * crypto: a token the lab builds must be a token any library reads, and a
 * token another library signs must verify here. The keys are made for each
 * run, so that no key sits in the repository.
 */

const ascii = (text: string): number[] => Array.from(text, (c) => c.charCodeAt(0));
const bytesOf = (jwk: JWK, field: "n" | "x" | "y"): number[] => {
  const bytes = base64UrlDecode(jwk[field] ?? "");
  if (bytes === null) throw new Error(`no ${field} in the key`);
  return bytes;
};

describe("base64url and the parts of a token", () => {
  it("writes the alphabet of a token, without padding", () => {
    expect(base64UrlEncode(ascii("Man"))).toBe("TWFu");
    expect(base64UrlEncode(ascii("Ma"))).toBe("TWE");
    expect(base64UrlEncode(ascii("M"))).toBe("TQ");
    expect(base64UrlEncode([0xfb, 0xff, 0xfe])).toBe("-__-");
    expect(base64UrlEncode([])).toBe("");
  });

  it("reads it back, and refuses what is not base64url", () => {
    expect(base64UrlDecode("-__-")).toEqual([0xfb, 0xff, 0xfe]);
    expect(base64UrlDecode("TWE")).toEqual(ascii("Ma"));
    expect(base64UrlDecode("")).toEqual([]);
    expect(base64UrlDecode("TWE=")).toBeNull();
    expect(base64UrlDecode("+/+/")).toBeNull();
    expect(base64UrlDecode("T")).toBeNull();
    expect(base64UrlDecode("TW Fu")).toBeNull();
  });

  it("splits a token in three, an empty signature included, and nothing else", () => {
    expect(splitToken("a.b.c")).toEqual({ header: "a", payload: "b", signature: "c" });
    expect(splitToken("  a.b.c\n")).toEqual({ header: "a", payload: "b", signature: "c" });
    expect(splitToken("a.b.")).toEqual({ header: "a", payload: "b", signature: "" });
    expect(splitToken("a.b")).toBeNull();
    expect(splitToken("a.b.c.d")).toBeNull();
    expect(splitToken("")).toBeNull();
  });

  it("joins the text of a header and a payload, accents included, and reads them back", () => {
    const token = joinToken('{"alg":"none"}', '{"nom":"Éloïse"}', "");
    const parts = splitToken(token);
    if (parts === null) throw new Error("not a token");
    expect(decodePart(parts.header)).toBe('{"alg":"none"}');
    expect(decodePart(parts.payload)).toBe('{"nom":"Éloïse"}');
    expect(parts.signature).toBe("");
    expect(signingInput(parts)).toBe(`${parts.header}.${parts.payload}`);
    expect(decodePart("*")).toBeNull();
  });

  it("reads JSON objects with Zod, and says in French what is wrong", () => {
    expect(readJsonObject('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    expect(readJsonObject("{")).toEqual({ ok: false, problem: "Ce n'est pas du JSON valide." });
    expect(readJsonObject("[1]")).toEqual({
      ok: false,
      problem: "Le JSON doit être un objet, entre accolades.",
    });
    expect(readHeader('{"alg":"HS256","typ":"JWT"}')).toEqual({
      ok: true,
      value: { alg: "HS256", typ: "JWT" },
    });
    expect(readHeader('{"typ":"JWT"}')).toMatchObject({ ok: false });
    expect(readClaims('{"role":"admin","exp":5}')).toEqual({
      ok: true,
      value: { role: "admin", exp: 5 },
    });
    expect(readClaims('{"role":7}')).toMatchObject({ ok: false });
  });
});

describe("HS256", () => {
  it("follows RFC 4231 for HMAC-SHA256, a long key included", () => {
    expect(
      toHex(hmacSha256(ascii("Jefe"), ascii("what do ya want for nothing?"))).replace(/ /gu, ""),
    ).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
    // RFC 4231, test case 6: a key of 131 bytes, hashed down before use.
    expect(
      toHex(
        hmacSha256(
          new Array<number>(131).fill(0xaa),
          ascii("Test Using Larger Than Block-Size Key - Hash Key First"),
        ),
      ).replace(/ /gu, ""),
    ).toBe("60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54");
  });

  it("makes the signature jose verifies, and verifies the one jose makes", async () => {
    const secret = Uint8Array.from(utf8Encode("a secret for this run only"));
    const token = joinToken('{"alg":"HS256","typ":"JWT"}', '{"sub":"alice","role":"user"}', "");
    const parts = splitToken(token);
    if (parts === null) throw new Error("not a token");
    const signed = `${signingInput(parts)}.${signHs256(signingInput(parts), [...secret])}`;
    const verified = await jwtVerify(signed, secret, { algorithms: ["HS256"] });
    expect(verified.payload).toEqual({ sub: "alice", role: "user" });

    const fromJose = await new SignJWT({ sub: "bob", role: "user" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(secret);
    const joseParts = splitToken(fromJose);
    if (joseParts === null) throw new Error("not a token");
    expect(verifyHs256(signingInput(joseParts), joseParts.signature, [...secret])).toBe(true);
    expect(verifyHs256(signingInput(joseParts), joseParts.signature, ascii("another"))).toBe(false);
    expect(verifyHs256(`${joseParts.header}.x`, joseParts.signature, [...secret])).toBe(false);
    expect(verifyHs256(signingInput(joseParts), "", [...secret])).toBe(false);
    expect(verifyHs256(signingInput(joseParts), "*", [...secret])).toBe(false);
  });

  it("compares bytes whole", () => {
    expect(sameBytes([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(sameBytes([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(sameBytes([1, 2], [1, 2, 3])).toBe(false);
    expect(sameBytes([], [])).toBe(true);
  });

  it("finds a secret that is in the list, and says how many it tried", () => {
    const input = joinToken('{"alg":"HS256"}', '{"role":"user"}', "");
    const parts = splitToken(input);
    if (parts === null) throw new Error("not a token");
    const token = `${signingInput(parts)}.${signHs256(signingInput(parts), ascii("soleil"))}`;
    expect(guessSecret(token, ["admin", "azerty", "soleil", "dragon"])).toEqual({
      found: "soleil",
      tried: 3,
    });
    expect(guessSecret(token, ["admin", "azerty"])).toEqual({ found: null, tried: 2 });
    expect(guessSecret("pas un jeton", ["soleil"])).toEqual({ found: null, tried: 0 });
  });
});

describe("RS256", () => {
  it("verifies what jose signs, and nothing else", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256", {
      modulusLength: 2048,
      extractable: true,
    });
    const jwk = await exportJWK(publicKey);
    const key = { modulus: bytesOf(jwk, "n"), exponent: 65537 };
    expect(key.modulus).toHaveLength(256);

    const token = await new SignJWT({ sub: "alice", role: "user" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .sign(privateKey);
    const parts = splitToken(token);
    if (parts === null) throw new Error("not a token");
    const input = signingInput(parts);
    expect(verifyRs256(input, parts.signature, key)).toBe(true);

    // One character of the payload, one of the signature, the wrong key: none verifies.
    const otherPayload = base64UrlEncode(utf8Encode('{"sub":"alice","role":"admin"}'));
    expect(verifyRs256(`${parts.header}.${otherPayload}`, parts.signature, key)).toBe(false);
    const flipped = `${parts.signature.slice(0, 10)}${parts.signature.charAt(10) === "A" ? "B" : "A"}${parts.signature.slice(11)}`;
    expect(verifyRs256(input, flipped, key)).toBe(false);
    const other = await generateKeyPair("RS256", { modulusLength: 2048, extractable: true });
    const otherKey = { modulus: bytesOf(await exportJWK(other.publicKey), "n"), exponent: 65537 };
    expect(verifyRs256(input, parts.signature, otherKey)).toBe(false);
    expect(verifyRs256(input, "", key)).toBe(false);
    expect(verifyRs256(input, base64UrlEncode(new Array<number>(256).fill(0xff)), key)).toBe(false);
  });

  it("writes the PEM that Node reads back byte for byte, and jose imports", async () => {
    const { publicKey } = await generateKeyPair("RS256", {
      modulusLength: 2048,
      extractable: true,
    });
    const jwk = await exportJWK(publicKey);
    const pem = rsaPublicKeyPem({ modulus: bytesOf(jwk, "n"), exponent: 65537 });
    const reread = createPublicKey(pem);
    expect(reread.export({ type: "spki", format: "pem" })).toBe(pem);
    expect(reread.export({ format: "jwk" })).toMatchObject({ kty: "RSA", n: jwk.n, e: jwk.e });
    const imported = await importSPKI(pem, "RS256");
    expect((await exportJWK(imported)).n).toBe(jwk.n);
  });
});

describe("ES256", () => {
  it("verifies what jose signs, high s included, and refuses the all-zero signature", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
    const jwk = await exportJWK(publicKey);
    const point = [4, ...bytesOf(jwk, "x"), ...bytesOf(jwk, "y")];
    // WebCrypto does not normalise s: about half of the signatures are "high s", all must verify.
    for (let i = 0; i < 12; i++) {
      const token = await new SignJWT({ sub: "alice", n: i })
        .setProtectedHeader({ alg: "ES256" })
        .sign(privateKey);
      const parts = splitToken(token);
      if (parts === null) throw new Error("not a token");
      expect(verifyEs256(signingInput(parts), parts.signature, point)).toBe(true);
      expect(verifyEs256(`${parts.header}.e30`, parts.signature, point)).toBe(false);
    }
    const zero = base64UrlEncode(new Array<number>(64).fill(0));
    expect(verifyEs256("a.b", zero, point)).toBe(false);
    expect(verifyEs256("a.b", base64UrlEncode(new Array<number>(63).fill(1)), point)).toBe(false);
    expect(verifyEs256("a.b", "", point)).toBe(false);
    expect(verifyEs256("a.b", zero, [1, 2, 3])).toBe(false);
  });

  it("verifies the signature noble makes, and jose accepts it too", async () => {
    const secretKey = p256.utils.randomSecretKey();
    const point = [...p256.getPublicKey(secretKey, false)];
    const parts = splitToken(joinToken('{"alg":"ES256"}', '{"sub":"alice"}', ""));
    if (parts === null) throw new Error("not a token");
    const input = signingInput(parts);
    const signature = base64UrlEncode([
      ...p256.sign(Uint8Array.from(utf8Encode(input)), secretKey),
    ]);
    expect(verifyEs256(input, signature, point)).toBe(true);
    const publicKey = createPublicKey(ecPublicKeyPem(point));
    const jwk = publicKey.export({ format: "jwk" });
    expect(base64UrlDecode(jwk.x ?? "")).toEqual(point.slice(1, 33));
    const verified = await compactVerify(`${input}.${signature}`, await importJWK(jwk, "ES256"));
    expect(verified.payload).toBeInstanceOf(Uint8Array);
  });

  it("writes the PEM that Node reads back byte for byte", async () => {
    const { publicKey } = await generateKeyPair("ES256", { extractable: true });
    const jwk = await exportJWK(publicKey);
    const pem = ecPublicKeyPem([4, ...bytesOf(jwk, "x"), ...bytesOf(jwk, "y")]);
    expect(createPublicKey(pem).export({ type: "spki", format: "pem" })).toBe(pem);
    expect(createPublicKey(pem).export({ format: "jwk" })).toMatchObject({
      crv: "P-256",
      x: jwk.x,
      y: jwk.y,
    });
  });
});
