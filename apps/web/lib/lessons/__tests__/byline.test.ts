/**
 * Who a lesson is credited to, and the distinction the byline exists to make.
 *
 * The bug it fixes: every catalogue lesson said "Compte supprimé", because a
 * null author was read as an erased account when for those lessons there was
 * never a personal author to erase.
 */

import { describe, expect, it } from "vitest";
import { lessonByline, PLATFORM_BYLINE, type BylineAuthor } from "../byline";

function author(over: Partial<BylineAuthor> = {}): BylineAuthor {
  return {
    username: "nadia",
    displayName: "Nadia Belkacem",
    role: "TEACHER",
    preferences: { publicProfile: true },
    ...over,
  };
}

describe("a lesson with no author", () => {
  it("credits the platform when the lesson is the platform's", () => {
    // The 192 imported from MDX. They never had a person behind them.
    expect(lessonByline(null, "CATALOGUE")).toEqual({
      kind: "platform",
      name: PLATFORM_BYLINE,
      roleLabel: null,
      profilePath: null,
    });
  });

  it("says the account is gone when somebody did write it", () => {
    // A lesson a teacher wrote for their classes: there was a person, and the
    // column is null because they were erased. Saying so is the honest answer.
    expect(lessonByline(null, "CLASS")).toMatchObject({
      kind: "gone",
      name: "Compte supprimé",
      profilePath: null,
    });
  });
});

describe("a lesson with an author", () => {
  it("names them and links their profile", () => {
    expect(lessonByline(author(), "CATALOGUE")).toEqual({
      kind: "person",
      name: "Nadia Belkacem",
      roleLabel: "Professeur",
      profilePath: "/u/nadia",
    });
  });

  it("falls through an empty name to the handle", () => {
    expect(lessonByline(author({ displayName: "   " }), "CLASS").name).toBe("nadia");
  });

  it("has nowhere to link somebody who has no handle yet", () => {
    const byline = lessonByline(author({ username: null, displayName: "Sacha" }), "CATALOGUE");
    expect(byline.name).toBe("Sacha");
    expect(byline.profilePath).toBeNull();
  });

  it("respects a private profile without pretending the lesson has no author", () => {
    const byline = lessonByline(author({ preferences: { publicProfile: false } }), "CATALOGUE");
    expect(byline).toMatchObject({ kind: "anonymous", name: "Anonyme", profilePath: null });
    // Not the platform, and not gone: somebody wrote it and chose not to say so.
    expect(byline.name).not.toBe(PLATFORM_BYLINE);
  });

  it("treats a missing preferences row as a public profile", () => {
    expect(lessonByline(author({ preferences: null }), "CATALOGUE").kind).toBe("person");
  });

  it("names the platform as such when an admin wrote the lesson", () => {
    expect(lessonByline(author({ role: "ADMIN" }), "CATALOGUE").roleLabel).toBe(PLATFORM_BYLINE);
  });

  it("leaves a student's role unstated rather than inventing one", () => {
    expect(lessonByline(author({ role: "STUDENT" }), "CLASS").roleLabel).toBeNull();
  });
});
