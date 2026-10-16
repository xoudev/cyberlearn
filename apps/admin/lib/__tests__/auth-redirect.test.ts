import { describe, expect, it } from "vitest";
import {
  ACCESS_DENIED_PATH,
  ADMIN_HOME,
  isAccessDeniedPath,
  isMfaPath,
  isPublicPath,
  returnPathOf,
  safeAdminRedirect,
  withReturnPath,
} from "../auth-redirect";

const CONSOLE = "https://admin.cyberlearn.fr";

describe("safeAdminRedirect", () => {
  it("keeps a page of the console, with its query", () => {
    expect(safeAdminRedirect("/users/u-42")).toBe("/users/u-42");
    expect(safeAdminRedirect("/tickets?status=OPEN")).toBe("/tickets?status=OPEN");
  });

  it("falls back to the dashboard when nothing was asked for", () => {
    expect(safeAdminRedirect(undefined)).toBe(ADMIN_HOME);
    expect(safeAdminRedirect(null)).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("/")).toBe(ADMIN_HOME);
  });

  it("refuses anything that would leave the console", () => {
    expect(safeAdminRedirect("https://evil.example/users")).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("//evil.example")).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("/\\evil.example")).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("/\t/evil.example")).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("users")).toBe(ADMIN_HOME);
    expect(safeAdminRedirect(42)).toBe(ADMIN_HOME);
  });

  it("refuses a sign-in step, which would only send the admin round again", () => {
    expect(safeAdminRedirect("/login")).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("/login?redirectTo=%2Fusers")).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("/mfa")).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("/mfa/setup")).toBe(ADMIN_HOME);
  });

  it("refuses the access-denied screen, which is nobody's destination", () => {
    expect(safeAdminRedirect(ACCESS_DENIED_PATH)).toBe(ADMIN_HOME);
    expect(safeAdminRedirect("/access-denied?from=%2Fusers")).toBe(ADMIN_HOME);
  });
});

describe("isAccessDeniedPath", () => {
  it("names the access-denied screen and nothing else", () => {
    expect(isAccessDeniedPath("/access-denied")).toBe(true);
    expect(isAccessDeniedPath("/access-denied/more")).toBe(false);
    expect(isAccessDeniedPath("/users")).toBe(false);
  });
});

describe("withReturnPath", () => {
  it("adds the destination, encoded", () => {
    expect(withReturnPath("/login", "redirectTo", "/users?role=ADMIN")).toBe(
      "/login?redirectTo=%2Fusers%3Frole%3DADMIN",
    );
    expect(withReturnPath("/mfa", "next", "/audit")).toBe("/mfa?next=%2Faudit");
  });

  it("stays bare for the dashboard or a destination it refuses", () => {
    expect(withReturnPath("/login", "redirectTo", ADMIN_HOME)).toBe("/login");
    expect(withReturnPath("/mfa", "next", "//evil.example")).toBe("/mfa");
  });
});

describe("returnPathOf", () => {
  it("reads the page a request was after", () => {
    expect(returnPathOf(new URL(`${CONSOLE}/users/u-42?tab=bans`))).toBe("/users/u-42?tab=bans");
  });

  it("drops the router's cache key", () => {
    expect(returnPathOf(new URL(`${CONSOLE}/tickets?_rsc=1x2y`))).toBe("/tickets");
    expect(returnPathOf(new URL(`${CONSOLE}/tickets?status=OPEN&_rsc=1x2y`))).toBe(
      "/tickets?status=OPEN",
    );
  });

  it("reads the destination a sign-in step carries", () => {
    expect(returnPathOf(new URL(`${CONSOLE}/mfa?next=%2Fusers`))).toBe("/users");
    expect(returnPathOf(new URL(`${CONSOLE}/mfa/setup?next=%2Faudit`))).toBe("/audit");
    expect(returnPathOf(new URL(`${CONSOLE}/login?redirectTo=%2Fpaths`))).toBe("/paths");
    expect(returnPathOf(new URL(`${CONSOLE}/mfa`))).toBe(ADMIN_HOME);
  });

  it("does not bring a fresh sign-in back to the access-denied screen", () => {
    expect(returnPathOf(new URL(`${CONSOLE}/access-denied`))).toBe(ADMIN_HOME);
  });
});

describe("the sign-in steps", () => {
  it("knows which paths are public and which belong to the TOTP step", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/robots.txt")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isMfaPath("/mfa")).toBe(true);
    expect(isMfaPath("/mfa/setup")).toBe(true);
    expect(isMfaPath("/mfactory")).toBe(false);
  });
});
