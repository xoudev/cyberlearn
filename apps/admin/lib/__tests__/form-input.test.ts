import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { SyntheticEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { keepFormInput } from "../form-input";

/**
 * What a console form keeps of what was typed once its action has answered.
 *
 * React 19 resets a form after the function given to <form action> settles,
 * refusal or not. Every console form that let the server say no lost its
 * uncontrolled fields to that reset: an edited lesson went back to its saved
 * title under the error that refused it, and the next save wrote the old one.
 */

describe("keepFormInput", () => {
  it("cancels the reset React performs after an action", () => {
    const preventDefault = vi.fn();
    // A cast, because only preventDefault is read: the rest of a React event
    // would be scaffolding that this assertion never looks at.
    keepFormInput({ preventDefault } as unknown as SyntheticEvent<HTMLFormElement>);
    expect(preventDefault).toHaveBeenCalledOnce();
  });
});

// ── Every form that needs it carries it ─────────────────────────────────────

const APP = join(__dirname, "..", "..", "app");

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      out.push(...filesUnder(path));
    } else if (path.endsWith(".tsx")) {
      out.push(path);
    }
  }
  return out;
}

/** The opening tag of each <form>, and what sits inside it. */
function forms(source: string): { tag: string; body: string }[] {
  return [...source.matchAll(/<form\b([\s\S]*?)>([\s\S]*?)<\/form>/gu)].map((match) => ({
    tag: match[1] ?? "",
    body: match[2] ?? "",
  }));
}

/**
 * Whether the form holds something typed that a reset would take back: a
 * field with a defaultValue, or an input or textarea nobody controls.
 */
function holdsUncontrolledInput(body: string): boolean {
  if (/\bdefault(?:Value|Checked)=/u.test(body)) return true;
  for (const match of body.matchAll(/<(input|textarea)\b([^>]*)>/gu)) {
    const attributes = match[2] ?? "";
    if (attributes.includes('type="hidden"')) continue;
    if (/\bvalue=/u.test(attributes)) continue;
    return true;
  }
  return false;
}

const CLIENT_FORMS = filesUnder(APP)
  .map((path) => ({ path, source: readFileSync(path, "utf8") }))
  .filter(({ source }) => source.startsWith('"use client"'))
  .flatMap(({ path, source }) =>
    forms(source)
      // A function as the action is what React resets after; a GET form
      // with a URL navigates instead.
      .filter(({ tag }) => /\baction=\{/u.test(tag) && !tag.includes('method="get"'))
      .map((form) => ({ where: relative(APP, path).replace(/\\/gu, "/"), ...form })),
  );

describe("the console's forms", () => {
  it("finds the forms it is about", () => {
    // A guard on the guard: a regex that stopped matching would pass below.
    expect(CLIENT_FORMS.length).toBeGreaterThan(20);
  });

  it("keep what was typed when the server refuses it", () => {
    const missing = CLIENT_FORMS.filter(
      ({ tag, body }) => holdsUncontrolledInput(body) && !/\bonReset=\{/u.test(tag),
    ).map(({ where }) => where);
    expect(missing).toEqual([]);
  });
});
