import { describe, expect, it } from "vitest";
import { parseMatchPairs } from "../match-pairs.schema";
import { parsePutInOrder } from "../put-in-order.schema";

describe("parsePutInOrder", () => {
  const OSI = {
    id: "osi",
    task: "De la plus basse à la plus haute.",
    items: ["Physique", "Liaison", "Réseau", "Transport"],
  };

  it("accepts items written in order, with or without an explanation", () => {
    expect(parsePutInOrder(OSI).ok).toBe(true);
    expect(
      parsePutInOrder({ ...OSI, explanation: "Parce que.", hint: "Le câble d'abord." }).ok,
    ).toBe(true);
  });

  it("wants three to ten items, each once", () => {
    expect(parsePutInOrder({ ...OSI, items: ["a", "b"] }).ok).toBe(false);
    expect(
      parsePutInOrder({ ...OSI, items: Array.from({ length: 11 }, (_, i) => String(i)) }).ok,
    ).toBe(false);
    expect(parsePutInOrder({ ...OSI, items: ["a", "b", "a"] })).toEqual({
      ok: false,
      problem: "items répète « a » : deux éléments identiques n'ont pas d'ordre.",
    });
  });

  it("names the missing prop", () => {
    expect(parsePutInOrder({ id: "osi", items: ["a", "b", "c"] })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("task : ") as string,
    });
  });
});

describe("parseMatchPairs", () => {
  const PORTS = {
    id: "ports",
    task: "Chaque port à son service.",
    pairs: [
      { left: "22", right: "SSH" },
      { left: "53", right: "DNS" },
      { left: "80", right: "HTTP" },
    ],
  };

  it("accepts three to eight pairs", () => {
    expect(parseMatchPairs(PORTS).ok).toBe(true);
    expect(parseMatchPairs({ ...PORTS, pairs: PORTS.pairs.slice(0, 2) }).ok).toBe(false);
  });

  it("refuses a side written twice, and says which column", () => {
    expect(
      parseMatchPairs({ ...PORTS, pairs: [...PORTS.pairs, { left: "8080", right: "HTTP" }] }),
    ).toEqual({
      ok: false,
      problem:
        "pairs répète « HTTP » à droite : chaque élément d'une colonne s'écrit une fois, sinon l'association est ambiguë.",
    });
    expect(
      parseMatchPairs({ ...PORTS, pairs: [...PORTS.pairs, { left: "22", right: "SFTP" }] }),
    ).toMatchObject({ ok: false, problem: expect.stringContaining("à gauche") as string });
  });

  it("refuses a pair missing a side, and names it", () => {
    expect(parseMatchPairs({ ...PORTS, pairs: [...PORTS.pairs, { left: "443" }] })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("pairs.3.right : ") as string,
    });
  });
});
