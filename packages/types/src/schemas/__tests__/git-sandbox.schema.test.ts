import { describe, expect, it } from "vitest";
import { parseGitSandbox } from "../git-sandbox.schema.js";

describe("parseGitSandbox", () => {
  it("accepts a sandbox with nothing but its id: the learner starts with git init", () => {
    expect(parseGitSandbox({ id: "g" })).toEqual({ ok: true, value: { id: "g" } });
  });

  it("reads each kind of check with the fields it needs", () => {
    const parsed = parseGitSandbox({
      id: "g",
      checks: [
        { label: "a", expect: "branch", branch: "feature/login" },
        { label: "b", expect: "commit", branch: "main", message: "Ajoute" },
        { label: "c", expect: "commits", branch: "main", min: 3 },
        { label: "d", expect: "file", path: "src/a.txt", contains: "x", lacks: "<<<<<<<" },
        { label: "e", expect: "linear", branch: "main" },
        { label: "f", expect: "clean" },
      ],
    });
    expect(parsed.ok).toBe(true);
  });

  it("refuses a check missing what it needs, or an unknown one, and says where", () => {
    const missing = parseGitSandbox({
      id: "g",
      checks: [{ label: "a", expect: "commit", branch: "main" }],
    });
    expect(missing.ok ? "" : missing.problem).toContain("checks.0.message");
    expect(parseGitSandbox({ id: "g", checks: [{ label: "a", expect: "tidy" }] }).ok).toBe(false);
  });

  it("refuses a branch or a path no Git would take", () => {
    const check = (branch: string): boolean =>
      parseGitSandbox({ id: "g", checks: [{ label: "a", expect: "branch", branch }] }).ok;
    expect(check("fix/typo")).toBe(true);
    expect(check("-x")).toBe(false);
    expect(check("a b")).toBe(false);
    expect(
      parseGitSandbox({ id: "g", checks: [{ label: "a", expect: "file", path: "/etc/passwd" }] })
        .ok,
    ).toBe(false);
  });
});
