import { describe, expect, it } from "vitest";
import { DELETED_PARAM, deletedAccountHref, readDeletionNotice } from "../deletion-notice";

/**
 * What the users list says after an account was deleted from its own page.
 *
 * That page no longer exists once the deletion has run: it answered with
 * Next's default 404, and the two warnings that ask for a manual follow-up
 * were lost with it. They now travel to the list in its address.
 */

function read(href: string): ReturnType<typeof readDeletionNotice> {
  const query = new URL(href, "https://admin.cyberlearn.fr").searchParams;
  return readDeletionNotice(Object.fromEntries(query.entries()));
}

describe("deletedAccountHref", () => {
  it("goes back to the list", () => {
    expect(deletedAccountHref({ emailFailed: false, authSurvived: false })).toMatch(/^\/users\?/u);
  });

  it.each([
    { emailFailed: false, authSurvived: false },
    { emailFailed: true, authSurvived: false },
    { emailFailed: false, authSurvived: true },
    { emailFailed: true, authSurvived: true },
  ])("carries %o to the list intact", (notice) => {
    expect(read(deletedAccountHref(notice))).toEqual(notice);
  });

  it("names nobody: no address and no name in the URL", () => {
    const href = deletedAccountHref({ emailFailed: true, authSurvived: true });
    expect(href).not.toMatch(/@/u);
    expect(href).toBe(`/users?${DELETED_PARAM}=mail-auth`);
  });
});

describe("readDeletionNotice", () => {
  it("says nothing on a list opened the ordinary way", () => {
    expect(readDeletionNotice({})).toBeNull();
    expect(readDeletionNotice({ q: "amelie", page: "2" })).toBeNull();
  });

  it("drops a value nobody wrote, like any other parameter the URL could carry", () => {
    expect(readDeletionNotice({ [DELETED_PARAM]: "<script>" })).toBeNull();
    expect(readDeletionNotice({ [DELETED_PARAM]: "mail-oops" })).toBeNull();
  });
});
