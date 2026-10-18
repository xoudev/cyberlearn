import { describe, expect, it } from "vitest";
import {
  classmateIdentity,
  namedToClass,
  studentIdentity,
  type RosterPerson,
} from "../roster-names";

const ME = "11111111-1111-4111-8111-111111111111";
const FRIEND = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";

function person(id: string, publicProfile: boolean, displayName = "Nom"): RosterPerson {
  return { id, username: `u-${id.slice(0, 4)}`, displayName, preferences: { publicProfile } };
}

const FRIENDS = new Map([[FRIEND, "friends" as const]]);

describe("classmateIdentity", () => {
  it("never shows a student their own row as Anonyme", () => {
    // Profile closed: the class sees "Anonyme", its owner sees their name.
    expect(classmateIdentity(person(ME, false, "Moi"), ME, FRIENDS)).toEqual({
      name: "Moi",
      username: "u-1111",
      visible: true,
      isFriend: false,
      friendship: null,
    });
  });

  it("keeps a closed profile anonymous, unlinked and unmarked for the rest of the class", () => {
    expect(classmateIdentity(person(FRIEND, false), ME, FRIENDS)).toEqual({
      name: "Anonyme",
      username: null,
      visible: false,
      isFriend: false,
      friendship: null,
    });
  });

  it("names and links an open profile, with the friend mark when it is one", () => {
    expect(classmateIdentity(person(FRIEND, true, "Alex"), ME, FRIENDS)).toEqual({
      name: "Alex",
      username: "u-2222",
      visible: true,
      isFriend: true,
      friendship: "friends",
    });
  });

  it("tells a named row where the reader stands, a stranger reading as none", () => {
    const relations = new Map([[OTHER, "incoming" as const]]);
    expect(classmateIdentity(person(OTHER, true), ME, relations).friendship).toBe("incoming");
    expect(classmateIdentity(person(FRIEND, true), ME, relations).friendship).toBe("none");
  });

  it("says nothing on an Anonyme row, even to somebody it asked", () => {
    const relations = new Map([[OTHER, "incoming" as const]]);
    expect(classmateIdentity(person(OTHER, false), ME, relations).friendship).toBeNull();
  });

  it("reads relations only for the classmates a row names", () => {
    expect(namedToClass(person(OTHER, true), ME)).toBe(true);
    expect(namedToClass(person(OTHER, false), ME)).toBe(false);
    expect(namedToClass(person(ME, true), ME)).toBe(false);
  });

  it("falls through an empty display name to the handle", () => {
    expect(classmateIdentity(person(OTHER, true, ""), ME, FRIENDS).name).toBe("u-3333");
  });
});

describe("studentIdentity", () => {
  it("names every student, and links only the profiles that open for the teacher", () => {
    const open = new Set([OTHER]);
    expect(studentIdentity(person(OTHER, true, "Sam"), open)).toEqual({
      name: "Sam",
      username: "u-3333",
    });
    // Closed and not a friend of the teacher: a link here was a 404.
    expect(studentIdentity(person(FRIEND, false, "Alex"), open)).toEqual({
      name: "Alex",
      username: null,
    });
  });
});
