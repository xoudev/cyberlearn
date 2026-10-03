// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FindTheFlaw } from "../find-the-flaw";

/**
 * The line first, then the name, each retried until right; a hint after the
 * second wrong line; the explanation with the right name; and an exercise the
 * author got wrong says so instead of breaking the lesson.
 */

const PROPS = {
  id: "sqli",
  title: "Connexion",
  language: "python",
  code: '\nname = input()\nquery = "SELECT * FROM users WHERE name = \'" + name + "\'"\ncursor.execute(query)\n',
  line: 2,
  options: ["Injection SQL", "XSS", "CSRF"],
  correct: 0,
  explanation: "La requête colle l'entrée de l'utilisateur.",
  hint: "Où la requête est-elle construite ?",
};

afterEach(cleanup);

const line = (n: number): HTMLElement =>
  screen.getByRole("button", { name: (name) => name.startsWith(`Ligne ${String(n)} :`) });

describe("FindTheFlaw", () => {
  it("asks for the line, and names nothing before it is found", () => {
    render(<FindTheFlaw {...PROPS} />);
    expect(screen.getByText("Clique sur la ligne vulnérable.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Ligne/ })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Injection SQL" })).toBeNull();
  });

  it("says no to a wrong line, then gives the hint after the second", () => {
    render(<FindTheFlaw {...PROPS} />);
    fireEvent.click(line(1));
    expect(screen.getByText(/Pas celle-ci/)).toBeTruthy();
    expect(screen.queryByText(/Indice/)).toBeNull();
    fireEvent.click(line(3));
    expect(screen.getByText(`Indice : ${PROPS.hint}`)).toBeTruthy();
  });

  it("goes from the right line to the name, then to the explanation", () => {
    render(<FindTheFlaw {...PROPS} />);
    fireEvent.click(line(2));
    expect(screen.getByText("Ligne trouvée. Quelle est cette faille ?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "XSS" }));
    expect(screen.getByRole("button", { name: "XSS : non" })).toHaveProperty("disabled", true);
    expect(screen.queryByText(PROPS.explanation)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Injection SQL" }));
    expect(screen.getByText(PROPS.explanation)).toBeTruthy();
  });

  it("starts over", () => {
    render(<FindTheFlaw {...PROPS} />);
    fireEvent.click(line(2));
    fireEvent.click(screen.getByRole("button", { name: "Injection SQL" }));
    fireEvent.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(screen.getByText("Clique sur la ligne vulnérable.")).toBeTruthy();
  });

  it("says what is wrong with an exercise rather than breaking the lesson", () => {
    render(<FindTheFlaw {...PROPS} line={9} />);
    expect(screen.getByRole("note").textContent).toContain("line vaut 9");
  });
});
