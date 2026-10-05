// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IncidentStory } from "../incident-story";

/**
 * A short ransomware story, played to both endings: the first scene and its
 * choices, a decision kept on screen with its verdict and consequence, the
 * debrief at the end with the endings found so far, the recommended run on
 * demand, and a replay that starts over.
 */

afterEach(cleanup);

const PROPS = {
  id: "poste",
  title: "Le poste qui chiffre",
  role: "Tu es la personne d'astreinte.",
  scenes: [
    {
      id: "alerte",
      title: "9 h 04",
      text: "Un collègue t'appelle.\n\nIl a la main sur le bouton.",
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
};

const choices = (): string[] =>
  within(screen.getByRole("group", { name: "Que fais-tu ?" }))
    .getAllByRole("button")
    .map((button) => button.textContent);

const decide = (text: string): void => {
  fireEvent.click(
    within(screen.getByRole("group", { name: "Que fais-tu ?" })).getByRole("button", {
      name: text,
    }),
  );
};

describe("IncidentStory", () => {
  it("opens on the first scene, with the role, the paragraphs and the choices", () => {
    render(<IncidentStory {...PROPS} />);
    expect(
      screen.getByRole("region", { name: "Incident à choix : Le poste qui chiffre" }),
    ).toBeTruthy();
    expect(screen.getByText("Tu es la personne d'astreinte.")).toBeTruthy();
    expect(screen.getByText("Un collègue t'appelle.")).toBeTruthy();
    expect(screen.getByText("Il a la main sur le bouton.")).toBeTruthy();
    expect(choices()).toEqual(["Éteindre", "Isoler"]);
    expect(screen.getByText("Décision 1")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Tes décisions" })).toBeNull();
  });

  it("keeps a decision on screen with its verdict and consequence, then shows the next scene", () => {
    render(<IncidentStory {...PROPS} />);
    decide("Isoler");
    const taken = screen.getByRole("list", { name: "Tes décisions" });
    expect(taken.textContent).toContain("9 h 04");
    expect(taken.textContent).toContain("Isoler");
    expect(taken.textContent).toContain("Bonne décision");
    expect(taken.textContent).toContain("Le programme ne se propage plus.");
    expect(screen.getByText("Le message demande 0,4 bitcoin.")).toBeTruthy();
    expect(choices()).toEqual(["Payer", "Restaurer"]);
    expect(screen.getByText("Décision 2")).toBeTruthy();
  });

  it("ends with the debrief, shows the recommended run on demand, and counts the endings found across replays", () => {
    render(<IncidentStory {...PROPS} />);
    decide("Isoler");
    decide("Restaurer");
    expect(screen.getByText("Incident maîtrisé")).toBeTruthy();
    expect(screen.getByText("Incident clos.")).toBeTruthy();
    expect(screen.getByText("Fin")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Que fais-tu ?" })).toBeNull();
    expect(
      screen.getByText("Incident maîtrisé. 2 bonnes décisions, 0 risquée, 0 mauvaise."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Fins découvertes : 1 sur 2. Rejoue pour voir où mènent les autres décisions.",
      ),
    ).toBeTruthy();

    expect(screen.queryByRole("list", { name: "La suite conseillée" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Voir la suite conseillée" }));
    const advised = within(screen.getByRole("list", { name: "La suite conseillée" }))
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(advised).toEqual(["9 h 04 : Isoler", "Restaurer"]);

    fireEvent.click(screen.getByRole("button", { name: "Rejouer" }));
    expect(screen.getByText("Décision 1")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Tes décisions" })).toBeNull();
    decide("Éteindre");
    decide("Payer");
    expect(screen.getByText("Incident aggravé")).toBeTruthy();
    expect(screen.getByText("Trois jours plus tard")).toBeTruthy();
    expect(
      screen.getByText("L'incident a mal tourné. 0 bonne décision, 0 risquée, 2 mauvaises."),
    ).toBeTruthy();
    expect(screen.getByText("Fins découvertes : 2 sur 2.")).toBeTruthy();
  });

  it("says what is wrong with props the site would refuse", () => {
    render(
      <IncidentStory
        {...PROPS}
        scenes={[
          { id: "a", text: "x", ending: "success" },
          { id: "b", text: "y", ending: "failure" },
        ]}
      />,
    );
    expect(screen.getByRole("note").textContent).toBe(
      "Incident à choix indisponible : la scène « b » n'est atteinte par aucun choix.",
    );
  });
});
