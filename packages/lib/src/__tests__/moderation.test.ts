/**
 * The filter, and mostly the things it must not do.
 *
 * A moderation list is easy to write and easy to make useless. It fails in two
 * directions and both are here: it lets through anyone who spaces out a word or
 * swaps a zero for an o, and it blocks a lesson about Scunthorpe. The second is
 * the one that gets a filter switched off, so the false-positive cases outnumber
 * the rest.
 */

import { describe, expect, it } from "vitest";
import { moderate } from "../moderation/moderate.js";
import { joinSpacedLetters, normalise } from "../moderation/normalise.js";

describe("normalise", () => {
  it("folds case, accents and look-alike characters", () => {
    expect(normalise("ÉNORME")).toBe("enorme");
    expect(normalise("c0nn@rd")).toBe("connard");
  });

  it("removes the invisible characters used to break a word up", () => {
    expect(normalise("con\u200Bnard")).toBe("connard");
  });

  it("collapses a letter repeated three or more times, and leaves doubles", () => {
    expect(normalise("saaaalut")).toBe("saalut");
    // "bonne" and "sell" are ordinary words; collapsing doubles would turn
    // unrelated words into each other.
    expect(normalise("bonne")).toBe("bonne");
  });

  it("joins letters only when they are spaced out like an evasion", () => {
    expect(joinSpacedLetters("c o n n a r d")).toBe("connard");
    expect(joinSpacedLetters("c-o-n-n-a-r-d")).toBe("connard");
    // Ordinary prose keeps its spaces: a run of real words is not an evasion.
    expect(joinSpacedLetters("le cours de reseau")).toBe("le cours de reseau");
  });
});

describe("what must pass untouched", () => {
  const innocuous = [
    "Le modèle OSI a sept couches, la couche réseau est la troisième.",
    // The Scunthorpe problem, in both languages: a substring is not a word.
    "Scunthorpe est une ville du Lincolnshire.",
    "Ce professeur est très réputé dans le domaine.",
    "L'analyse a été effectuée sur un échantillon.",
    "Il faut assassiner les bugs avant la mise en production.",
    "Le classement est basé sur l'XP total.",
    "J'ai un souci avec la commande chmod 777 sur ce dossier.",
  ];

  for (const text of innocuous) {
    it(`allows: ${text.slice(0, 44)}…`, () => {
      const result = moderate(text);
      expect(result.verdict).toBe("ALLOW");
      expect(result.findings).toEqual([]);
    });
  }

  it("does not treat a long technical paragraph as shouting", () => {
    expect(moderate("TCP, UDP et ICMP sont des protocoles de la couche transport.").verdict).toBe(
      "ALLOW",
    );
  });
});

describe("what must not pass", () => {
  it("blocks an unambiguous slur on its own", () => {
    const result = moderate("ferme-la sale negre");
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.rule === "slur")).toBe(true);
  });

  it("blocks a threat aimed at a person", () => {
    const result = moderate("je vais te tuer sale bouffon");
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.rule === "threat")).toBe(true);
  });

  it("catches a slur written to get round a filter", () => {
    // Each of these is a one-line rule in normalise. Without them the whole
    // feature stops only the people who were not hiding anything.
    for (const evasion of ["n3gr3", "n e g r e", "nègre", "n-e-g-r-e", "neeegre"]) {
      expect(moderate(`espece de ${evasion}`).verdict, evasion).toBe("BLOCK");
    }
  });

  it("sends a single insult to a human rather than refusing it", () => {
    // A classroom argument is not the same thing as an attack, and refusing it
    // outright is how a filter gets turned off.
    const result = moderate("t'es vraiment un connard");
    expect(result.verdict).toBe("REVIEW");
  });

  it("blocks two insults, because that is a pattern rather than a slip", () => {
    expect(moderate("connard de salope").verdict).toBe("BLOCK");
  });
});

