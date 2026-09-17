import { describe, expect, it } from "vitest";
import { FOLD_ACCENTED, FOLD_PLAIN, foldText } from "./fold.js";
import { excerptAround, rankMatches, scoreMatch } from "./rank.js";

const item = (title: string, body = ""): { title: string; body: string } => ({ title, body });

describe("the fold", () => {
  it("agrees, character for character, with the table the SQL uses", () => {
    // This is the test that matters most in this file. Postgres folds accents
    // with translate(FOLD_ACCENTED -> FOLD_PLAIN); the browser folds them with
    // foldText. If the two ever disagree, the database finds rows the ranking
    // then scores at zero and throws away, and the search silently loses
    // results for exactly the words French needs.
    expect(Array.from(FOLD_ACCENTED)).toHaveLength(Array.from(FOLD_PLAIN).length);
    for (const [index, accented] of Array.from(FOLD_ACCENTED).entries()) {
      expect(foldText(accented)).toBe(FOLD_PLAIN[index]);
    }
  });

  it("folds case and accents together", () => {
    expect(foldText("Sécurité Réseau")).toBe("securite reseau");
    expect(foldText("ÉLÈVE")).toBe("eleve");
    expect(foldText("çà et là")).toBe("ca et la");
  });
});

describe("scoreMatch", () => {
  it("ranks an exact title over a prefix, a word, a substring, then the body", () => {
    const exact = scoreMatch(item("Injection"), "injection");
    const prefix = scoreMatch(item("Injection SQL"), "injection");
    const word = scoreMatch(item("Les bases de l'injection"), "injection");
    const inside = scoreMatch(item("Désinjection avancée"), "injection");
    const body = scoreMatch(item("Bases de données", "une injection SQL"), "injection");

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(body);
    expect(body).toBeGreaterThan(0);
  });

  it("scores nothing when neither the title nor the body matches", () => {
    expect(scoreMatch(item("Cryptographie", "clé publique"), "docker")).toBe(0);
  });

  it("ignores accents in both directions", () => {
    expect(scoreMatch(item("Sécurité réseau"), "securite")).toBeGreaterThan(0);
    expect(scoreMatch(item("Securite reseau"), "sécurité")).toBeGreaterThan(0);
  });

  it("treats an empty query as no match", () => {
    expect(scoreMatch(item("Injection SQL"), "   ")).toBe(0);
  });
});

describe("rankMatches", () => {
  it("returns best first, drops non-matches and honours the cap", () => {
    const ranked = rankMatches(
      [
        item("Bases de données", "l'injection SQL en pratique"),
        item("Injection SQL"),
        item("Docker"),
        item("Injection"),
      ],
      "injection",
      3,
    );

    expect(ranked.map((r) => r.title)).toEqual(["Injection", "Injection SQL", "Bases de données"]);
  });

  it("breaks ties on the shorter title, then alphabetically, so the order never wobbles", () => {
    const ranked = rankMatches(
      [item("Injection XML"), item("Injection SQL"), item("Injection LDAP hors ligne")],
      "injection",
      10,
    );
    expect(ranked.map((r) => r.title)).toEqual([
      "Injection SQL",
      "Injection XML",
      "Injection LDAP hors ligne",
    ]);
  });
});

describe("excerptAround", () => {
  it("returns the window around the match, not the first line", () => {
    const content = `${"début ".repeat(40)}le mot cherché ici${" fin".repeat(40)}`;
    const out = excerptAround(content, "cherché", 20);

    expect(out).toContain("cherché");
    expect(out.startsWith("…")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThan(content.length);
  });

  it("cuts the window at the right place when accents come before the match", () => {
    // Text pasted from a Mac arrives decomposed: "e" followed by a combining
    // acute, two characters that fold into one. An offset into the folded text
    // is therefore not an offset into the original, and without the index map
    // this window opens ten characters early and chops the word in half.
    const decomposedPrefix = "e\u0301".repeat(10);
    const content = `${decomposedPrefix} notes sur la cryptographie asymetrique`;

    expect(content).toHaveLength(decomposedPrefix.length + 39);
    expect(excerptAround(content, "cryptographie", 6)).toContain("cryptographie");
  });

  it("finds the match without accents on either side", () => {
    expect(excerptAround("La sécurité des mots de passe", "securite", 8)).toContain("sécurité");
  });

  it("strips markdown so the excerpt reads as text", () => {
    const out = excerptAround(
      "# Titre\n\n- **gras** et `code` et [lien](https://x.fr)",
      "gras",
      40,
    );
    expect(out).toContain("gras");
    expect(out).not.toContain("**");
    expect(out).not.toContain("`");
    expect(out).not.toContain("https://x.fr");
  });

  it("falls back to the start when the term is not in the body at all", () => {
    // Legitimate: a note matches because its lesson's title matched.
    expect(excerptAround("Mes remarques personnelles", "injection")).toBe(
      "Mes remarques personnelles",
    );
  });

  it("returns nothing for an empty note", () => {
    expect(excerptAround("   ", "injection")).toBe("");
  });
});
