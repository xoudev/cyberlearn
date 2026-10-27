// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminConfirmForm, AdminConfirmationProvider } from "./admin-confirmation";

let host: HTMLDivElement;
let root: Root;

async function flushUpdates(run: () => void): Promise<void> {
  await act(async () => {
    run();
    await Promise.resolve();
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await flushUpdates(() => {
    root.unmount();
  });
  host.remove();
});

function control(label: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find(
    (entry) => entry.textContent === label,
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  return button;
}

async function clickButton(label: string): Promise<void> {
  await flushUpdates(() => {
    control(label).click();
  });
}

async function mountForm(action: (data: FormData) => Promise<void>): Promise<void> {
  await flushUpdates(() => {
    root.render(
      createElement(
        AdminConfirmationProvider,
        null,
        createElement(
          AdminConfirmForm,
          {
            action,
            question: (form) => {
              const name = new FormData(form).get("name");
              return `Modifier le profil de ${typeof name === "string" ? name : ""} ?`;
            },
          },
          createElement("input", { name: "name", required: true, defaultValue: "Camille" }),
          createElement("button", { type: "submit", name: "intent", value: "save" }, "Enregistrer"),
        ),
      ),
    );
  });
}

describe("admin sensitive confirmations", () => {
  it("names the administration, action and target before submitting; cancellation retains the draft", async () => {
    const action = vi.fn<(data: FormData) => Promise<void>>().mockResolvedValue(undefined);
    await mountForm(action);
    await clickButton("Enregistrer");
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("ADMIN · Administration");
    expect(dialog?.textContent).toContain("Modifier le profil de Camille");
    expect(action).not.toHaveBeenCalled();
    await clickButton("Annuler");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector<HTMLInputElement>("input[name=name]")?.value).toBe("Camille");
    expect(action).not.toHaveBeenCalled();
  });

  it("submits the original data and submitter exactly once after confirmation", async () => {
    const action = vi.fn<(data: FormData) => Promise<void>>().mockResolvedValue(undefined);
    await mountForm(action);
    await clickButton("Enregistrer");
    await clickButton("Confirmer l’action");
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0]?.[0].get("name")).toBe("Camille");
    expect(action.mock.calls[0]?.[0].get("intent")).toBe("save");
  });

  it("cancels with Escape and returns focus to the original submit button", async () => {
    const action = vi.fn<(data: FormData) => Promise<void>>().mockResolvedValue(undefined);
    await mountForm(action);
    control("Enregistrer").focus();
    await clickButton("Enregistrer");
    await flushUpdates(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(control("Enregistrer"));
    expect(action).not.toHaveBeenCalled();
  });

  it("requires a new confirmation if native validation refuses the approved submission", async () => {
    const action = vi.fn<(data: FormData) => Promise<void>>().mockResolvedValue(undefined);
    await mountForm(action);
    await clickButton("Enregistrer");
    const input = host.querySelector<HTMLInputElement>("input[name=name]");
    if (!input) throw new Error("Missing input");
    input.value = "";
    await clickButton("Confirmer l’action");
    expect(action).not.toHaveBeenCalled();
    input.value = "Alex";
    await clickButton("Enregistrer");
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain(
      "Modifier le profil de Alex",
    );
    expect(action).not.toHaveBeenCalled();
  });
});
