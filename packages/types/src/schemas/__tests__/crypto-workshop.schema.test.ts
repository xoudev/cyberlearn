import { describe, expect, it } from "vitest";
import { CRYPTO_TOOLS, parseCryptoWorkshop } from "../crypto-workshop.schema";

describe("parseCryptoWorkshop", () => {
  it("offers every tool when the lesson names none, the first one open", () => {
    const parsed = parseCryptoWorkshop({ id: "w" });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value).toEqual({ id: "w", tools: [...CRYPTO_TOOLS] });
  });

  it("keeps the tools, the starting input and the challenge", () => {
    const parsed = parseCryptoWorkshop({
      id: "w",
      title: "Le XOR",
      tools: ["xor", "hex"],
      input: "BONJOUR",
      challenge: { ciphertext: "68 65", answer: "BO", hint: "La clé est 42." },
    });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.tools).toEqual(["xor", "hex"]);
    expect(parsed.value.input).toBe("BONJOUR");
    expect(parsed.value.challenge).toEqual({
      ciphertext: "68 65",
      answer: "BO",
      hint: "La clé est 42.",
    });
  });

  it("refuses a tool it does not have, a tool written twice, and an empty list", () => {
    expect(parseCryptoWorkshop({ id: "w", tools: ["rot13"] }).ok).toBe(false);
    expect(parseCryptoWorkshop({ id: "w", tools: ["xor", "hex", "xor"] })).toEqual({
      ok: false,
      problem: "tools répète xor : chaque outil s'écrit une fois.",
    });
    expect(parseCryptoWorkshop({ id: "w", tools: [] }).ok).toBe(false);
  });

  it("wants a challenge with its ciphertext and its answer, and names what is missing", () => {
    expect(parseCryptoWorkshop({ id: "w", challenge: { ciphertext: "x" } })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("challenge.answer : ") as string,
    });
    expect(parseCryptoWorkshop({ id: "w", challenge: { ciphertext: "", answer: "a" } }).ok).toBe(
      false,
    );
  });
});
