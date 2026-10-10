import { describe, expect, it } from "vitest";
import {
  JWT_LEVELS,
  jsonObjectSchema,
  jwtClaimsSchema,
  jwtHeaderSchema,
  parseJwtLab,
} from "../jwt-lab.schema";

describe("parseJwtLab", () => {
  it("offers every step when the lesson names none, the first one open", () => {
    const parsed = parseJwtLab({ id: "jwt" });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value).toEqual({ id: "jwt", levels: [...JWT_LEVELS] });
  });

  it("keeps the title, the task and the steps in the order written", () => {
    const parsed = parseJwtLab({
      id: "jwt",
      title: "Un jeton, trois défauts",
      task: "Fais-toi accepter comme administrateur.",
      levels: ["none", "decode", "fixed"],
    });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.levels).toEqual(["none", "decode", "fixed"]);
    expect(parsed.value.title).toBe("Un jeton, trois défauts");
  });

  it("refuses a step it does not have, a step written twice, and an empty list", () => {
    expect(parseJwtLab({ id: "jwt", levels: ["rsa"] }).ok).toBe(false);
    expect(parseJwtLab({ id: "jwt", levels: ["none", "decode", "none"] })).toEqual({
      ok: false,
      problem: "levels répète none : chaque étape s'écrit une fois.",
    });
    expect(parseJwtLab({ id: "jwt", levels: [] }).ok).toBe(false);
  });

  it("wants an attack to replay before the corrected verifiers", () => {
    expect(parseJwtLab({ id: "jwt", levels: ["decode", "fixed"] })).toEqual({
      ok: false,
      problem:
        "levels demande « fixed » sans attaque à rejouer : ajoute « none », « weak-secret » ou « confusion ».",
    });
    expect(parseJwtLab({ id: "jwt", levels: ["weak-secret", "fixed"] }).ok).toBe(true);
  });

  it("names the field that is wrong, and refuses a prop it does not know", () => {
    expect(parseJwtLab({ id: "" })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("id : ") as string,
    });
    expect(parseJwtLab({ id: "jwt", secret: "x" }).ok).toBe(false);
  });
});

describe("what the lab reads of a token", () => {
  it("takes an object of anything for the editor's JSON, and nothing else", () => {
    expect(jsonObjectSchema.safeParse({ a: 1, b: [2] }).success).toBe(true);
    expect(jsonObjectSchema.safeParse([1, 2]).success).toBe(false);
    expect(jsonObjectSchema.safeParse("alg").success).toBe(false);
    expect(jsonObjectSchema.safeParse(null).success).toBe(false);
  });

  it("wants an algorithm in the header, as text, and keeps the other fields", () => {
    expect(jwtHeaderSchema.safeParse({ alg: "none" }).success).toBe(true);
    expect(jwtHeaderSchema.safeParse({ alg: "HS256", typ: "JWT", kid: "k1" }).success).toBe(true);
    expect(jwtHeaderSchema.safeParse({ typ: "JWT" }).success).toBe(false);
    expect(jwtHeaderSchema.safeParse({ alg: 256 }).success).toBe(false);
  });

  it("reads the claims the verifiers look at, and refuses a claim of the wrong kind", () => {
    expect(
      jwtClaimsSchema.safeParse({ sub: "alice", role: "admin", exp: 10, aud: ["a", "b"], x: 1 })
        .success,
    ).toBe(true);
    expect(jwtClaimsSchema.safeParse({}).success).toBe(true);
    expect(jwtClaimsSchema.safeParse({ role: 1 }).success).toBe(false);
    expect(jwtClaimsSchema.safeParse({ exp: "demain" }).success).toBe(false);
  });
});
