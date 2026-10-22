import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { CONSOLE_TIME_ZONE, consoleDateFormat } from "../console-time";

describe("consoleDateFormat", () => {
  const STAMP = { dateStyle: "long", timeStyle: "short" } as const;

  it("reads an instant on Paris's clock, summer time included", () => {
    // 08:12 UTC on 18 October: CEST, two hours ahead.
    expect(consoleDateFormat(STAMP).format(new Date("2026-10-18T08:12:00Z"))).toContain("10:12");
  });

  it("follows the clock change: one hour ahead in winter", () => {
    expect(consoleDateFormat(STAMP).format(new Date("2026-12-18T08:12:00Z"))).toContain("09:12");
  });

  it("changes the day when Paris's midnight has passed and UTC's has not", () => {
    const evening = new Date("2026-10-17T22:30:00Z");
    expect(consoleDateFormat({ dateStyle: "long" }).format(evening)).toBe("18 octobre 2026");
    // What a server in UTC printed before.
    expect(
      new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(evening),
    ).toBe("17 octobre 2026");
  });

  it("is French", () => {
    expect(consoleDateFormat({ month: "long" }).format(new Date("2026-02-10T12:00:00Z"))).toBe(
      "février",
    );
  });

  it("names Paris", () => {
    expect(CONSOLE_TIME_ZONE).toBe("Europe/Paris");
    expect(consoleDateFormat({ hour: "numeric" }).resolvedOptions().timeZone).toBe("Europe/Paris");
  });
});

/**
 * Every formatter the console builds names a zone. One that does not reads the
 * server's: UTC on Vercel, so the ticket's "08:12" and the account page's
 * "10:12" were the same ban, and a laptop in Paris never showed it.
 */
describe("the console's date formatters", () => {
  const ROOT = join(__dirname, "..", "..");

  function sources(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) out.push(...sources(path));
      else if (/\.tsx?$/u.test(name)) out.push(path);
    }
    return out;
  }

  /** The argument list of every call of `callee(` in `source`, parentheses balanced. */
  function callsOf(source: string, callee: RegExp): string[] {
    const calls: string[] = [];
    for (const match of source.matchAll(callee)) {
      let depth = 1;
      let end = match.index + match[0].length;
      while (end < source.length && depth > 0) {
        const char = source[end];
        if (char === "(") depth += 1;
        else if (char === ")") depth -= 1;
        end += 1;
      }
      calls.push(source.slice(match.index + match[0].length, end - 1));
    }
    return calls;
  }

  const files = [...sources(join(ROOT, "app")), ...sources(join(ROOT, "lib"))];

  it("finds the console's sources", () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it("builds no Intl.DateTimeFormat without a time zone", () => {
    const without: string[] = [];
    for (const file of files) {
      for (const args of callsOf(readFileSync(file, "utf8"), /Intl\.DateTimeFormat\(/gu)) {
        if (!args.includes("timeZone")) without.push(relative(ROOT, file).replace(/\\/gu, "/"));
      }
    }
    expect(without).toEqual([]);
  });

  it("formats no date or time with toLocale*String without a time zone", () => {
    const without: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const args of callsOf(source, /\.toLocale(?:Date|Time)String\(/gu)) {
        if (!args.includes("timeZone")) without.push(relative(ROOT, file).replace(/\\/gu, "/"));
      }
    }
    expect(without).toEqual([]);
  });
});
