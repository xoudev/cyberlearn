// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CryptoWorkshop } from "../crypto-workshop";

/**
 * The bench answers as it is typed, in both directions, says what is wrong
 * with a key, keeps SHA-256 one way; a challenge is solved from the tools'
 * output or by hand, and a wrong answer brings the hint.
 */

afterEach(cleanup);

const PROPS = {
  id: "w",
  title: "Encoder, décoder",
  tools: ["base64", "caesar", "sha256"],
  input: "Man",
  challenge: { ciphertext: "TWFu", answer: "Man", hint: "Ce n'est qu'un encodage." },
};

const output = (): string => screen.getByLabelText("Sortie").textContent;
const setInput = (text: string): void => {
  fireEvent.change(screen.getByLabelText("Entrée"), { target: { value: text } });
};

describe("CryptoWorkshop", () => {
  it("opens the first tool and transforms the starting input at once", () => {
    render(<CryptoWorkshop {...PROPS} />);
    expect(screen.getByRole("button", { name: "Base64" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(output()).toBe("TWFu");
    setInput("Ma");
    expect(output()).toBe("TWE=");
  });

  it("decodes in the other direction, and takes its own output back as input", () => {
    render(<CryptoWorkshop {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: /Reprendre la sortie/u }));
    expect(screen.getByLabelText("Entrée")).toHaveProperty("value", "TWFu");
    expect(screen.getByRole("button", { name: "Décoder" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(output()).toBe("Man");
    setInput("T*");
    expect(screen.getByText(/Ce n'est pas du Base64/u)).toBeTruthy();
  });

  it("shifts letters with the key it is given, and says when the key is no number", () => {
    render(<CryptoWorkshop {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "César" }));
    expect(screen.getByLabelText("Décalage")).toHaveProperty("value", "3");
    expect(output()).toBe("Pdq");
    fireEvent.change(screen.getByLabelText("Décalage"), { target: { value: "x" } });
    expect(screen.getByText(/nombre entier/u)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Décalage"), { target: { value: "-3" } });
    expect(output()).toBe("Jxk");
  });

  it("hashes one way only: no direction, sixty-four hexadecimal characters", () => {
    render(<CryptoWorkshop {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "SHA-256" }));
    expect(screen.queryByRole("group", { name: "Sens" })).toBeNull();
    const first = output();
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
    setInput("Mao");
    expect(output()).not.toBe(first);
  });

  it("solves the challenge from the tools' output, and brings the hint after a wrong answer", () => {
    render(<CryptoWorkshop {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Mettre dans l'entrée" }));
    expect(screen.getByLabelText("Entrée")).toHaveProperty("value", "TWFu");
    expect(output()).toBe("Man");
    fireEvent.change(screen.getByLabelText("Ta réponse en clair"), { target: { value: "Men" } });
    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(screen.getByText(/Non, ce n'est pas encore ça/u).textContent).toContain(
      "Indice : Ce n'est qu'un encodage.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Utiliser la sortie comme réponse" }));
    expect(screen.getByLabelText("Ta réponse en clair")).toHaveProperty("value", "Man");
    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(screen.getByText(/Déchiffré : c'est bien le message/u)).toBeTruthy();
  });

  it("says what is wrong with a bench rather than breaking the lesson", () => {
    render(<CryptoWorkshop {...PROPS} tools={["rot13"]} />);
    expect(screen.getByRole("note").textContent).toContain("tools.0");
  });
});
