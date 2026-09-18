import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Select, type SelectOption } from "../components/select.js";

const OPTIONS: SelectOption[] = [
  { value: "CYBERSEC", label: "Cybersécurité" },
  { value: "DEV", label: "Développement", disabled: true },
  { value: "NETWORK", label: "Réseau" },
];

beforeAll(() => {
  // jsdom has no layout, so the list has nowhere to scroll and nothing to
  // measure. Neither is what these tests are about.
  Element.prototype.scrollIntoView = vi.fn();
});

function open(): HTMLElement {
  fireEvent.click(screen.getByRole("combobox"));
  return screen.getByRole("listbox");
}

describe("Select", () => {
  it("shows the chosen option, and the placeholder when there is none", () => {
    const { rerender } = render(
      <Select options={OPTIONS} value="NETWORK" aria-label="Catégorie" />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Réseau");

    rerender(<Select options={OPTIONS} value="" placeholder="Toutes" aria-label="Catégorie" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Toutes");
  });

  it("keeps its list closed until it is asked for", () => {
    render(<Select options={OPTIONS} value="" aria-label="Catégorie" />);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");

    open();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(3);
  });

  it("reports the value once, when a choice is made", () => {
    const onChange = vi.fn();
    render(<Select options={OPTIONS} value="" onChange={onChange} aria-label="Catégorie" />);
    fireEvent.click(within(open()).getByText("Réseau"));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("NETWORK");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("refuses a disabled option, and does not close on one", () => {
    const onChange = vi.fn();
    render(<Select options={OPTIONS} value="" onChange={onChange} aria-label="Catégorie" />);
    fireEvent.click(within(open()).getByText("Développement"));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("is driven from the keyboard, and gives focus back on Escape", () => {
    const onChange = vi.fn();
    render(<Select options={OPTIONS} value="" onChange={onChange} aria-label="Catégorie" />);
    const trigger = screen.getByRole("combobox");
    trigger.focus();

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Down from the first lands past the disabled one.
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onChange).toHaveBeenCalledExactlyOnceWith("NETWORK");
    expect(trigger).toHaveFocus();

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("remembers its own value when nobody else is holding it", () => {
    render(<Select options={OPTIONS} defaultValue="CYBERSEC" aria-label="Catégorie" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Cybersécurité");

    fireEvent.click(within(open()).getByText("Réseau"));
    expect(screen.getByRole("combobox")).toHaveTextContent("Réseau");
  });

  // ─── The form ────────────────────────────────────────────────────────────
  //
  // The point of keeping a real <select> underneath. These are the behaviours
  // that would quietly disappear the day it is replaced by a hidden input.

  it("submits the chosen value under its name", () => {
    const seen: string[] = [];
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          seen.push(new FormData(e.currentTarget).get("category") as string);
        }}
      >
        <Select options={OPTIONS} name="category" defaultValue="CYBERSEC" aria-label="Catégorie" />
        <button type="submit">Envoyer</button>
      </form>,
    );

    fireEvent.click(within(open()).getByText("Réseau"));
    fireEvent.click(screen.getByText("Envoyer"));
    expect(seen).toEqual(["NETWORK"]);
  });

  it("still lets the browser refuse an empty required field", () => {
    render(
      <form>
        <Select options={OPTIONS} name="category" required defaultValue="" aria-label="Catégorie" />
      </form>,
    );

    const field = document.querySelector<HTMLSelectElement>("select[name='category']");
    expect(field).not.toBeNull();
    expect(field?.required).toBe(true);
    expect(field?.checkValidity()).toBe(false);

    fireEvent.click(within(open()).getByText("Réseau"));
    expect(field?.value).toBe("NETWORK");
    expect(field?.checkValidity()).toBe(true);
  });

  it("stays shut when it is disabled", () => {
    render(<Select options={OPTIONS} value="" disabled aria-label="Catégorie" />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("Select inside a <label>", () => {
  it("gives the label's click and name to the control a person can see", () => {
    render(
      <label>
        Catégorie
        <Select options={OPTIONS} name="category" defaultValue="" />
      </label>,
    );

    // The invisible field is a labelable element too, and it is the one a
    // <label> would take if it came first in the markup - which would hand the
    // label's click and its name to something nobody can see.
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAccessibleName("Catégorie");
  });
});
