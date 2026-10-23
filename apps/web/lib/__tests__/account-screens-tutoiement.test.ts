import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The site says "tu". The screens about an account's own data - the export,
 * the deletion and the pages its e-mail leads to, the ban page - said "vous",
 * sometimes in the same card as a toast that said "tu". Those are the screens
 * read most carefully, so a change of register there reads as a change of
 * voice, from the product to somebody else. The legal pages (/privacy, /legal)
 * keep "vous" and are not listed.
 */

const WEB = path.resolve(__dirname, "../..");
const ROOTS = [
  "app/(app)/_settings/data",
  "app/account/delete",
  "app/banned",
  "lib/profile/update-profile.ts",
  "lib/rgpd/request-deletion.ts",
];
const FORMAL = /\b(?:vous|votre|vos|veuillez)\b/iu;

function sources(target: string): string[] {
  if (!statSync(target).isDirectory()) return [target];
  return readdirSync(target).flatMap((name) => {
    if (name === "__tests__") return [];
    const full = path.join(target, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(tsx?|mts)$/u.test(name) ? [full] : [];
  });
}

describe("the account's own screens", () => {
  it("say tu, like the rest of the site", () => {
    const offenders = ROOTS.flatMap((root) => sources(path.join(WEB, root)))
      .filter((file) => FORMAL.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(WEB, file).replaceAll("\\", "/"));
    expect(offenders).toEqual([]);
  });
});

/**
 * The same register in the refusals a visitor or a learner reads in the middle
 * of a form: "Trop de demandes. Réessayez dans 540 secondes." sat in the contact
 * form among labels that said "Choisis un thème", and the description of
 * /verify, which search engines show, said "Vérifiez" above a page that says
 * "Entre le numéro". The formal imperative has no "vous" to find, so it is
 * listed by the verbs these messages use.
 */
const MESSAGE_ROOTS = [
  "app/contact",
  "app/verify",
  "lib/tickets",
  "lib/challenges",
  "lib/lessons/qa.ts",
];
const FORMAL_IMPERATIVE = /\b(?:r[ée]essayez|v[ée]rifiez|essayez|contactez|patientez)\b/iu;

describe("the refusals and descriptions around the forms", () => {
  it("say tu, like the rest of the site", () => {
    const offenders = MESSAGE_ROOTS.flatMap((root) => sources(path.join(WEB, root)))
      .filter((file) => {
        const text = readFileSync(file, "utf8");
        return FORMAL.test(text) || FORMAL_IMPERATIVE.test(text);
      })
      .map((file) => path.relative(WEB, file).replaceAll("\\", "/"));
    expect(offenders).toEqual([]);
  });
});
