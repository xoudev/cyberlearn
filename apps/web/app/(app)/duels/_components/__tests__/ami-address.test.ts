import { describe, expect, it } from "vitest";
import { duelsAddressFor } from "../ami-address";
import { wantedFriend } from "../duel-query";

/**
 * The old /duels?ami=<id>, from profiles and rematches already shared, lands
 * on the "Défier" window with that friend picked; nothing else rides along.
 */

const ALEX = "22222222-2222-4222-8222-222222222222";

describe("duelsAddressFor", () => {
  it("opens the window with the friend picked", () => {
    expect(duelsAddressFor(ALEX)).toBe(`/duels?duel=${ALEX}`);
    expect(duelsAddressFor([ALEX, "other"])).toBe(`/duels?duel=${ALEX}`);
  });

  it("opens it with nobody picked for anything that is not an id", () => {
    expect(duelsAddressFor("")).toBe("/duels?duel=1");
    expect(duelsAddressFor("alex")).toBe("/duels?duel=1");
    expect(duelsAddressFor("x&settings=profile")).toBe("/duels?duel=1");
    expect(duelsAddressFor([])).toBe("/duels?duel=1");
  });
});

describe("wantedFriend", () => {
  it("reads the friend the window was opened for, none for ?duel=1", () => {
    expect(wantedFriend(ALEX)).toBe(ALEX);
    expect(wantedFriend("1")).toBeNull();
    expect(wantedFriend("")).toBeNull();
  });
});
