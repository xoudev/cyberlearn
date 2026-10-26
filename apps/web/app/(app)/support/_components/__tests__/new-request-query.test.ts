import { describe, expect, it } from "vitest";
import { newRequestHref, newRequestPrefill } from "../new-request-query";

/**
 * The window's address, and what it says to write in advance. The public
 * contact page takes an incident's reference and a theme from its address; a
 * signed-in reader sent to the window instead must not lose either.
 */

describe("newRequestHref", () => {
  it("opens the window empty by default", () => {
    expect(newRequestHref()).toBe("/support?request=1");
  });

  it("carries an error screen's incident reference", () => {
    expect(newRequestHref({ incident: "1234567890" })).toBe("/support?request=incident-1234567890");
  });

  it("carries the Android notice", () => {
    expect(newRequestHref("android")).toBe("/support?request=android");
  });

  it("leaves out a reference that is not a plain token, rather than writing it into an address", () => {
    expect(newRequestHref({ incident: "a b&request=x" })).toBe("/support?request=1");
    expect(newRequestHref({ incident: "" })).toBe("/support?request=1");
    expect(newRequestHref({ incident: "x".repeat(65) })).toBe("/support?request=1");
  });
});

describe("newRequestPrefill", () => {
  it("writes nothing for a plain opening", () => {
    expect(newRequestPrefill("1")).toBeNull();
  });

  it("files an incident as a bug whose subject is the public form's", () => {
    expect(newRequestPrefill("incident-1234567890")).toEqual({
      theme: "BUG",
      subject: "Incident 1234567890",
    });
  });

  it("files the Android notice as a suggestion", () => {
    expect(newRequestPrefill("android")).toEqual({
      theme: "FEATURE_REQUEST",
      subject: "Disponibilité de l'application Android",
    });
  });

  it("knows only what it wrote: anything else is nothing", () => {
    for (const value of ["", "incident-", "incident-a b", "incident-<b>", "toString", "ANDROID"]) {
      expect(newRequestPrefill(value)).toBeNull();
    }
    expect(newRequestPrefill(`incident-${"x".repeat(65)}`)).toBeNull();
  });

  it("round-trips what newRequestHref writes", () => {
    const value = new URL(newRequestHref({ incident: "abc-123_X" }), "https://x.test").searchParams;
    expect(newRequestPrefill(value.get("request") ?? "")).toEqual({
      theme: "BUG",
      subject: "Incident abc-123_X",
    });
  });
});
