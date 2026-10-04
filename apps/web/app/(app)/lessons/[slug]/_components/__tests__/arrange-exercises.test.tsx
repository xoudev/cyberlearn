// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { shownOrder } from "@cyberlearn/lib/exercises/arrange";
import { afterEach, describe, expect, it } from "vitest";
import { MatchPairs } from "../match-pairs";
import { PutInOrder } from "../put-in-order";

/**
 * The items come shuffled, none at its place; placing them in order and
 * checking says so, a wrong check keeps the right ones and gives the rest
 * back; the same for the pairs; an exercise the author got wrong says so.
 */

afterEach(cleanup);

const ORDER = {
  id: "osi",
  title: "Du câble au programme",
  task: "De la plus basse à la plus haute.",
  items: ["Physique", "Liaison", "Réseau", "Transport"],
  explanation: "Le support, puis les trames, puis les adresses, puis les ports.",
  hint: "Le câble d'abord.",
};

const PAIRS = {
  id: "ports",
  task: "Chaque port à son service.",
  pairs: [
    { left: "22", right: "SSH" },
    { left: "53", right: "DNS" },
    { left: "80", right: "HTTP" },
  ],
  explanation: "Des conventions que tout le monde connaît.",
};

const place = (text: string): void => {
  fireEvent.click(screen.getByRole("button", { name: `Placer : ${text}` }));
};
const associate = (text: string): void => {
  fireEvent.click(screen.getByRole("button", { name: `Associer : ${text}` }));
};
const check = (): void => {
  fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
};

describe("PutInOrder", () => {
  it("shows the items shuffled, none at its own place, and waits for all to be placed", () => {
    render(<PutInOrder {...ORDER} />);
    const pool = screen.getByRole("group", { name: "À placer" });
    const shown = Array.from(pool.querySelectorAll("button")).map((b) => b.textContent);
    expect(shown).toEqual(shownOrder(4, "osi").map((i) => ORDER.items[i]));
    expect(shown).not.toEqual(ORDER.items);
    expect(screen.getByRole("button", { name: "Vérifier" })).toHaveProperty("disabled", true);
  });

  it("says yes to the right order, with the explanation", () => {
    render(<PutInOrder {...ORDER} />);
    for (const item of ORDER.items) place(item);
    expect(screen.queryByRole("group", { name: "À placer" })).toBeNull();
    check();
    expect(screen.getByText(/Dans l'ordre\./u).closest("p")?.textContent).toBe(
      `Dans l'ordre. ${ORDER.explanation}`,
    );
    expect(screen.queryByRole("button", { name: "Vérifier" })).toBeNull();
  });

  it("keeps the right positions, gives the others back and shows the hint", () => {
    render(<PutInOrder {...ORDER} />);
    place("Physique");
    place("Réseau");
    place("Liaison");
    place("Transport");
    check();
    expect(screen.getByText(/2 sur 4 à la bonne place/u)).toBeTruthy();
    expect(screen.getByText(`Indice : ${ORDER.hint}`)).toBeTruthy();
    const pool = screen.getByRole("group", { name: "À placer" });
    expect(Array.from(pool.querySelectorAll("button")).map((b) => b.textContent)).toEqual([
      "Réseau",
      "Liaison",
    ]);
    expect(screen.getAllByLabelText("à la bonne place")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Retirer : Physique" })).toBeNull();
    place("Liaison");
    place("Réseau");
    check();
    expect(screen.getByText(/Dans l'ordre\./u)).toBeTruthy();
  });

  it("takes an item back before the check", () => {
    render(<PutInOrder {...ORDER} />);
    place("Transport");
    fireEvent.click(screen.getByRole("button", { name: "Retirer : Transport" }));
    expect(screen.getByRole("button", { name: "Placer : Transport" })).toBeTruthy();
  });

  it("says what is wrong with an exercise rather than breaking the lesson", () => {
    render(<PutInOrder {...ORDER} items={["a", "b"]} />);
    expect(screen.getByRole("note").textContent).toContain("items");
  });
});

describe("MatchPairs", () => {
  it("fills the current row from the right column, and empties it on request", () => {
    render(<MatchPairs {...PAIRS} />);
    expect(screen.getByRole("button", { name: "22, à remplir" })).toBeTruthy();
    associate("DNS");
    expect(screen.getByRole("button", { name: "Retirer : DNS" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "53, à remplir" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retirer : DNS" }));
    expect(screen.getByRole("button", { name: "22, à remplir" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Associer : DNS" })).toBeTruthy();
  });

  it("lets a row be chosen, then checks: the right pairs lock, the wrong come back", () => {
    render(<MatchPairs {...PAIRS} />);
    fireEvent.click(screen.getByRole("button", { name: "80" }));
    associate("HTTP");
    associate("DNS");
    associate("SSH");
    check();
    expect(screen.getByText(/1 sur 3 associations justes/u)).toBeTruthy();
    expect(screen.getByRole("group", { name: "À associer" }).textContent).toBe("DNSSSH");
    associate("SSH");
    associate("DNS");
    check();
    expect(screen.getByText(/Tout est associé\./u).closest("p")?.textContent).toBe(
      `Tout est associé. ${PAIRS.explanation}`,
    );
  });

  it("says what is wrong with an exercise rather than breaking the lesson", () => {
    render(<MatchPairs {...PAIRS} pairs={[...PAIRS.pairs, { left: "8080", right: "HTTP" }]} />);
    expect(screen.getByRole("note").textContent).toContain("à droite");
  });
});
