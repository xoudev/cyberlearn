import { describe, expect, it } from "vitest";
import { lessonOutline } from "../lesson-outline";

const MDX = [
  "# Chiffrement asymétrique",
  "",
  "## Le problème de la clé partagée",
  "Du texte.",
  "```bash",
  "## pas un titre, un commentaire",
  "openssl genrsa 2048",
  "```",
  "## Paire de clés",
  "### Un sous-titre",
  "## Signature ##",
  "## RSA en pratique",
  "## Ce qui dépasse",
].join("\n");

describe("lessonOutline", () => {
  it("reads the section titles of the lesson, in order", () => {
    expect(lessonOutline(MDX)).toEqual([
      "Le problème de la clé partagée",
      "Paire de clés",
      "Signature",
      "RSA en pratique",
    ]);
  });

  it("skips a # line inside a code block", () => {
    expect(lessonOutline(MDX, 10)).not.toContain("pas un titre, un commentaire");
  });

  it("stops at the number asked for", () => {
    expect(lessonOutline(MDX, 2)).toHaveLength(2);
  });

  it("gives nothing for a lesson without sections, so the card falls back", () => {
    expect(lessonOutline("Juste un paragraphe.\r\n")).toEqual([]);
  });
});
