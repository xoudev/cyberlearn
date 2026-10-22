// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContactFormState } from "../_actions/contact-actions";

/**
 * A refused message keeps what the visitor wrote. React empties an uncontrolled
 * form once its action has run, so a refusal - a mistyped address, or the
 * contact form's limit per IP, which a school's shared address reaches without
 * anyone's fault - used to leave an empty form behind a 5 000 character message.
 */

const m = vi.hoisted(() => ({
  submitContactAction: vi.fn<(prev: unknown, formData: FormData) => Promise<ContactFormState>>(),
}));
vi.mock("../_actions/contact-actions", () => ({ submitContactAction: m.submitContactAction }));

const { default: ContactPage } = await import("../page");

const MESSAGE = "Bonjour, j'aimerais ajouter mon établissement : voici la liste demandée.";

function field(container: HTMLElement, selector: string): HTMLInputElement | HTMLTextAreaElement {
  const found = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (found === null) throw new Error(`No field matches ${selector}`);
  return found;
}

function formIn(container: HTMLElement): HTMLFormElement {
  const found = container.querySelector("form");
  if (found === null) throw new Error("No form");
  return found;
}

async function fillAndSend(container: HTMLElement): Promise<void> {
  fireEvent.change(field(container, "[name=email]"), { target: { value: "jean@gmail" } });
  fireEvent.change(field(container, "[name=subject]"), { target: { value: "Mon établissement" } });
  fireEvent.change(field(container, "[name=message]"), { target: { value: MESSAGE } });
  // The action runs in a transition: acting on a promise lets it settle, and
  // React reset the form, before the assertions look.
  await act(() => Promise.resolve(fireEvent.submit(formIn(container))));
}

beforeEach(() => {
  m.submitContactAction.mockReset();
  window.history.replaceState({}, "", "/contact?theme=ESTABLISHMENT_REQUEST");
});

afterEach(cleanup);

describe("the contact form after a refusal", () => {
  it("keeps the address, the subject and the message after a refused address", async () => {
    m.submitContactAction.mockResolvedValue({
      error: "Formulaire invalide.",
      fieldErrors: { email: "Adresse e-mail invalide." },
      values: { email: "jean@gmail", subject: "Mon établissement", message: MESSAGE },
    });
    const { container, findByText } = render(<ContactPage />);

    await fillAndSend(container);

    await findByText("Adresse e-mail invalide.");
    expect(field(container, "[name=email]").value).toBe("jean@gmail");
    expect(field(container, "[name=subject]").value).toBe("Mon établissement");
    expect(field(container, "[name=message]").value).toBe(MESSAGE);
  });

  it("keeps them when the limit per IP is what stopped the message", async () => {
    m.submitContactAction.mockResolvedValue({
      error: "Trop de demandes. Réessaie dans 30 secondes.",
      values: { email: "jean@gmail", subject: "Mon établissement", message: MESSAGE },
    });
    const { container, findByText } = render(<ContactPage />);

    await fillAndSend(container);

    await findByText("Trop de demandes. Réessaie dans 30 secondes.");
    expect(field(container, "[name=email]").value).toBe("jean@gmail");
    expect(field(container, "[name=message]").value).toBe(MESSAGE);
  });

  it("keeps the chosen theme as well", async () => {
    m.submitContactAction.mockResolvedValue({
      error: "Trop de demandes. Réessaie dans 30 secondes.",
      values: { email: "jean@gmail", subject: "Mon établissement", message: MESSAGE },
    });
    const { container, findByText } = render(<ContactPage />);
    await waitFor(() => {
      expect(container.querySelector<HTMLSelectElement>("select[name=theme]")?.value).toBe(
        "ESTABLISHMENT_REQUEST",
      );
    });

    await fillAndSend(container);

    await findByText("Trop de demandes. Réessaie dans 30 secondes.");
    expect(container.querySelector<HTMLSelectElement>("select[name=theme]")?.value).toBe(
      "ESTABLISHMENT_REQUEST",
    );
  });

  it("starts a first visit empty, with only the subject a link asked for", () => {
    window.history.replaceState({}, "", "/contact?subject=Disponibilit%C3%A9");
    const { container } = render(<ContactPage />);

    expect(field(container, "[name=email]").value).toBe("");
    expect(field(container, "[name=message]").value).toBe("");
    expect(field(container, "[name=subject]").value).toBe("Disponibilité");
  });
});
