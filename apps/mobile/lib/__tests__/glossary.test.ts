import { describe, expect, it } from "vitest";
import { glossaryHits, glossaryPlan } from "../glossary";
import type { Block } from "../lesson-blocks";

const plan = (blocks: Block[]) => glossaryPlan(blocks).map((s) => [...s].sort());

describe("glossaryPlan", () => {
  it("gives each word to the first block of the section that uses it", () => {
    expect(
      plan([
        { kind: "paragraph", text: "Le DNS traduit les noms." },
        { kind: "list", ordered: false, items: ["Le DNS encore", "puis SSH"] },
        { kind: "callout", type: "info", text: "Le pare-feu filtre, le DNS répond." },
      ]),
    ).toEqual([["dns"], ["ssh"], ["pare-feu"]]);
  });

  it("never takes a word from code, bold or headings", () => {
    expect(
      plan([
        { kind: "h3", text: "Le DNS" },
        { kind: "paragraph", text: "Lancez `dig DNS`, puis **SSH** ; enfin le *pare-feu*." },
        { kind: "code", lang: "bash", code: "ssh root@host" },
        { kind: "paragraph", text: "Le DNS, le SSH et le pare-feu." },
      ]),
    ).toEqual([[], [], [], ["dns", "pare-feu", "ssh"]]);
  });
});

describe("glossaryHits", () => {
  it("underlines each planned word once across the pieces of a block", () => {
    const remaining = new Set(["dns", "ssh"]);
    expect(glossaryHits("DNS et DNS", remaining).map((h) => [h.start, h.text])).toEqual([
      [0, "DNS"],
    ]);
    expect(glossaryHits("puis DNS et SSH", remaining).map((h) => h.text)).toEqual(["SSH"]);
    expect(remaining.size).toBe(0);
  });

  it("leaves words the plan gave to another block", () => {
    expect(glossaryHits("DNS et SSH", new Set(["ssh"])).map((h) => h.text)).toEqual(["SSH"]);
  });
});
