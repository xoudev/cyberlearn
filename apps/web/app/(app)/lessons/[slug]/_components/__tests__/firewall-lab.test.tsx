// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FirewallLab } from "../firewall-lab";

/**
 * The Linux lesson's firewall: open as found, the test packets show what
 * passes; the right rules make every packet do what it should; a rule that
 * cannot be read is named with its line; the learner's own packets get a
 * verdict too; a lab the author got wrong says so.
 */

afterEach(cleanup);

const PROPS = {
  id: "srv-web",
  title: "Le pare-feu de srv-web",
  task: "Ferme l'entrée par défaut.",
  rules: "policy accept\naccept tcp port 22\naccept tcp port 80,443",
  probes: [
    {
      label: "Un visiteur ouvre le site",
      proto: "tcp",
      from: "203.0.113.5",
      port: 443,
      expect: "accept",
    },
    {
      label: "Un inconnu tente SSH",
      proto: "tcp",
      from: "198.51.100.7",
      port: 22,
      expect: "block",
    },
    {
      label: "La réponse du dépôt revient",
      proto: "tcp",
      from: "151.101.0.1",
      port: 41000,
      state: "established",
      expect: "accept",
    },
  ],
  hints: ["policy drop en premier."],
};

const setRules = (text: string): void => {
  fireEvent.change(screen.getByLabelText("Règles du pare-feu"), { target: { value: text } });
};

const row = (label: string): HTMLElement => {
  const item = screen.getByText(label).closest("li");
  if (item === null) throw new Error(`no row for ${label}`);
  return item;
};

describe("FirewallLab", () => {
  it("runs the packets through the rules as found, and says what each got and why", () => {
    render(<FirewallLab {...PROPS} />);
    expect(screen.getByText("2 / 3 paquets font ce qu'il faut")).toBeTruthy();
    expect(row("Un visiteur ouvre le site").textContent).toContain("accepté");
    expect(row("Un visiteur ouvre le site").textContent).toContain(
      "ligne 3 : accept tcp port 80,443",
    );
    expect(row("Un inconnu tente SSH").textContent).toContain("ligne 2 : accept tcp port 22");
    expect(
      row("Un inconnu tente SSH").querySelector('[aria-label="pas comme attendu"]'),
    ).toBeTruthy();
    expect(row("La réponse du dépôt revient").textContent).toContain("par la politique accept");
  });

  it("is done when the right rules make every packet do what it should", () => {
    render(<FirewallLab {...PROPS} />);
    setRules(
      "policy drop\naccept established\naccept tcp from 192.0.2.0/24 port 22\naccept tcp port 80,443",
    );
    expect(screen.getByText("3 / 3 paquets font ce qu'il faut")).toBeTruthy();
    expect(row("Un inconnu tente SSH").textContent).toContain("jeté sans réponse (drop)");
    expect(row("Un inconnu tente SSH").textContent).toContain("par la politique drop");
    expect(row("La réponse du dépôt revient").textContent).toContain(
      "ligne 2 : accept established",
    );
    expect(screen.getByText(/Pare-feu réglé/u)).toBeTruthy();
  });

  it("names the line of a rule it cannot read, and waits", () => {
    render(<FirewallLab {...PROPS} />);
    setRules("policy drop\nallow tcp port 22");
    expect(screen.getByRole("alert").textContent).toContain(
      "Ligne 2 : je ne connais pas « allow »",
    );
    expect(screen.getAllByText("En attente de règles lisibles.")).toHaveLength(3);
    expect(screen.queryByText(/Pare-feu réglé/u)).toBeNull();
  });

  it("gives a verdict to a packet the learner sends, and takes it back", () => {
    render(<FirewallLab {...PROPS} />);
    fireEvent.change(screen.getByLabelText("Adresse source"), {
      target: { value: "198.51.100.7" },
    });
    fireEvent.change(screen.getByLabelText("Port de destination"), { target: { value: "5432" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    const mine = screen.getByRole("list", { name: "Tes paquets" });
    expect(mine.textContent).toContain("tcp depuis 198.51.100.7 vers le port 5432");
    expect(mine.textContent).toContain("accepté");
    fireEvent.change(screen.getByLabelText("Port de destination"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(screen.getByText("Le port est un nombre de 0 à 65535.")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /^Retirer : tcp depuis 198.51.100.7 vers le port 5432/u }),
    );
    expect(screen.queryByRole("list", { name: "Tes paquets" })).toBeNull();
  });

  it("puts the original rules back", () => {
    render(<FirewallLab {...PROPS} />);
    setRules("policy drop");
    fireEvent.click(screen.getByRole("button", { name: "Remettre les règles d'origine" }));
    expect(screen.getByLabelText("Règles du pare-feu")).toHaveProperty("value", PROPS.rules);
  });

  it("says what is wrong with a lab rather than breaking the lesson", () => {
    render(
      <FirewallLab
        {...PROPS}
        probes={[{ label: "a", proto: "tcp", from: "1.2.3.4", expect: "accept" }]}
      />,
    );
    expect(screen.getByRole("note").textContent).toContain("un paquet tcp vise un port");
  });
});
