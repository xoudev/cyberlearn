// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { checkExpectation, executableIn, headerValue, isHtml, type PhpResponse } from "../expect";
import { previewDocument } from "../preview";

const page = (body: string, extra: Partial<PhpResponse> = {}): PhpResponse => ({
  status: 200,
  headers: ["X-Powered-By: PHP/8.4.1"],
  body,
  fatal: false,
  ...extra,
});

describe("checkExpectation", () => {
  it("holds when every field given holds", () => {
    expect(
      checkExpectation(
        {
          status: 200,
          contains: "Résultats pour : php",
          notContains: "<script>",
          executable: false,
        },
        page("<p>Résultats pour : php</p>"),
      ),
    ).toEqual({ ok: true });
  });

  it("takes one status among several, and says which were wanted", () => {
    expect(checkExpectation({ status: [403, 404] }, page("no", { status: 404 }))).toEqual({
      ok: true,
    });
    expect(checkExpectation({ status: [403, 404] }, page("yes", { status: 200 }))).toEqual({
      ok: false,
      reason: "Statut 200 au lieu de 403 ou 404.",
    });
    expect(checkExpectation({ status: 401 }, page("", { status: 200 }))).toEqual({
      ok: false,
      reason: "Statut 200 au lieu de 401.",
    });
  });

  it("says what the body holds, or no longer holds", () => {
    expect(checkExpectation({ contains: "Alice" }, page("Bob"))).toEqual({
      ok: false,
      reason: "La page ne contient pas « Alice ».",
    });
    expect(checkExpectation({ notContains: "Alice" }, page("Facture de Alice"))).toEqual({
      ok: false,
      reason: "La page contient encore « Alice ».",
    });
  });

  it("asks for code a browser would run, or for none, and names it", () => {
    const attacked = page("<p>Résultats : <script>alert(1)</script></p>");
    expect(checkExpectation({ executable: true }, attacked)).toEqual({ ok: true });
    expect(checkExpectation({ executable: false }, attacked)).toEqual({
      ok: false,
      reason: "La page contient encore du code exécutable : une balise <script> (alert(1)).",
    });
    expect(checkExpectation({ executable: true }, page("&lt;script&gt;"))).toEqual({
      ok: false,
      reason: "La page ne contient aucun code exécutable.",
    });
  });

  it("reports the first thing that is off", () => {
    expect(
      checkExpectation({ status: 200, contains: "x" }, page("y", { status: 500 })),
    ).toMatchObject({ reason: "Statut 500 au lieu de 200." });
  });
});

describe("what a browser would run depends on what the page said it was", () => {
  it("reads a header whatever its case", () => {
    const response = page("", {
      headers: ["Content-Type: text/plain; charset=UTF-8", "X-Lab: yes"],
    });
    expect(headerValue(response, "content-type")).toBe("text/plain; charset=UTF-8");
    expect(headerValue(response, "X-LAB")).toBe("yes");
    expect(headerValue(response, "location")).toBeNull();
  });

  it("takes a page for HTML unless it says it is not", () => {
    expect(isHtml(page(""))).toBe(true);
    expect(isHtml(page("", { headers: ["Content-Type: text/html; charset=utf-8"] }))).toBe(true);
    expect(isHtml(page("", { headers: ["Content-Type: application/json"] }))).toBe(false);
  });

  it("finds nothing to run in a script served as plain text or JSON", () => {
    const script = "<script>alert(1)</script>";
    expect(executableIn(page(script))).toHaveLength(1);
    expect(executableIn(page(script, { headers: ["Content-Type: text/plain"] }))).toEqual([]);
    expect(executableIn(page(script, { headers: ["Content-Type: application/json"] }))).toEqual([]);
  });
});

describe("previewDocument", () => {
  it("puts a policy that forbids every fetch ahead of the page, and sends links nowhere", () => {
    const document = previewDocument("<h1>Blog</h1>");
    expect(document.startsWith("<!doctype html>")).toBe(true);
    expect(document).toContain(`default-src 'none'`);
    expect(document).toContain(`<base target="_blank">`);
    expect(document.indexOf("Content-Security-Policy")).toBeLessThan(document.indexOf("<h1>"));
    expect(document.endsWith("<h1>Blog</h1>")).toBe(true);
  });
});
