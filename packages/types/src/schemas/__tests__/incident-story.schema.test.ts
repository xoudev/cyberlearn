import { describe, expect, it } from "vitest";
import { incidentStorySchema, parseIncidentStory } from "../incident-story.schema";

/**
 * A story is scenes that lead to one another and end: the schema takes one
 * written that way, and names, in the author's words, a scene without a way
 * out, a choice to nowhere, a loop, or a scene nothing leads to.
 */

type Verdict = "good" | "risky" | "bad";

function choice(
  text: string,
  next: string,
  verdict: Verdict,
): { text: string; next: string; verdict: Verdict; consequence: string } {
  return { text, next, verdict, consequence: `${text} : voilà ce qui suit.` };
}

const ALERTE = {
  id: "alerte",
  title: "9 h 04",
  text: "Un collègue t'appelle.",
  choices: [choice("Éteindre", "rancon", "bad"), choice("Isoler", "rancon", "good")],
};
const RANCON = {
  id: "rancon",
  text: "Le message demande 0,4 bitcoin.",
  choices: [choice("Payer", "fin-payee", "bad"), choice("Restaurer", "fin-ok", "good")],
};
const FIN_PAYEE = { id: "fin-payee", text: "La clé n'arrive jamais.", ending: "failure" };
const FIN_OK = { id: "fin-ok", text: "Incident clos.", ending: "success" };

const STORY = {
  id: "poste",
  title: "Le poste qui chiffre",
  role: "Tu es la personne d'astreinte.",
  scenes: [ALERTE, RANCON, FIN_PAYEE, FIN_OK],
};

function withScenes(scenes: unknown): unknown {
  return { ...STORY, scenes };
}

function problemOf(raw: unknown): string {
  const parsed = parseIncidentStory(raw);
  return parsed.ok ? "" : parsed.problem;
}

describe("incidentStorySchema", () => {
  it("accepts a story whose scenes lead to one another and end", () => {
    const parsed = incidentStorySchema.safeParse(STORY);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.scenes).toHaveLength(4);
    expect(parsed.data.scenes[0]?.choices?.[1]?.verdict).toBe("good");
    expect(parsed.data.scenes[3]?.ending).toBe("success");
  });

  it("wants choices or an ending on a scene, never both, never neither", () => {
    expect(problemOf(withScenes([{ id: "a", text: "x" }, FIN_OK]))).toBe(
      "la scène « a » demande des choix (choices) ou une fin (ending) : pas les deux, pas aucun.",
    );
    const both = { ...ALERTE, ending: "success" };
    expect(problemOf(withScenes([both, RANCON, FIN_PAYEE, FIN_OK]))).toContain("pas les deux");
  });

  it("refuses a choice that leads nowhere, or back to its own scene", () => {
    const nowhere = {
      ...ALERTE,
      choices: [choice("Éteindre", "nulle-part", "bad"), choice("Isoler", "rancon", "good")],
    };
    expect(problemOf(withScenes([nowhere, RANCON, FIN_PAYEE, FIN_OK]))).toBe(
      "le choix « Éteindre » de la scène « alerte » mène à « nulle-part », qui n'existe pas.",
    );
    const self = {
      ...ALERTE,
      choices: [choice("Attendre", "alerte", "risky"), choice("Isoler", "rancon", "good")],
    };
    expect(problemOf(withScenes([self, RANCON, FIN_PAYEE, FIN_OK]))).toBe(
      "le choix « Attendre » de la scène « alerte » mène à sa propre scène.",
    );
  });

  it("wants an ending, every scene reached, and no loop", () => {
    const noEnd = withScenes([
      { id: "a", text: "x", choices: [choice("Un", "b", "good"), choice("Deux", "b", "bad")] },
      { id: "b", text: "y", choices: [choice("Un", "a", "good"), choice("Deux", "a", "bad")] },
    ]);
    expect(problemOf(noEnd)).toBe(
      "il faut au moins une scène de fin (ending), sinon l'histoire ne finit pas.",
    );
    const lonely = withScenes([...STORY.scenes, { id: "orpheline", text: "z", ending: "partial" }]);
    expect(problemOf(lonely)).toBe("la scène « orpheline » n'est atteinte par aucun choix.");
    const loop = withScenes([
      { id: "a", text: "x", choices: [choice("Vers b", "b", "good"), choice("Fin", "fin", "bad")] },
      { id: "b", text: "y", choices: [choice("Vers a", "a", "good"), choice("Fin", "fin", "bad")] },
      { id: "fin", text: "z", ending: "success" },
    ]);
    expect(problemOf(loop)).toBe(
      "les scènes « a », « b », « a » forment une boucle : une histoire doit finir.",
    );
  });

  it("refuses two scenes with the same id, and a scene with a single choice", () => {
    expect(problemOf(withScenes([...STORY.scenes, { ...FIN_OK }]))).toBe(
      "deux scènes portent l'id « fin-ok ».",
    );
    const single = { ...ALERTE, choices: [choice("Isoler", "rancon", "good")] };
    expect(problemOf(withScenes([single, RANCON, FIN_PAYEE, FIN_OK]))).toMatch(
      /^scenes\.0\.choices : /u,
    );
  });

  it("names the field in the author's terms", () => {
    expect(problemOf({ ...STORY, id: "" })).toMatch(/^id : /u);
    const wrongVerdict = {
      ...ALERTE,
      choices: [
        choice("Éteindre", "rancon", "bad"),
        { ...choice("Isoler", "rancon", "good"), verdict: "great" },
      ],
    };
    expect(problemOf(withScenes([wrongVerdict, RANCON, FIN_PAYEE, FIN_OK]))).toMatch(
      /^scenes\.0\.choices\.1\.verdict : /u,
    );
    expect(problemOf({ ...STORY, extra: 1 })).toContain("extra");
    expect(problemOf(null)).not.toBe("");
  });
});
