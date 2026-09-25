import { describe, expect, it } from "vitest";
import {
  boardName,
  friendsBoardNotice,
  friendsCountLabel,
  handleFrom,
  joinedLabel,
  listCountLabel,
  profileCategory,
  profileEyebrow,
  profileRarity,
  removeLabel,
  shortDay,
} from "../friends";

describe("the friends lists", () => {
  it("words the one undo call the way the site's panel does, per list", () => {
    expect(removeLabel("incoming")).toBe("Refuser");
    expect(removeLabel("friends")).toBe("Retirer");
    expect(removeLabel("outgoing")).toBe("Annuler");
  });

  it("counts people and requests", () => {
    expect(listCountLabel("friends", 1)).toBe("1 ami");
    expect(listCountLabel("friends", 4)).toBe("4 amis");
    expect(listCountLabel("incoming", 2)).toBe("2 demandes");
    expect(listCountLabel("outgoing", 1)).toBe("1 demande");
  });
});

describe("the friends board", () => {
  it("counts the others, as the site's heading does", () => {
    expect(friendsCountLabel(0)).toBe("personne pour l'instant");
    expect(friendsCountLabel(1)).toBe("1 ami");
    expect(friendsCountLabel(3)).toBe("3 amis");
  });

  it("says whether the reader is on their friends' boards, and offers the switch", () => {
    expect(friendsBoardNotice(true)).toEqual({
      text: "Tes amis te voient dans leur propre classement.",
      link: "Changer",
    });
    expect(friendsBoardNotice(false).link).toBe("S'y ajouter");
  });

  it("names everybody: nobody on it is anonymous", () => {
    expect(boardName({ displayName: "Alex", username: "alex" })).toBe("Alex");
    expect(boardName({ displayName: "", username: "alex" })).toBe("@alex");
    expect(boardName({ displayName: null, username: null })).toBe("?");
  });
});

describe("a profile page", () => {
  it("carries the site's eyebrow", () => {
    expect(profileEyebrow(false)).toBe("profil public");
    expect(profileEyebrow(true)).toBe("profil privé · visible par ses amis");
  });

  it("writes months the way the site's Intl formatting does, all twelve", () => {
    const long = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
    const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
    for (let month = 0; month < 12; month++) {
      const date = new Date(2026, month, 3, 12);
      expect(joinedLabel(date.toISOString())).toBe(`Membre depuis ${long.format(date)}`);
      expect(shortDay(date.toISOString())).toBe(short.format(date));
    }
  });

  it("has a dash for a lesson with no completion date", () => {
    expect(shortDay(null)).toBe("-");
  });
});

describe("finding somebody by handle", () => {
  it("reads a handle the way it is usually typed", () => {
    expect(handleFrom("@Alex ")).toBe("alex");
    expect(handleFrom("cyber-learn")).toBe("cyber-learn");
    expect(handleFrom("42user")).toBe("42user");
  });

  it("refuses what sign-up would never have accepted", () => {
    expect(handleFrom("")).toBeNull();
    expect(handleFrom("@")).toBeNull();
    expect(handleFrom("ab")).toBeNull();
    expect(handleFrom("-alex")).toBeNull();
    expect(handleFrom("alex-")).toBeNull();
    expect(handleFrom("al ex")).toBeNull();
    expect(handleFrom("a".repeat(33))).toBeNull();
    expect(handleFrom("../admin")).toBeNull();
  });
});

describe("what a profile sends", () => {
  it("draws an unknown rarity as common and leaves an unknown category unlabelled", () => {
    expect(profileRarity("EPIC")).toBe("EPIC");
    expect(profileRarity("MYTHIC")).toBe("COMMON");
    expect(profileCategory("NETWORK")).toBe("NETWORK");
    expect(profileCategory("CLOUD")).toBeNull();
  });
});
