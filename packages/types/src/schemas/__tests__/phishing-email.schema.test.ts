import { describe, expect, it } from "vitest";
import { parsePhishingEmail, phishingPartLabel } from "../phishing-email.schema.js";

const BASE = {
  id: "ph-1",
  fromName: "Service client",
  fromAddress: "support@banque-securite.co",
  subject: "Votre compte sera bloqué",
  body: ["Bonjour,", "Confirmez votre identité sous 24 h.", "Merci."],
  linkText: "Confirmer",
  linkUrl: "http://banque-verif.xyz/login",
  clues: [
    { part: "sender", why: "Un domaine qui n'est pas celui de la banque." },
    { part: "body-2", why: "L'urgence." },
    { part: "link", why: "Un lien vers un autre domaine." },
  ],
};

describe("parsePhishingEmail", () => {
  it("accepts a well-formed message", () => {
    expect(parsePhishingEmail(BASE).ok).toBe(true);
  });

  it("refuses a link with no address, or an address with no link", () => {
    expect(parsePhishingEmail({ ...BASE, linkUrl: undefined })).toEqual({
      ok: false,
      problem: "linkText et linkUrl vont ensemble : le texte affiché et l'adresse réelle.",
    });
    expect(parsePhishingEmail({ ...BASE, linkText: undefined }).ok).toBe(false);
  });

  it("refuses a clue on a part the message does not have", () => {
    const noLink = { ...BASE, linkText: undefined, linkUrl: undefined };
    expect(parsePhishingEmail(noLink)).toEqual({
      ok: false,
      problem: "un indice vise link, mais le message n'a pas de lien.",
    });
    const attachment = parsePhishingEmail({
      ...BASE,
      clues: [{ part: "attachment", why: "Une double extension." }],
    });
    expect(attachment.ok).toBe(false);
    const paragraph = parsePhishingEmail({ ...BASE, clues: [{ part: "body-4", why: "x" }] });
    expect(paragraph).toEqual({
      ok: false,
      problem: "body-4 vise un paragraphe qui n'existe pas : le message en a 3.",
    });
  });

  it("refuses two clues on the same part, and a part it does not know", () => {
    const twice = parsePhishingEmail({
      ...BASE,
      clues: [
        { part: "sender", why: "a" },
        { part: "sender", why: "b" },
      ],
    });
    expect(twice).toEqual({ ok: false, problem: "sender a deux indices." });
    const unknown = parsePhishingEmail({ ...BASE, clues: [{ part: "footer", why: "x" }] });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok)
      expect(unknown.problem).toContain("sender, subject, link, attachment ou body-N");
  });

  it("refuses a message without clues", () => {
    expect(parsePhishingEmail({ ...BASE, clues: [] }).ok).toBe(false);
  });
});

describe("phishingPartLabel", () => {
  it.each([
    ["sender", "L'expéditeur"],
    ["subject", "L'objet"],
    ["link", "Le lien"],
    ["attachment", "La pièce jointe"],
    ["body-2", "Le paragraphe 2"],
  ])("names %s %s", (part, label) => {
    expect(phishingPartLabel(part)).toBe(label);
  });
});
