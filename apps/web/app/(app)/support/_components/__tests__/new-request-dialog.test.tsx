// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FileTicketResult } from "@/lib/tickets/requester";

/**
 * "Nouvelle demande" in its window: the request alone (no address to type),
 * what is wrong with it said before anything is sent, and the confirmation in
 * place of the form once it is filed.
 */

const m = vi.hoisted(() => ({
  fileRequestAction:
    vi.fn<
      (input: { subject: string; theme: string; message: string }) => Promise<FileTicketResult>
    >(),
}));

vi.mock("../../_actions/request-actions", () => ({ fileRequestAction: m.fileRequestAction }));

const { default: NewRequestDialog } = await import("../new-request-dialog");

const TICKET_ID = "5b7c2d9e-1f3a-4c5b-8d7e-9f0a1b2c3d4e";
const SUBJECT = "Vidéo muette";
const MESSAGE = "La vidéo de la leçon 3 n'a pas de son sur mon ordinateur.";

function pickTheme(label: string): void {
  fireEvent.click(screen.getByRole("combobox", { name: "Thème" }));
  fireEvent.click(screen.getByRole("option", { name: label }));
}

function write(subject: string, message: string): void {
  fireEvent.change(screen.getByRole("textbox", { name: "Objet" }), {
    target: { value: subject },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
    target: { value: message },
  });
}

function send(): void {
  fireEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no layout: the open list keeps its highlighted option in view.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

describe("NewRequestDialog", () => {
  it("asks for the request alone: the answer goes to the account's address", () => {
    render(<NewRequestDialog value="1" onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Nouvelle demande" });
    expect(dialog.textContent).toContain("à l'adresse de ton compte");
    expect(screen.getByRole("combobox", { name: "Thème" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Objet" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Message" })).toBeTruthy();
    expect(dialog.querySelector('input[type="email"], input[name="email"]')).toBeNull();
  });

  it("says what is missing before anything is sent", () => {
    render(<NewRequestDialog value="1" onClose={vi.fn()} />);
    send();
    expect(screen.getByRole("alert").textContent).toBe("Choisis un thème.");

    pickTheme("Bug");
    write("Bug", MESSAGE);
    send();
    expect(screen.getByRole("alert").textContent).toBe("Un objet de 5 caractères au minimum.");
    expect(m.fileRequestAction).not.toHaveBeenCalled();
  });

  it("shows what an establishment request has to say, once that theme is picked", () => {
    render(<NewRequestDialog value="1" onClose={vi.fn()} />);
    expect(screen.queryByText("À mettre dans ton message")).toBeNull();
    pickTheme("Ajouter mon établissement");
    expect(screen.getByText("À mettre dans ton message")).toBeTruthy();
  });

  it("files the request and confirms it, with a way to the new ticket", async () => {
    m.fileRequestAction.mockResolvedValue({ ok: true, ticketId: TICKET_ID });
    render(<NewRequestDialog value="1" onClose={vi.fn()} />);
    pickTheme("Bug");
    write(`  ${SUBJECT}  `, MESSAGE);
    send();

    expect(await screen.findByRole("dialog", { name: "Demande envoyée" })).toBeTruthy();
    expect(m.fileRequestAction).toHaveBeenCalledWith({
      theme: "BUG",
      subject: SUBJECT,
      message: MESSAGE,
    });
    expect(screen.getByRole("link", { name: "Voir ma demande" }).getAttribute("href")).toBe(
      `/support/${TICKET_ID}`,
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("names the field the server refused, and keeps what was written", async () => {
    m.fileRequestAction.mockResolvedValue({
      ok: false,
      error: "Formulaire invalide.",
      fieldErrors: { subject: "Objet trop long." },
    });
    render(<NewRequestDialog value="1" onClose={vi.fn()} />);
    pickTheme("Question");
    write(SUBJECT, MESSAGE);
    send();

    expect(await screen.findByText("Objet trop long.")).toBeTruthy();
    expect(screen.getByText("Formulaire invalide.")).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Objet" }).value).toBe(SUBJECT);
  });

  it("says the account has no address to answer at, rather than a field it cannot see", async () => {
    m.fileRequestAction.mockResolvedValue({
      ok: false,
      error: "Formulaire invalide.",
      fieldErrors: { email: "Adresse invalide." },
    });
    render(<NewRequestDialog value="1" onClose={vi.fn()} />);
    pickTheme("Question");
    write(SUBJECT, MESSAGE);
    send();
    expect(await screen.findByText("Adresse invalide.")).toBeTruthy();
  });

  it("says so when the call itself fails", async () => {
    m.fileRequestAction.mockRejectedValue(new Error("network"));
    render(<NewRequestDialog value="1" onClose={vi.fn()} />);
    pickTheme("Question");
    write(SUBJECT, MESSAGE);
    send();
    expect((await screen.findByRole("alert")).textContent).toMatch(/Envoi impossible/);
  });

  it("closes on Escape while empty, and not once something is written", () => {
    const onClose = vi.fn();
    render(<NewRequestDialog value="1" onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    write(SUBJECT, "");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("opens with an error screen's incident already written, and files it as a bug", async () => {
    m.fileRequestAction.mockResolvedValue({ ok: true, ticketId: TICKET_ID });
    render(<NewRequestDialog value="incident-abc123" onClose={vi.fn()} />);
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Objet" }).value).toBe(
      "Incident abc123",
    );
    expect(screen.getByRole("combobox", { name: "Thème" }).textContent).toContain("Bug");

    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: MESSAGE },
    });
    send();
    await screen.findByRole("dialog", { name: "Demande envoyée" });
    expect(m.fileRequestAction).toHaveBeenCalledWith({
      theme: "BUG",
      subject: "Incident abc123",
      message: MESSAGE,
    });
  });

  it("opens with the Android app's notice already written", () => {
    render(<NewRequestDialog value="android" onClose={vi.fn()} />);
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Objet" }).value).toBe(
      "Disponibilité de l'application Android",
    );
    expect(screen.getByRole("combobox", { name: "Thème" }).textContent).toContain("Suggestion");
  });

  it("still closes on Escape while only what the link wrote is there", () => {
    const onClose = vi.fn();
    render(<NewRequestDialog value="incident-abc123" onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores a value it does not know, as an address anybody can write", () => {
    render(<NewRequestDialog value="incident-<script>" onClose={vi.fn()} />);
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Objet" }).value).toBe("");
  });
});
