// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { storedHash } from "@cyberlearn/lib/crypto/cracking";
import { PasswordLab } from "../password-lab";

/**
 * The table of stolen accounts, the attack the learner runs on it (dictionary
 * and method), what falls and what resists, the salt at work, the calculator
 * of length and slowness, and the closing question that ends the exercise.
 */

afterEach(cleanup);

const PROPS = {
  id: "lab",
  title: "La base volée",
  accounts: [
    { user: "alice", hash: storedHash("123456") },
    { user: "bob", hash: storedHash("123456") },
    { user: "chloe", hash: storedHash("soleil") },
    { user: "emma", hash: storedHash("azerty123"), note: "Une ligne du clavier suivie de 123." },
    {
      user: "farid",
      hash: storedHash("k9#Qz2vL"),
      note: "Huit caractères au hasard, mais courts.",
    },
    { user: "hugo", salt: "Xk3p9a", hash: storedHash("azerty", "Xk3p9a") },
    { user: "ines", salt: "7QmZ2d", hash: storedHash("azerty", "7QmZ2d") },
  ],
  weak: 6,
  question: "Que protège le mieux un mot de passe volé ?",
  options: [
    "Un hachage rapide comme SHA-256",
    "Un mot de passe long, un sel et une fonction lente",
    "Un sel, sans plus",
  ],
  correct: 1,
  explanation: "Les trois se complètent.",
};

const row = (user: string): HTMLElement =>
  // A function matcher, not a RegExp built from a variable: the row's name
  // starts with the account's, without a dynamic pattern (ReDoS-safe).
  screen.getByRole("row", { name: (accessibleName) => accessibleName.startsWith(user) });
const press = (name: string | RegExp): void => {
  fireEvent.click(screen.getByRole("button", { name }));
};
const launch = (): void => {
  press("Lancer l'attaque");
};

