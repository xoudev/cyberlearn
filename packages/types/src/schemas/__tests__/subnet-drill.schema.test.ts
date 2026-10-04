import { describe, expect, it } from "vitest";
import { SUBNET_DRILL_KINDS, parseSubnetDrill } from "../subnet-drill.schema";

describe("parseSubnetDrill", () => {
  it("fills in what a lesson leaves out: every kind, /24 to /30, five questions", () => {
    const parsed = parseSubnetDrill({ id: "d" });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value).toEqual({
      id: "d",
      kinds: [...SUBNET_DRILL_KINDS],
      prefixes: { min: 24, max: 30 },
      count: 5,
    });
  });

  it("keeps what the author chose", () => {
    const parsed = parseSubnetDrill({
      id: "d",
      title: "Les tiroirs",
      task: "Calcule d'abord les bits d'hôte.",
      kinds: ["hosts", "same-subnet"],
      prefixes: { min: 16, max: 28 },
      count: 8,
    });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.kinds).toEqual(["hosts", "same-subnet"]);
    expect(parsed.value.prefixes).toEqual({ min: 16, max: 28 });
    expect(parsed.value.count).toBe(8);
  });

  it("refuses a prefix a question could not be asked on, and says which prop", () => {
    expect(parseSubnetDrill({ id: "d", prefixes: { min: 24, max: 31 } })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("prefixes.max : ") as string,
    });
    expect(parseSubnetDrill({ id: "d", prefixes: { min: 4, max: 24 } })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("prefixes.min : ") as string,
    });
  });

  it("refuses bounds the wrong way round", () => {
    expect(parseSubnetDrill({ id: "d", prefixes: { min: 28, max: 24 } })).toEqual({
      ok: false,
      problem: "prefixes.min vaut 28 et dépasse prefixes.max, 24.",
    });
  });

  it("refuses a kind it does not know, and a kind written twice", () => {
    expect(parseSubnetDrill({ id: "d", kinds: ["hosts", "gateway"] }).ok).toBe(false);
    expect(parseSubnetDrill({ id: "d", kinds: ["hosts", "mask", "hosts"] })).toEqual({
      ok: false,
      problem: "kinds répète hosts : chaque sorte de question s'écrit une fois.",
    });
  });

  it("refuses cutting a network when there is one prefix only", () => {
    expect(
      parseSubnetDrill({ id: "d", kinds: ["subnets"], prefixes: { min: 24, max: 24 } }),
    ).toEqual({
      ok: false,
      problem:
        "découper un réseau (subnets) demande deux préfixes : prefixes.min et prefixes.max valent tous deux 24.",
    });
    expect(parseSubnetDrill({ id: "d", kinds: ["hosts"], prefixes: { min: 24, max: 24 } }).ok).toBe(
      true,
    );
  });

  it("refuses a series too long to be a drill, and an empty list of kinds", () => {
    expect(parseSubnetDrill({ id: "d", count: 21 }).ok).toBe(false);
    expect(parseSubnetDrill({ id: "d", count: 0 }).ok).toBe(false);
    expect(parseSubnetDrill({ id: "d", kinds: [] }).ok).toBe(false);
  });
});
