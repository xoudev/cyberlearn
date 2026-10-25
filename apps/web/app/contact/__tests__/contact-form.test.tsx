// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ContactPage from "../page";
import type { ContactFormState } from "../_actions/contact-actions";

const submit = vi.hoisted(() =>
  vi.fn<(state: ContactFormState, data: FormData) => Promise<ContactFormState>>(),
);
vi.mock("../_actions/contact-actions", () => ({ submitContactAction: submit }));
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
afterAll(() => {
  if (originalScroll)
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScroll);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
beforeEach(() => {
  window.history.replaceState(null, "", "/contact");
  submit.mockReset();
});
afterEach(cleanup);

describe("contact form", () => {
  it("preserves the requested theme, incident reference and anti-spam fields", () => {
    window.history.replaceState(
      null,
      "",
      "/contact?theme=ESTABLISHMENT_REQUEST&subject=Ignored&ref=TEST-INCIDENT",
    );
    const { container } = render(<ContactPage />);
    expect(screen.getByDisplayValue("Incident TEST-INCIDENT")).toBeDefined();
    expect(screen.getByRole("heading", { name: "À mettre dans ton message" })).toBeDefined();
    const form = container.querySelector("form");
    if (!form) throw new Error("The contact form is missing");
    const data = new FormData(form);
    expect(data.get("theme")).toBe("ESTABLISHMENT_REQUEST");
    expect(data.get("loaded_at")).toMatch(/^\d+$/);
    expect(data.get("website")).toBe("");
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Suggestion" }));
    expect(screen.queryByRole("heading", { name: "À mettre dans ton message" })).toBeNull();
    expect(new FormData(form).get("theme")).toBe("FEATURE_REQUEST");
    expect(submit).not.toHaveBeenCalled();
  });
  it("connects the returned error to the invalid field", async () => {
    const result = Promise.resolve<ContactFormState>({
      error: "Vérifie les champs.",
      fieldErrors: { email: "Adresse invalide." },
    });
    submit.mockReturnValue(result);
    const { container } = render(<ContactPage />);
    const form = container.querySelector("form");
    if (!form) throw new Error("The contact form is missing");
    await act(async () => {
      fireEvent.submit(form);
      await result;
    });
    const email = screen.getByLabelText("Adresse e-mail");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("contact-email-error");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
  it("replaces the form with the server-confirmed success state", async () => {
    const result = Promise.resolve<ContactFormState>({ success: true });
    submit.mockReturnValue(result);
    const { container } = render(<ContactPage />);
    const form = container.querySelector("form");
    if (!form) throw new Error("The contact form is missing");
    await act(async () => {
      fireEvent.submit(form);
      await result;
    });
    expect(screen.getByRole("status").textContent).toContain("Message envoyé.");
    expect(container.querySelector("form")).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