describe("PasswordLab", () => {
  it("shows the stolen table before anything is tried: salts, shortened hashes, nothing cracked", () => {
    render(<PasswordLab {...PROPS} />);
    expect(screen.getByText("0 / 6 cassés")).toBeTruthy();
    expect(within(row("hugo")).getByText("Xk3p9a")).toBeTruthy();
    expect(within(row("alice")).getByText("aucun")).toBeTruthy();
    expect(within(row("alice")).getByText("pas encore attaqué")).toBeTruthy();
    // Two accounts with one hash are visible at a glance, and said.
    expect(screen.getByText(/alice et bob ont la même empreinte/u)).toBeTruthy();
    expect(screen.queryByText(/123456/u)).toBeNull();
  });

  it("breaks the common passwords with the ten most common, and none of the salted accounts with a table", () => {
    render(<PasswordLab {...PROPS} />);
    launch();
    expect(within(row("alice")).getByText(/123456/u)).toBeTruthy();
    expect(within(row("bob")).getByText(/1 essai/u)).toBeTruthy();
    expect(within(row("chloe")).getByText("pas trouvé")).toBeTruthy();
    expect(within(row("hugo")).getByText("pas trouvé")).toBeTruthy();
    expect(
      screen.getByText(/table pré-calculée : 2 comptes cassés sur 7, 10 calculs de hash/u),
    ).toBeTruthy();
    expect(screen.getByText("2 / 6 cassés")).toBeTruthy();
    expect(screen.getByText(/Il en reste 4 à trouver/u)).toBeTruthy();
  });

  it("breaks a salted account only account by account, and says the salt is why", () => {
    render(<PasswordLab {...PROPS} />);
    press("Compte par compte");
    launch();
    expect(within(row("hugo")).getByText(/azerty/u)).toBeTruthy();
    expect(within(row("ines")).getByText(/4 essais/u)).toBeTruthy();
    expect(
      screen.getByText(/hugo et ines ont le même mot de passe \(azerty\)/u).textContent,
    ).toContain("c'est l'effet du sel");
    expect(screen.getByText("4 / 6 cassés")).toBeTruthy();
  });

  it("keeps what has fallen across attacks, and shows what resists once the widest one has run", () => {
    render(<PasswordLab {...PROPS} />);
    launch();
    press("200 courants et leurs variantes");
    press("Compte par compte");
    launch();
    expect(within(row("emma")).getByText(/azerty123/u)).toBeTruthy();
    expect(within(row("emma")).getByText(/Une ligne du clavier/u)).toBeTruthy();
    expect(within(row("farid")).getByText("résiste au dictionnaire")).toBeTruthy();
    expect(within(row("farid")).getByText(/Huit caractères au hasard/u)).toBeTruthy();
    expect(screen.getByText("6 / 6 cassés")).toBeTruthy();
  });

  it("does not reveal what an account says of itself before the attack has told", () => {
    render(<PasswordLab {...PROPS} />);
    expect(screen.queryByText(/Huit caractères au hasard/u)).toBeNull();
    launch();
    expect(screen.queryByText(/Huit caractères au hasard/u)).toBeNull();
  });

  it("reads length and slowness off a calculator that follows the choices", () => {
    render(<PasswordLab {...PROPS} />);
    // Eight characters of the whole keyboard, hashed by SHA-256 alone: a week.
    expect(screen.getByText("7 jours")).toBeTruthy();
    expect(screen.getByText("Tient des jours ou des années, pas davantage")).toBeTruthy();
    press("bcrypt, coût 12");
    expect(screen.getByText(/190.000 ans/u)).toBeTruthy();
    expect(screen.getByText("Hors de portée")).toBeTruthy();
    press("SHA-256 seul");
    press("minuscules");
    expect(screen.getByText("21 secondes")).toBeTruthy();
    expect(screen.getByText("Tombe dans la journée")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Un caractère de plus" }));
    expect(screen.getByText("9 caractères")).toBeTruthy();
    expect(screen.getByText("9 minutes")).toBeTruthy();
  });

  it("draws a passphrase in words, and stops the length at what the calculator can show", () => {
    render(<PasswordLab {...PROPS} />);
    press("mots d'une liste de 7 776");
    expect(screen.getByText("8 mots")).toBeTruthy();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Un mot de plus" }));
    }
    expect(screen.getByText("10 mots")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Un mot de plus" })).toHaveProperty("disabled", true);
  });

  it("sets what the attack just made costs, and a real dictionary, by the storage chosen", () => {
    render(<PasswordLab {...PROPS} />);
    press("bcrypt, coût 12");
    expect(screen.getByText(/4 heures/u)).toBeTruthy();
    expect(screen.getByText(/162 jours/u)).toBeTruthy();
    launch();
    expect(screen.getByText(/L'attaque que tu viens de lancer \(10 calculs\)/u)).toBeTruthy();
  });

  it("ends the exercise when the weak accounts are found and the question is answered right", () => {
    render(<PasswordLab {...PROPS} />);
    press("200 courants et leurs variantes");
    press("Compte par compte");
    launch();
    expect(screen.getByText("6 / 6 cassés")).toBeTruthy();
    expect(screen.queryByText(/Atelier réussi/u)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Un sel, sans plus" }));
    expect(screen.getByText(/Non, ce n'est pas encore ça/u)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Un sel, sans plus" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.queryByText(/Atelier réussi/u)).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Un mot de passe long, un sel et une fonction lente" }),
    );
    expect(screen.getByText(/Oui\. Les trois se complètent/u)).toBeTruthy();
    expect(screen.getByText(/Atelier réussi/u)).toBeTruthy();
    expect(screen.getByText("Réussi")).toBeTruthy();
  });

  it("does not end on the question alone", () => {
    render(<PasswordLab {...PROPS} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Un mot de passe long, un sel et une fonction lente" }),
    );
    expect(screen.getByText(/Oui\./u)).toBeTruthy();
    expect(screen.queryByText(/Atelier réussi/u)).toBeNull();
  });

  it("ends on the accounts alone when the lesson asks no question", () => {
    render(<PasswordLab id={PROPS.id} accounts={PROPS.accounts} weak={PROPS.weak} />);
    expect(screen.queryByText("3 · À toi de conclure")).toBeNull();
    press("200 courants et leurs variantes");
    press("Compte par compte");
    launch();
    expect(screen.getByText(/Atelier réussi/u)).toBeTruthy();
  });

  it("says what is wrong with a lab rather than breaking the lesson", () => {
    render(<PasswordLab {...PROPS} weak={9} />);
    expect(screen.getByRole("note").textContent).toContain("weak vaut 9");
  });
});
