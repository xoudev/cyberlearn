import { describe, expect, it } from "vitest";
import {
  firstEnabled,
  lastEnabled,
  matchTypeahead,
  moveActive,
  type NavOption,
} from "../components/select-nav.js";

const OPTIONS: NavOption[] = [
  { label: "Cybersécurité" },
  { label: "Développement", disabled: true },
  { label: "Réseau" },
  { label: "Réglages" },
];

describe("moving through the options", () => {
  it("steps over a disabled option instead of stopping on it", () => {
    expect(moveActive(OPTIONS, 0, 1)).toBe(2);
    expect(moveActive(OPTIONS, 2, -1)).toBe(0);
  });

  it("stays put at either end rather than wrapping round", () => {
    // A native select does not wrap, and neither does the ARIA listbox
    // pattern: pressing Down at the bottom jumping silently back to the top is
    // a way to lose your place in a long list.
    expect(moveActive(OPTIONS, 3, 1)).toBe(3);
    expect(moveActive(OPTIONS, 0, -1)).toBe(0);
  });

  it("enters the list from the end the key points away from", () => {
    expect(moveActive(OPTIONS, -1, 1)).toBe(0);
    expect(moveActive(OPTIONS, -1, -1)).toBe(3);
  });

  it("leaves a disabled starting point rather than sticking to it", () => {
    // The stored value can be an option that has since been disabled.
    expect(moveActive(OPTIONS, 1, 1)).toBe(2);
    expect(moveActive(OPTIONS, 1, -1)).toBe(0);
  });

  it("has nowhere to go in a list of nothing but disabled options", () => {
    const dead: NavOption[] = [
      { label: "a", disabled: true },
      { label: "b", disabled: true },
    ];
    expect(moveActive(dead, -1, 1)).toBeNull();
    expect(moveActive(dead, 0, 1)).toBeNull();
    expect(firstEnabled(dead)).toBeNull();
    expect(lastEnabled(dead)).toBeNull();
  });

  it("finds the ends, skipping disabled entries", () => {
    expect(firstEnabled([{ label: "x", disabled: true }, { label: "y" }])).toBe(1);
    expect(lastEnabled([{ label: "y" }, { label: "x", disabled: true }])).toBe(0);
  });
});

describe("type-ahead", () => {
  it("ignores accents and case, because the labels are French", () => {
    expect(matchTypeahead(OPTIONS, "re", -1)).toBe(2);
    expect(matchTypeahead(OPTIONS, "CYBER", -1)).toBe(0);
  });

  it("walks through the options sharing a letter instead of sticking to one", () => {
    expect(matchTypeahead(OPTIONS, "r", -1)).toBe(2);
    expect(matchTypeahead(OPTIONS, "r", 2)).toBe(3);
    // And comes back round, so the letter never stops answering.
    expect(matchTypeahead(OPTIONS, "r", 3)).toBe(2);
  });

  it("narrows as more letters arrive", () => {
    expect(matchTypeahead(OPTIONS, "rés", 1)).toBe(2);
    expect(matchTypeahead(OPTIONS, "rég", 1)).toBe(3);
  });

  it("never lands on a disabled option, or on nothing", () => {
    expect(matchTypeahead(OPTIONS, "d", -1)).toBeNull();
    expect(matchTypeahead(OPTIONS, "zz", -1)).toBeNull();
    expect(matchTypeahead(OPTIONS, "", -1)).toBeNull();
    expect(matchTypeahead([], "a", -1)).toBeNull();
  });
});
