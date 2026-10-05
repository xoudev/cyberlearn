// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HexEditor } from "../hex-editor";

/**
 * A PNG whose first two bytes were zeroed, with a message in a text chunk:
 * the grid shows the bytes and what they spell, no signature is known until
 * the header is repaired byte by byte, the strings list gives the message
 * away, and the questions are read as a learner answers.
 */

afterEach(cleanup);

const BROKEN_PNG =
  "00 00 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52 00 00 00 01 00 00 00 01 08 02 00 00 00 " +
  "74 45 58 74 43 6f 6d 6d 65 6e 74 00 54 4f 55 52 4e 45 53 4f 4c 00";

const PROPS = {
  id: "png",
  title: "Une image abîmée",
  task: "Répare la signature et lis le message.",
  filename: "photo.png",
  bytes: BROKEN_PNG,
  repairs: [{ label: "La signature PNG est rétablie", offset: 0, bytes: "89 50" }],
  questions: [
    {
      label: "Quel est le type réel du fichier ?",
      answer: ["PNG", "image PNG"],
      hint: "Lis le type réel une fois réparé.",
    },
    { label: "Quel mot est caché dans l'image ?", answer: "TOURNESOL" },
  ],
};

const byte = (offset: number): HTMLElement =>
  screen.getByRole("gridcell", { name: (name) => name.startsWith(`Octet ${String(offset)} :`) });

const writeByte = (offset: number, value: string): void => {
  fireEvent.click(byte(offset));
  fireEvent.change(screen.getByLabelText("Nouvelle valeur (hexadécimal)"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Écrire" }));
};

describe("HexEditor", () => {
  it("shows the bytes, their characters, and no known signature while the header is broken", () => {
    render(<HexEditor {...PROPS} />);
    expect(screen.getByText("photo.png · 51 octets")).toBeTruthy();
    expect(screen.getAllByRole("gridcell")).toHaveLength(51);
    expect(byte(2).textContent).toBe("4e");
    expect(screen.getByText(/aucune signature connue/u)).toBeTruthy();
    expect(screen.getByRole("list", { name: "Chaînes lisibles" }).textContent).toContain(
      "TOURNESOL",
    );
    expect(screen.getByText(/○ La signature PNG est rétablie/u)).toBeTruthy();
  });

  it("repairs the header byte by byte, and names the format once it reads right", () => {
    render(<HexEditor {...PROPS} />);
    writeByte(0, "89");
    expect(byte(0).textContent).toBe("89");
    expect(byte(0).getAttribute("aria-label")).toContain("modifié");
    expect(screen.getByText(/aucune signature connue/u)).toBeTruthy();
    writeByte(1, "50");
    expect(screen.getByText("image PNG")).toBeTruthy();
    expect(screen.getByText(/✓ La signature PNG est rétablie/u)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Rétablir l'original/u }));
    expect(byte(0).textContent).toBe("00");
  });

  it("refuses a value that is not one byte, and selects a string's first byte from the list", () => {
    render(<HexEditor {...PROPS} />);
    fireEvent.click(byte(0));
    fireEvent.change(screen.getByLabelText("Nouvelle valeur (hexadécimal)"), {
      target: { value: "8" },
    });
    expect(screen.getByRole("button", { name: "Écrire" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Octet 41 : TOURNESOL" }));
    expect(byte(41).getAttribute("aria-pressed")).toBe("true");
  });

  it("reads the answers and closes the exercise once the header is repaired too", () => {
    render(<HexEditor {...PROPS} />);
    const kind = screen.getByLabelText("Quel est le type réel du fichier ?");
    fireEvent.change(kind, { target: { value: "jpeg" } });
    fireEvent.submit(kind.closest("form") ?? kind);
    expect(screen.getByText(/Non, ce n'est pas ça\./u).textContent).toContain(
      "Indice : Lis le type réel",
    );
    fireEvent.change(kind, { target: { value: " png " } });
    fireEvent.submit(kind.closest("form") ?? kind);
    const word = screen.getByLabelText("Quel mot est caché dans l'image ?");
    fireEvent.change(word, { target: { value: "tournesol" } });
    fireEvent.submit(word.closest("form") ?? word);
    expect(screen.queryByText(/Exercice complété/u)).toBeNull();
    writeByte(0, "89");
    writeByte(1, "50");
    expect(screen.getByText(/Exercice complété/u)).toBeTruthy();
  });

  it("says what is wrong with a file rather than breaking the lesson", () => {
    render(<HexEditor {...PROPS} bytes="89 5" />);
    expect(screen.getByRole("note").textContent).toContain("hexadécimal");
  });
});