describe("things that are not offences", () => {
  it("flags contact details for a human to look at", () => {
    const result = moderate("écris-moi sur jean@example.com");
    expect(result.verdict).toBe("REVIEW");
    expect(result.findings.some((f) => f.rule === "contact-details")).toBe(true);
  });

  it("flags a French phone number in any of its usual spellings", () => {
    for (const number of ["06 12 34 56 78", "+33 6 12 34 56 78", "06.12.34.56.78"]) {
      const result = moderate(`appelle-moi au ${number}`);
      expect(
        result.findings.some((f) => f.rule === "contact-details"),
        number,
      ).toBe(true);
    }
  });

  it("flags self-harm so somebody sees it quickly", () => {
    // Nothing here is an offence. It is surfaced because on a platform full of
    // teenagers, being slow is the failure that matters.
    const result = moderate("je veux mourir, j'en peux plus");
    expect(result.verdict).toBe("REVIEW");
    expect(result.findings.some((f) => f.rule === "self-harm")).toBe(true);
  });

  it("treats links as ordinary where the surface says they are", () => {
    const text = "regarde https://example.com et https://example.org";
    expect(moderate(text).verdict).toBe("REVIEW");
    expect(moderate(text, { allowLinks: true }).verdict).toBe("ALLOW");
  });

  it("blocks a wall of links even where one would be fine", () => {
    const result = moderate("https://a.com https://b.com https://c.com https://d.com", {
      allowLinks: false,
    });
    expect(result.findings.some((f) => f.rule === "link-spam")).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("notices shouting only once there is enough of it to be shouting", () => {
    expect(moderate("OK").findings).toEqual([]);
    expect(moderate("MERCI").findings).toEqual([]);
    expect(
      moderate("POURQUOI EST-CE QUE PERSONNE NE ME REPOND JAMAIS ICI").findings.some(
        (f) => f.rule === "shouting",
      ),
    ).toBe(true);
  });
});

describe("the record it leaves", () => {
  it("reports every rule that fired, with what tripped it", () => {
    const result = moderate("connard, écris-moi sur jean@example.com");
    expect(result.findings.map((f) => f.rule).sort()).toEqual(["contact-details", "insult"]);
    expect(result.findings.find((f) => f.rule === "contact-details")?.match).toContain(
      "jean@example.com",
    );
  });

  it("counts a term once however many times it appears", () => {
    // Otherwise repeating a mild word would score as high as a slur, and the
    // severities would stop meaning anything.
    const once = moderate("connard");
    const thrice = moderate("connard connard connard");
    expect(thrice.score).toBe(once.score);
  });

  it("scores an empty string at zero", () => {
    expect(moderate("")).toEqual({ verdict: "ALLOW", score: 0, findings: [] });
  });
});

describe("the French register, which is phrasal", () => {
  it("catches the phrase reported from the forum", () => {
    // Scored zero. Not one of its words was on a list written in single words,
    // which is most of the way to useless in French.
    const result = moderate("Tu est nul vas te faire foutre");
    expect(result.verdict).not.toBe("ALLOW");
    expect(result.findings.map((f) => f.match)).toContain("te faire foutre");
  });

  it("does not depend on which of va, vas or allez was typed", () => {
    // The phrase is stored from the middle for exactly this reason.
    for (const opening of ["va", "vas", "allez", "il peut aller"]) {
      expect(moderate(`${opening} te faire foutre`).verdict).not.toBe("ALLOW");
    }
  });

  it("reads an inflected form of a term it holds in the infinitive", () => {
    // "encule" was on the list and "enculer" scored zero, because the pattern
    // refused a letter after the needle.
    for (const form of ["encule", "enculer", "enculee", "enculez"]) {
      expect(moderate(`espece d'${form}`).verdict).not.toBe("ALLOW");
    }
    expect(moderate("bande d'abrutis").verdict).not.toBe("ALLOW");
  });

  it("keeps the inflection off words that are a prefix of ordinary ones", () => {
    // The tail that rescues "enculer" is the tail that would turn "con" into
    // "cone", so it is opt-in per entry and these must stay clean.
    expect(moderate("le cone de signalisation").findings).toEqual([]);
    expect(moderate("une bite de pare-battage").findings.some((f) => f.match === "bites")).toBe(
      false,
    );
  });
});

describe("one utterance, counted once", () => {
  it("does not add a phrase to the shorter phrase inside it", () => {
    // "ferme ta gueule" matched itself and "ta gueule" and came to 100 - a
    // BLOCK produced by the list overlapping itself rather than by what was
    // written. The longer phrase is the one that describes what was said.
    const result = moderate("ferme ta gueule");
    expect(result.findings.map((f) => f.match)).toEqual(["ferme ta gueule"]);
    expect(result.score).toBe(50);
  });

  it("still counts two genuinely different terms", () => {
    // The overlap rule must not swallow a real pattern: neither needle is
    // inside the other, so both stand and two insults block.
    const result = moderate("connard de salope");
    expect(result.findings).toHaveLength(2);
    expect(result.verdict).toBe("BLOCK");
  });

  it("counts a word the list spells twice as the one word it is", () => {
    // "enculé" and "encule" are both on the list, and they fold to the same
    // string. Keying the already-seen set on the term as written counted one
    // word twice and turned a single insult into a BLOCK - and the overlap
    // rule cannot catch it, because equal-length needles never cover each
    // other. The key is the normalised needle for exactly this reason.
    const result = moderate("espece d'enculé");
    expect(result.findings).toHaveLength(1);
    expect(result.score).toBe(50);
    expect(result.verdict).toBe("REVIEW");
  });
});

describe("coarse but not aimed", () => {
  it("lets one swear word through while still counting it", () => {
    // A teenager typing this at a failing exercise is not the case any of this
    // exists for, and a filter that stops them is one people write around.
    const result = moderate("merde ça marche pas");
    expect(result.verdict).toBe("ALLOW");
    expect(result.findings.map((f) => f.rule)).toEqual(["vulgarity"]);
  });

  it("looks at two of them together", () => {
    expect(moderate("merde ce bordel").verdict).toBe("REVIEW");
  });
});
