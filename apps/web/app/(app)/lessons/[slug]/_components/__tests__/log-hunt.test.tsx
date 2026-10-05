// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LogHunt } from "../log-hunt";

/**
 * The brute force of the blue-team project as a hunt: the table shows every
 * event, a filter narrows it, a count by address names the attacker, a click
 * on a value filters on it, and the questions are read as a learner answers.
 */

afterEach(cleanup);

const PROPS = {
  id: "web01",
  title: "L'accès initial",
  task: "Trouve l'adresse de l'attaquant.",
  events: [
    {
      time: "2026-01-10 03:14:02",
      source: "sshd",
      host: "web01",
      ip: "203.0.113.9",
      user: "deploy",
      action: "Accepted password",
    },
  ],
  series: [
    {
      count: 30,
      from: "2026-01-10 03:09:00",
      to: "2026-01-10 03:14:00",
      source: "sshd",
      hosts: ["web01"],
      ips: ["203.0.113.9"],
      users: ["deploy"],
      actions: ["Failed password"],
    },
    {
      count: 12,
      from: "2026-01-10 02:00:00",
      to: "2026-01-10 04:00:00",
      source: "nginx",
      hosts: ["web01"],
      ips: ["198.51.100.23"],
      actions: ["GET / 200"],
    },
  ],
  questions: [
    {
      label: "Quelle adresse a mené la force brute ?",
      answer: "203.0.113.9",
      hint: "Compte par adresse.",
    },
    { label: "À quelle heure la connexion a réussi ?", answer: "2026-01-10 03:14:02" },
  ],
};

const rows = (): HTMLElement[] =>
  within(screen.getByRole("table", { name: "Événements" }))
    .getAllByRole("row")
    .slice(1);

/** The form a question's field sits in. */
const formOf = (element: HTMLElement): HTMLFormElement => {
  const form = element.closest("form");
  if (form === null) throw new Error("no form around the field");
  return form;
};

describe("LogHunt", () => {
  it("shows every event, in time order, with the hour alone", () => {
    render(<LogHunt {...PROPS} />);
    expect(screen.getByText("43 événements sur 43")).toBeTruthy();
    const all = rows();
    expect(all).toHaveLength(43);
    const hours = all.map((r) => r.querySelector("td")?.textContent ?? "");
    expect([...hours].sort()).toEqual(hours);
    expect(hours.at(-1)).toMatch(/^0[23]:/u);
  });

  it("narrows the table with the text filter, and counts by address", () => {
    render(<LogHunt {...PROPS} />);
    fireEvent.change(screen.getByLabelText("Filtre texte"), { target: { value: "failed" } });
    expect(screen.getByText("30 événements sur 43")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Compter par"), { target: { value: "ip" } });
    const counts = screen.getByRole("table", { name: "Décompte par adresse ip" });
    expect(counts.textContent).toContain("30");
    expect(counts.textContent).toContain("203.0.113.9");
  });

  it("filters on a clicked value, shows the filter, and takes it off", () => {
    render(<LogHunt {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrer : Action = Accepted password" }));
    expect(screen.getByText("1 événements sur 43")).toBeTruthy();
    expect(rows()).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Retirer le filtre Action = Accepted password" }),
    );
    expect(screen.getByText("43 événements sur 43")).toBeTruthy();
  });

  it("reads the answers, gives the hint after a miss, and closes the hunt", () => {
    render(<LogHunt {...PROPS} />);
    const ip = screen.getByLabelText("Quelle adresse a mené la force brute ?");
    fireEvent.change(ip, { target: { value: "198.51.100.23" } });
    fireEvent.submit(formOf(ip));
    expect(screen.getByText(/Non, ce n'est pas ça\./u).textContent).toContain(
      "Indice : Compte par adresse.",
    );
    fireEvent.change(ip, { target: { value: " 203.0.113.9 " } });
    fireEvent.submit(formOf(ip));
    expect(screen.queryByText(/Non, ce n'est pas ça/u)).toBeNull();
    const when = screen.getByLabelText("À quelle heure la connexion a réussi ?");
    fireEvent.change(when, { target: { value: "03:14" } });
    fireEvent.submit(formOf(when));
    expect(screen.getByText(/Enquête bouclée/u)).toBeTruthy();
  });

  it("says what is wrong with a hunt rather than breaking the lesson", () => {
    render(<LogHunt {...PROPS} events={[]} series={[]} />);
    expect(screen.getByRole("note").textContent).toContain("il faut des événements");
  });
});
