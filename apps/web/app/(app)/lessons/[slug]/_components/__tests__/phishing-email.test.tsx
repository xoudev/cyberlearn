// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PhishingEmail } from "../phishing-email";

/**
 * Report the parts that give the message away: a suspicious one is marked and
 * explained, a harmless one says so, the link shows its true address on hover,
 * and after three harmless clicks the clues can be shown.
 */

const PROPS = {
  id: "ph",
  title: "Un remboursement inattendu",
  fromName: "DGFiP",
  fromAddress: "remboursement@impots-gouv-fr.net",
  subject: "Remboursement en attente",
  body: ["Bonjour,", "Confirmez vos coordonnées sous 48 h.", "Cordialement,", "Le service"],
  linkText: "Confirmer",
  linkUrl: "http://impots.gouv.fr.remboursement-dgfip.net/confirmation",
  clues: [
    { part: "sender", why: "Un domaine acheté par n'importe qui." },
    { part: "link", why: "Le vrai domaine est remboursement-dgfip.net." },
  ],
  conclusion: "Signale-le, puis supprime-le.",
};

afterEach(cleanup);

const part = (text: string): HTMLElement =>
  screen.getByRole("button", { name: (name) => name.includes(text) });

describe("PhishingEmail", () => {
  it("marks and explains a suspicious part", () => {
    render(<PhishingEmail {...PROPS} />);
    expect(screen.getByText("0 / 2 indices")).toBeTruthy();
    fireEvent.click(part("remboursement@impots-gouv-fr.net"));
    expect(screen.getByText("1 / 2 indices")).toBeTruthy();
    expect(screen.getByText(PROPS.clues[0]?.why ?? "", { exact: false })).toBeTruthy();
    expect(part("remboursement@impots-gouv-fr.net").textContent).toContain("signalé comme suspect");
  });

  it("says when a part is harmless", () => {
    render(<PhishingEmail {...PROPS} />);
    fireEvent.click(part("Bonjour,"));
    expect(screen.getByText("Le paragraphe 1 : rien d'anormal ici.")).toBeTruthy();
    expect(screen.getByText("0 / 2 indices")).toBeTruthy();
  });

  it("shows where the link really goes on hover, as a mail client does", () => {
    render(<PhishingEmail {...PROPS} />);
    expect(screen.queryByText(/Lien vers/)).toBeNull();
    // The hover is caught around the button, where the address line listens.
    const around = part("Confirmer").parentElement;
    if (around === null) throw new Error("the link has no wrapper");
    fireEvent.mouseEnter(around);
    expect(screen.getByText(`Lien vers : ${PROPS.linkUrl}`)).toBeTruthy();
  });

  it("ends with the conclusion once every clue is found, and starts over", () => {
    render(<PhishingEmail {...PROPS} />);
    fireEvent.click(part("remboursement@impots-gouv-fr.net"));
    fireEvent.click(part("Confirmer"));
    expect(screen.getByText("Tout trouvé.")).toBeTruthy();
    expect(screen.getByText(PROPS.conclusion, { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(screen.getByText("0 / 2 indices")).toBeTruthy();
  });

  it("offers the clues after three harmless clicks", () => {
    render(<PhishingEmail {...PROPS} />);
    for (const text of ["Bonjour,", "Cordialement,", "Le service"]) fireEvent.click(part(text));
    fireEvent.click(screen.getByRole("button", { name: "Montrer les indices" }));
    expect(screen.getByText("Les indices.")).toBeTruthy();
    expect(screen.getByText(PROPS.clues[1]?.why ?? "", { exact: false })).toBeTruthy();
  });

  it("says what is wrong with an exercise rather than breaking the lesson", () => {
    render(<PhishingEmail {...PROPS} linkUrl={undefined} />);
    expect(screen.getByRole("note").textContent).toContain("linkText et linkUrl vont ensemble");
  });
});
