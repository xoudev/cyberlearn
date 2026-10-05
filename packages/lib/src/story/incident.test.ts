import { type IncidentStory, incidentStorySchema } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import {
  debriefLine,
  endingsOf,
  paragraphsOf,
  play,
  recommendedPath,
  tally,
  tallyLine,
} from "./incident";

/**
 * A short ransomware story played every way: the picks replayed from the
 * first scene, an ending that stops the run, the count of decisions and the
 * debrief that says it, and the run the story recommends, found by trying
 * good choices only and backing out of a dead end.
 */

function story(spec: unknown): IncidentStory {
  const parsed = incidentStorySchema.safeParse(spec);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "bad story");
  return parsed.data;
}

const POSTE = story({
  id: "poste",
  scenes: [
    {
      id: "alerte",
      title: "9 h 04",
      text: "Un collègue t'appelle.",
      choices: [
        {
          text: "Éteindre",
          next: "rancon",
          verdict: "bad",
          consequence: "La mémoire vive est perdue.",
        },
        {
          text: "Isoler",
          next: "rancon",
          verdict: "good",
          consequence: "Le programme ne se propage plus.",
        },
        {
          text: "Attendre",
          next: "rancon",
          verdict: "risky",
          consequence: "Dix minutes de chiffrement en plus.",
        },
      ],
    },
    {
      id: "rancon",
      text: "Le message demande 0,4 bitcoin.",
      choices: [
        { text: "Payer", next: "fin-payee", verdict: "bad", consequence: "Le virement part." },
        {
          text: "Restaurer",
          next: "fin-ok",
          verdict: "good",
          consequence: "Les données reviennent.",
        },
      ],
    },
    {
      id: "fin-payee",
      title: "Trois jours plus tard",
      text: "La clé n'arrive jamais.",
      ending: "failure",
    },
    { id: "fin-ok", text: "Incident clos.", ending: "success" },
  ],
});

describe("play", () => {
  it("starts on the first scene, with nothing decided", () => {
    const run = play(POSTE, []);
    expect(run.steps).toEqual([]);
    expect(run.scene.id).toBe("alerte");
    expect(run.ending).toBeNull();
  });

  it("replays the picks, keeping each decision with its verdict and consequence", () => {
    const run = play(POSTE, [1]);
    expect(run.steps).toHaveLength(1);
    expect(run.steps[0]?.scene.id).toBe("alerte");
    expect(run.steps[0]?.pick).toBe(1);
    expect(run.steps[0]?.choice.text).toBe("Isoler");
    expect(run.steps[0]?.choice.verdict).toBe("good");
    expect(run.steps[0]?.choice.consequence).toBe("Le programme ne se propage plus.");
    expect(run.scene.id).toBe("rancon");
    expect(run.ending).toBeNull();
  });

  it("stops at an ending and ignores what follows, like a pick that is not a choice", () => {
    const done = play(POSTE, [1, 1, 0]);
    expect(done.steps.map((step) => step.choice.text)).toEqual(["Isoler", "Restaurer"]);
    expect(done.scene.id).toBe("fin-ok");
    expect(done.ending).toBe("success");
    const stray = play(POSTE, [7, 1]);
    expect(stray.steps).toEqual([]);
    expect(stray.scene.id).toBe("alerte");
  });
});

describe("tally and debrief", () => {
  it("counts the decisions by verdict", () => {
    expect(tally(play(POSTE, [2, 1]).steps)).toEqual({ good: 1, risky: 1, bad: 0 });
    expect(tally([])).toEqual({ good: 0, risky: 0, bad: 0 });
  });

  it("writes the count in French, singular and plural", () => {
    expect(tallyLine({ good: 4, risky: 1, bad: 0 })).toBe(
      "4 bonnes décisions, 1 risquée, 0 mauvaise.",
    );
    expect(tallyLine({ good: 1, risky: 2, bad: 3 })).toBe(
      "1 bonne décision, 2 risquées, 3 mauvaises.",
    );
  });

  it("opens the debrief with the ending reached", () => {
    expect(debriefLine(play(POSTE, [1, 1]))).toBe(
      "Incident maîtrisé. 2 bonnes décisions, 0 risquée, 0 mauvaise.",
    );
    expect(debriefLine(play(POSTE, [0, 0]))).toBe(
      "L'incident a mal tourné. 0 bonne décision, 0 risquée, 2 mauvaises.",
    );
    expect(debriefLine(play(POSTE, [2]))).toBe(
      "L'histoire n'est pas finie. 0 bonne décision, 1 risquée, 0 mauvaise.",
    );
  });
});

describe("endingsOf and recommendedPath", () => {
  it("lists the endings in the order they are written", () => {
    expect(endingsOf(POSTE).map((scene) => scene.id)).toEqual(["fin-payee", "fin-ok"]);
  });

  it("recommends the good choices down to a success", () => {
    const path = recommendedPath(POSTE);
    expect(path?.map((step) => `${step.scene.id}:${step.choice.text}`)).toEqual([
      "alerte:Isoler",
      "rancon:Restaurer",
    ]);
  });

  it("backs out of a good choice that only leads to a lesser ending", () => {
    const detour = story({
      id: "detour",
      scenes: [
        {
          id: "a",
          text: "x",
          choices: [
            { text: "Prudent", next: "b", verdict: "good", consequence: "c" },
            { text: "Complet", next: "c", verdict: "good", consequence: "c" },
          ],
        },
        {
          id: "b",
          text: "y",
          choices: [
            { text: "Clore", next: "partielle", verdict: "good", consequence: "c" },
            { text: "Forcer", next: "reussie", verdict: "bad", consequence: "c" },
          ],
        },
        {
          id: "c",
          text: "z",
          choices: [
            { text: "Finir", next: "reussie", verdict: "good", consequence: "c" },
            { text: "Lâcher", next: "partielle", verdict: "risky", consequence: "c" },
          ],
        },
        { id: "partielle", text: "p", ending: "partial" },
        { id: "reussie", text: "r", ending: "success" },
      ],
    });
    expect(recommendedPath(detour)?.map((step) => step.choice.text)).toEqual(["Complet", "Finir"]);
  });

  it("has nothing to recommend when good decisions alone reach no success", () => {
    const grim = story({
      id: "grim",
      scenes: [
        {
          id: "a",
          text: "x",
          choices: [
            { text: "Bien", next: "partielle", verdict: "good", consequence: "c" },
            { text: "Mal", next: "reussie", verdict: "bad", consequence: "c" },
          ],
        },
        { id: "partielle", text: "p", ending: "partial" },
        { id: "reussie", text: "r", ending: "success" },
      ],
    });
    expect(recommendedPath(grim)).toBeNull();
  });
});

describe("paragraphsOf", () => {
  it("splits a scene's text on blank lines", () => {
    expect(paragraphsOf("Un.\n\nDeux.\n  \nTrois.")).toEqual(["Un.", "Deux.", "Trois."]);
    expect(paragraphsOf("Seul")).toEqual(["Seul"]);
  });
});
