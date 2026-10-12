import { describe, expect, it } from "vitest";
import { gridHref, sortValue } from "../grid-href";
import { dayParam, parisDayEnd, parisDayStart, rawParams, sortParam } from "../grid-params";
import {
  auditFilterOf,
  auditListSearch,
  lessonListSearch,
  lessonQueryOf,
  parseAuditListParams,
  parseLessonListParams,
  parsePendingListParams,
  parseUserListParams,
  pendingListSearch,
  userListSearch,
  userQueryOf,
  withKnownAction,
} from "../list-params";

/**
 * The console's lists read their filters from the URL, which anybody can
 * type. What is checked here: a valid value goes through, anything else is
 * dropped rather than refused, and the links a list builds carry only what it
 * understood, defaults left out.
 */

describe("the account list's parameters", () => {
  it("opens on the newest accounts, page 1, with no filter", () => {
    const params = parseUserListParams({});
    expect(params).toEqual({
      q: "",
      role: undefined,
      sort: { key: "created", dir: "desc" },
      page: 1,
    });
    expect(userListSearch(params)).toEqual({});
  });

  it("reads a search, a role, a sort and a page", () => {
    const params = parseUserListParams({ q: "  amel ", role: "TEACHER", sort: "-xp", page: "3" });
    expect(params).toEqual({
      q: "amel",
      role: "TEACHER",
      sort: { key: "xp", dir: "desc" },
      page: 3,
    });
    expect(userListSearch(params)).toEqual({ q: "amel", role: "TEACHER", sort: "-xp", page: "3" });
    expect(userQueryOf(params)).toMatchObject({ page: 3, pageSize: 25 });
  });

  it("ignores what it does not know, rather than failing", () => {
    expect(
      parseUserListParams({ role: "ROOT", sort: "password", page: "-2", q: ["a", "b"] }),
    ).toEqual({ q: "a", role: undefined, sort: { key: "created", dir: "desc" }, page: 1 });
    expect(parseUserListParams({ page: "1.5" }).page).toBe(1);
    expect(parseUserListParams({ page: "abc" }).page).toBe(1);
    expect(parseUserListParams({ page: "999999999" }).page).toBe(1);
  });

  it("cuts a search pasted past the box's length", () => {
    expect(parseUserListParams({ q: "x".repeat(300) }).q).toHaveLength(100);
  });

  it("keeps the default sort out of the URL", () => {
    expect(userListSearch(parseUserListParams({ sort: "-created" }))).toEqual({});
    expect(userListSearch(parseUserListParams({ sort: "created" }))).toEqual({ sort: "created" });
  });
});

describe("the pending sign-ups' parameters", () => {
  it("has a search and a page, nothing else", () => {
    const params = parsePendingListParams({ q: "gmail", page: "2", role: "ADMIN" });
    expect(params).toEqual({ q: "gmail", page: 2 });
    expect(pendingListSearch(params)).toEqual({ q: "gmail", page: "2" });
    expect(pendingListSearch({ q: "", page: 1 })).toEqual({});
  });
});

