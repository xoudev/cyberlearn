import { describe, expect, it } from "vitest";
import { fromBase64, fromHex, toBase64, toHex, utf8Decode, utf8Encode } from "./bytes";
import { caesar, vigenere, xorBytes } from "./classical";
import { sha256Hex } from "./sha256";
import { isAnswer, runTool, xorKeyBytes } from "./workshop";

/**
 * Against the reference vectors a learner can check elsewhere (RFC 4648 for
 * Base64, the SHA-256 digests the hashing lesson prints), and the lessons'
 * own examples: a workshop that disagreed with the lesson would be worse than
 * none.
 */

const ascii = (text: string): number[] => Array.from(text, (c) => c.charCodeAt(0));

describe("bytes", () => {
  it("encodes and decodes UTF-8, accents included", () => {
    expect(utf8Encode("é")).toEqual([0xc3, 0xa9]);
    expect(utf8Encode("€")).toEqual([0xe2, 0x82, 0xac]);
    expect(utf8Decode(utf8Encode("Chiffré à l'aube, € compris"))).toBe(
      "Chiffré à l'aube, € compris",
    );
    expect(utf8Decode([0x41, 0xff, 0x42])).toBe("A�B");
    expect(utf8Decode([0xc3])).toBe("�");
  });

  it("writes hexadecimal a byte at a time, and reads it with or without spaces", () => {
    expect(toHex(ascii("Hi!"))).toBe("48 69 21");
    expect(fromHex("48 69 21")).toEqual([0x48, 0x69, 0x21]);
    expect(fromHex("486921")).toEqual([0x48, 0x69, 0x21]);
    expect(fromHex("0x4869")).toEqual([0x48, 0x69]);
    expect(fromHex("486")).toBeNull();
    expect(fromHex("4g")).toBeNull();
  });

  it("follows RFC 4648 for Base64, padding included, and forgives its absence", () => {
    expect(toBase64(ascii("Man"))).toBe("TWFu");
    expect(toBase64(ascii("Ma"))).toBe("TWE=");
    expect(toBase64(ascii("M"))).toBe("TQ==");
    expect(toBase64([])).toBe("");
    expect(fromBase64("TWFu")).toEqual(ascii("Man"));
    expect(fromBase64("TWE=")).toEqual(ascii("Ma"));
    expect(fromBase64("TQ")).toEqual(ascii("M"));
    expect(fromBase64("TW Fu\n")).toEqual(ascii("Man"));
    expect(fromBase64("TWF")).toEqual(ascii("Ma"));
    expect(fromBase64("T")).toBeNull();
    expect(fromBase64("TW*u")).toBeNull();
    expect(
      utf8Decode(fromBase64(toBase64(utf8Encode("Base64 n'est pas du chiffrement"))) ?? []),
    ).toBe("Base64 n'est pas du chiffrement");
  });
});

describe("the toy ciphers", () => {
  it("shifts letters and wraps, keeps the case, leaves the rest", () => {
    expect(caesar("BONJOUR LE MONDE", 3)).toBe("ERQMRXU OH PRQGH");
    expect(caesar("ERQMRXU OH PRQGH", -3)).toBe("BONJOUR LE MONDE");
    expect(caesar("xyz Abc, 123 é", 3)).toBe("abc Def, 123 é");
    expect(caesar("abc", 29)).toBe("def");
    expect(caesar("abc", -1)).toBe("zab");
  });

  it("repeats the Vigenère key on letters only, as the project's Python does", () => {
    expect(vigenere("ATTAQUE A LAUBE", "CLE", "encrypt")).toBe("CEXCBYG L PCFFG");
    expect(vigenere("CEXCBYG L PCFFG", "CLE", "decrypt")).toBe("ATTAQUE A LAUBE");
    expect(vigenere("abc", "B", "encrypt")).toBe("bcd");
    expect(vigenere("abc", "cl-e 2", "encrypt")).toBe(vigenere("abc", "CLE", "encrypt"));
    expect(vigenere("abc", "", "encrypt")).toBe("abc");
  });

  it("xors with a key that repeats, and undoes itself", () => {
    const bytes = ascii("BONJOUR");
    const once = xorBytes(bytes, [42]);
    expect(toHex(once)).toBe("68 65 64 60 65 7f 78");
    expect(xorBytes(once, [42])).toEqual(bytes);
    expect(xorBytes([1, 2, 3], [1, 2])).toEqual([0, 0, 2]);
    expect(xorBytes([1, 2], [])).toEqual([1, 2]);
  });
});

