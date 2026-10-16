/**
 * The site, the mobile app and the console show Zod's message when a schema
 * does not word one itself. Once the locale is set, that message is French,
 * worded for the person filling the form, for every schema.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { configureZodLocale } from "../zod-locale.js";

function messageOf(schema: z.ZodType, input: unknown): string | undefined {
  return schema.safeParse(input).error?.issues[0]?.message;
}

// Built before the call on purpose: the setting is global, not per schema.
const contact = z.object({
  email: z.email(),
  subject: z.string().trim().min(5).max(200),
});

beforeAll(() => {
  configureZodLocale();
});

describe("configureZodLocale", () => {
  it("says a required string is required, whether missing or empty", () => {
    expect(messageOf(z.object({ name: z.string() }), {})).toBe("Ce champ est obligatoire.");
    expect(messageOf(z.string(), null)).toBe("Ce champ est obligatoire.");
    expect(messageOf(z.string().min(1), "")).toBe("Ce champ est obligatoire.");
    expect(messageOf(z.string().trim().min(1), "   ")).toBe("Ce champ est obligatoire.");
  });

  it("gives the length a string falls short of, or goes over", () => {
    expect(messageOf(contact.shape.subject, "   abcd")).toBe("5 caractères au minimum.");
    expect(messageOf(contact.shape.subject, "x".repeat(201))).toBe("200 caractères au plus.");
    expect(messageOf(z.string().length(6), "123")).toBe("6 caractères exactement.");
  });

  it("calls an address without a domain an invalid e-mail", () => {
    expect(messageOf(contact.shape.email, "jean@gmail")).toBe("Adresse e-mail invalide.");
  });

  it("gives the bound a number falls under or over", () => {
    expect(messageOf(z.number().min(1), 0)).toBe("Indique un nombre supérieur ou égal à 1.");
    expect(messageOf(z.number().positive(), 0)).toBe("Indique un nombre supérieur à 0.");
    expect(messageOf(z.number().max(10), 11)).toBe("Indique un nombre inférieur ou égal à 10.");
    expect(messageOf(z.coerce.number(), "abc")).toBe("Indique un nombre.");
    expect(messageOf(z.int(), 1.5)).toBe("Indique un nombre entier.");
  });

  it("asks for one of the options without listing the code's values", () => {
    const message = messageOf(z.enum(["BUG", "SECURITY"]), "OTHER");
    expect(message).toBe("Choisis une des options proposées.");
    expect(message).not.toContain("SECURITY");
  });

  it("asks for at least one item of a list", () => {
    expect(messageOf(z.array(z.string()).min(1), [])).toBe("Choisis au moins un élément.");
  });

  it("hides a pattern's source", () => {
    expect(messageOf(z.string().regex(/^[a-z]+$/u), "ABC")).toBe("Format invalide.");
  });

  it("falls back to Zod's French, as a sentence, for the rest", () => {
    expect(messageOf(z.ipv4(), "999.1.1.1")).toBe("Adresse IPv4 invalide.");
    expect(messageOf(z.strictObject({}), { extra: 1 })).toMatch(/^Clé non reconnue/u);
  });

  it("leaves a message the schema words itself alone", () => {
    const subject = z.string().min(5, "Un objet de 5 caractères au minimum.");
    expect(messageOf(subject, "abc")).toBe("Un objet de 5 caractères au minimum.");
  });

  it("never answers in English", () => {
    const issues = contact.safeParse({ email: "jean@gmail", subject: "abc" }).error?.issues ?? [];
    expect(issues).toHaveLength(2);
    for (const issue of issues) {
      expect(issue.message).not.toMatch(/\b(invalid|expected|required|too (small|big))\b/iu);
    }
  });
});