describe("the audit log's parameters", () => {
  it("reads who, on what, which action and which days", () => {
    const params = parseAuditListParams({
      actor: "@jordan",
      target: "Lesson",
      action: "admin.user.mfa_reset",
      from: "2026-10-01",
      to: "2026-10-07",
      sort: "date",
      page: "2",
    });
    expect(params).toEqual({
      actor: "@jordan",
      target: "Lesson",
      action: "admin.user.mfa_reset",
      from: "2026-10-01",
      to: "2026-10-07",
      dir: "asc",
      page: 2,
    });
    expect(auditListSearch(params)).toEqual({
      actor: "@jordan",
      target: "Lesson",
      action: "admin.user.mfa_reset",
      from: "2026-10-01",
      to: "2026-10-07",
      sort: "date",
      page: "2",
    });
  });

  it("drops an action that is not one, and a day that does not exist", () => {
    const params = parseAuditListParams({
      action: "drop table; --",
      from: "2026-02-30",
      to: "12/10/2026",
    });
    expect(params).toMatchObject({
      action: undefined,
      from: undefined,
      to: undefined,
      dir: "desc",
    });
    expect(auditListSearch(params)).toEqual({});
  });

  it("keeps an action filter only when the log holds that action", () => {
    const params = parseAuditListParams({ action: "lesson.create" });
    expect(withKnownAction(params, ["lesson.create"]).action).toBe("lesson.create");
    expect(withKnownAction(params, ["lesson.update"]).action).toBeUndefined();
  });

  it("reads the days in Paris time, the last one included", () => {
    const filter = auditFilterOf(parseAuditListParams({ from: "2026-10-01", to: "2026-10-07" }));
    // Summer time: Paris is UTC+2.
    expect(filter.from).toEqual(new Date("2026-09-30T22:00:00Z"));
    expect(filter.until).toEqual(new Date("2026-10-07T22:00:00Z"));
    // Winter time, and the end of a month.
    expect(parisDayStart("2026-12-01")).toEqual(new Date("2026-11-30T23:00:00Z"));
    expect(parisDayEnd("2026-12-31")).toEqual(new Date("2026-12-31T23:00:00Z"));
    // The day the clocks go back is 25 hours long.
    expect(parisDayEnd("2026-10-25")).toEqual(new Date("2026-10-25T23:00:00Z"));
  });

  it("has no date bound without a day", () => {
    const filter = auditFilterOf(parseAuditListParams({}));
    expect(filter.from).toBeUndefined();
    expect(filter.until).toBeUndefined();
    expect(dayParam({ from: "" }, "from")).toBeUndefined();
  });
});

describe("the lesson lists' parameters", () => {
  it("reads every filter of the working list", () => {
    const params = parseLessonListParams(
      {
        q: "osi",
        category: "NETWORK",
        difficulty: "EXPERT",
        status: "DRAFT",
        origin: "first",
        sort: "-xp",
        page: "2",
      },
      "active",
    );
    expect(lessonListSearch(params)).toEqual({
      q: "osi",
      category: "NETWORK",
      difficulty: "EXPERT",
      status: "DRAFT",
      origin: "first",
      sort: "-xp",
      page: "2",
    });
    expect(lessonQueryOf(params, "active")).toMatchObject({
      folder: "active",
      status: "DRAFT",
      sort: { key: "xp", dir: "desc" },
      pageSize: 50,
    });
  });

  it("has no status filter in the archives, and no archived status in the working list", () => {
    expect(parseLessonListParams({ status: "DRAFT" }, "archives").status).toBeUndefined();
    expect(parseLessonListParams({ status: "ARCHIVED" }, "active").status).toBeUndefined();
  });

  it("keeps its own order when the URL names no sort, or one it does not know", () => {
    expect(parseLessonListParams({}, "active").sort).toBeUndefined();
    expect(parseLessonListParams({ sort: "-completions" }, "active").sort).toBeUndefined();
    expect(parseLessonListParams({ category: "dev" }, "active").category).toBeUndefined();
  });
});

describe("the links a list builds", () => {
  it("changes one parameter and goes back to the first page", () => {
    const params = { q: "amel", page: "4" };
    expect(gridHref("/users", params, { role: "ADMIN" })).toBe("/users?q=amel&role=ADMIN");
    expect(gridHref("/users", params, { q: null })).toBe("/users");
    expect(gridHref("/users", params, { q: "" })).toBe("/users");
  });

  it("keeps the other parameters when only the page changes", () => {
    expect(gridHref("/users", { q: "amel" }, { page: "2" })).toBe("/users?q=amel&page=2");
    expect(gridHref("/users", { q: "amel", page: "2" }, { page: null })).toBe("/users?q=amel");
  });

  it("encodes what it writes", () => {
    expect(gridHref("/audit", {}, { actor: "a b&c" })).toBe("/audit?actor=a+b%26c");
  });

  it("writes a sort signed, and reads it back", () => {
    expect(sortValue("xp", "desc")).toBe("-xp");
    expect(sortValue("xp", "asc")).toBe("xp");
    expect(sortParam({ sort: "-xp" }, ["xp", "level"])).toEqual({ key: "xp", dir: "desc" });
    expect(sortParam({ sort: "--xp" }, ["xp", "level"])).toBeUndefined();
  });

  it("reads a route's query the way a page receives its params", () => {
    expect(rawParams(new URLSearchParams("a=1&b=2&b=3"))).toEqual({ a: "1", b: ["2", "3"] });
  });
});