describe("SHA-256", () => {
  it("gives the digests the hashing lesson prints", () => {
    expect(sha256Hex(ascii("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex(ascii("hello"))).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    expect(sha256Hex([])).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("handles a message that crosses the block boundary, and a long one", () => {
    // 56 bytes: the padding needs a second block.
    expect(sha256Hex(ascii("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
    expect(sha256Hex(ascii("a".repeat(1000)))).toBe(
      "41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3",
    );
  });
});

describe("runTool", () => {
  it("encodes and decodes with each tool, in both directions", () => {
    expect(runTool({ tool: "base64", direction: "encode", input: "Man", key: "" })).toEqual({
      ok: true,
      output: "TWFu",
    });
    expect(runTool({ tool: "base64", direction: "decode", input: "TWFu", key: "" })).toEqual({
      ok: true,
      output: "Man",
    });
    expect(runTool({ tool: "hex", direction: "encode", input: "Hi", key: "" })).toEqual({
      ok: true,
      output: "48 69",
    });
    expect(runTool({ tool: "hex", direction: "decode", input: "4869", key: "" })).toEqual({
      ok: true,
      output: "Hi",
    });
    expect(runTool({ tool: "caesar", direction: "encode", input: "abc", key: "3" })).toEqual({
      ok: true,
      output: "def",
    });
    expect(runTool({ tool: "caesar", direction: "decode", input: "def", key: "3" })).toEqual({
      ok: true,
      output: "abc",
    });
    expect(
      runTool({ tool: "vigenere", direction: "decode", input: "CEXCBYG", key: "CLE" }),
    ).toEqual({
      ok: true,
      output: "ATTAQUE",
    });
    expect(runTool({ tool: "xor", direction: "encode", input: "BONJOUR", key: "42" })).toEqual({
      ok: true,
      output: "68 65 64 60 65 7f 78",
    });
    expect(
      runTool({ tool: "xor", direction: "decode", input: "68 65 64 60 65 7f 78", key: "0x2a" }),
    ).toEqual({ ok: true, output: "BONJOUR" });
    expect(runTool({ tool: "sha256", direction: "encode", input: "abc", key: "" })).toMatchObject({
      ok: true,
      output: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    });
  });

  it("says what is wrong with an input or a key, in the learner's words", () => {
    expect(runTool({ tool: "base64", direction: "decode", input: "T*", key: "" })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("Ce n'est pas du Base64") as string,
    });
    expect(runTool({ tool: "hex", direction: "decode", input: "abc", key: "" })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("hexadécimal") as string,
    });
    expect(
      runTool({ tool: "caesar", direction: "encode", input: "abc", key: "trois" }),
    ).toMatchObject({
      ok: false,
      problem: expect.stringContaining("nombre entier") as string,
    });
    expect(
      runTool({ tool: "vigenere", direction: "encode", input: "abc", key: "123" }),
    ).toMatchObject({
      ok: false,
      problem: expect.stringContaining("au moins une lettre") as string,
    });
    expect(runTool({ tool: "xor", direction: "encode", input: "abc", key: "" })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("0 à 255") as string,
    });
    expect(runTool({ tool: "xor", direction: "decode", input: "zz", key: "42" })).toMatchObject({
      ok: false,
    });
  });

  it("reads a XOR key as one byte when it is a number, as text otherwise", () => {
    expect(xorKeyBytes("42")).toEqual([42]);
    expect(xorKeyBytes("0x2A")).toEqual([42]);
    expect(xorKeyBytes("256")).toBeNull();
    expect(xorKeyBytes("cle")).toEqual(ascii("cle"));
    expect(xorKeyBytes("  ")).toBeNull();
  });

  it("accepts an answer whatever its case and spacing", () => {
    expect(isAnswer("Rendez-vous à l'aube", " rendez-vous  à l'aube ")).toBe(true);
    expect(isAnswer("abd", "abc")).toBe(false);
  });
});
