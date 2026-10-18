import React, { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { filterOptions, MultiSelect, type MultiSelectOption } from "../components/multi-select.js";

const OPTIONS: MultiSelectOption[] = [
  { value: "linux", label: "Linux", hint: "CL-PATH-102-V01" },
  { value: "net", label: "Réseaux", hint: "CL-PATH-103-V01" },
  { value: "old", label: "Ancien parcours", hint: "CL-PATH-004-V01", disabled: true },
  { value: "web", label: "Sécurité web", hint: "CL-PATH-110-V01" },
];

beforeAll(() => {
  // jsdom has no layout, so the list has nowhere to scroll.
  Element.prototype.scrollIntoView = vi.fn();
});

/** A parent holding the values, as a form's state would. */
function Holder({
  initial = [],
  onChange,
}: {
  initial?: string[];
  onChange?: (values: string[]) => void;
}): React.JSX.Element {
  const [values, setValues] = useState(initial);
  return (
    <MultiSelect
      options={OPTIONS}
      value={values}
      onChange={(next) => {
        setValues(next);
        onChange?.(next);
      }}
      aria-label="Parcours"
    />
  );
}

function trigger(): HTMLElement {
  return screen.getByRole("button", { name: "Parcours" });
}

function open(): HTMLElement {
  fireEvent.click(trigger());
  return screen.getByRole("listbox");
}

describe("MultiSelect", () => {
  it("stays open after a choice, and ticks the option", () => {
    const onChange = vi.fn();
    render(<Holder onChange={onChange} />);
    fireEvent.click(within(open()).getByText("Linux"));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("Réseaux"));

    expect(onChange).toHaveBeenLastCalledWith(["linux", "net"]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Linux/u })).toHaveAttribute("aria-selected", "true");
    expect(trigger()).toHaveTextContent("2 choix");
  });

  it("unticks an option chosen before, keeping the others in their order", () => {
    const onChange = vi.fn();
    render(<Holder initial={["web", "linux", "net"]} onChange={onChange} />);
    fireEvent.click(within(open()).getByText("Linux"));
    expect(onChange).toHaveBeenLastCalledWith(["web", "net"]);
  });

  it("refuses a disabled option", () => {
    const onChange = vi.fn();
    render(<Holder onChange={onChange} />);
    fireEvent.click(within(open()).getByText("Ancien parcours"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is driven from the search field's keys, and gives focus back on Escape", () => {
    const onChange = vi.fn();
    render(<Holder onChange={onChange} />);
    trigger().focus();

    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    const search = screen.getByRole("combobox");
    expect(search).toHaveFocus();

    // Linux is highlighted first; Down goes to Réseaux, then past the
    // disabled option to Sécurité web.
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["net", "web"]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("narrows the list to what is typed, accents and codes included", () => {
    render(<Holder />);
    open();
    const search = screen.getByRole("combobox");

    fireEvent.change(search, { target: { value: "reseau" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "RéseauxCL-PATH-103-V01",
    ]);

    fireEvent.change(search, { target: { value: "110" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    // Enter ticks the one match.
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByRole("option", { name: /Sécurité web/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
  });

  it("never submits the form on Enter", () => {
    const submit = vi.fn((e: React.SyntheticEvent) => {
      e.preventDefault();
    });
    render(
      <form onSubmit={submit}>
        <Holder />
      </form>,
    );
    open();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(submit).not.toHaveBeenCalled();
  });

  it("closes on a click elsewhere, and on its own button", () => {
    render(
      <>
        <Holder />
        <p>Ailleurs</p>
      </>,
    );
    open();
    fireEvent.pointerDown(screen.getByText("Ailleurs"));
    expect(screen.queryByRole("listbox")).toBeNull();

    open();
    fireEvent.click(screen.getByRole("button", { name: "Terminé" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("lists what is chosen, each with a way to take it back", () => {
    const onChange = vi.fn();
    render(<Holder initial={["net", "linux"]} onChange={onChange} />);
    const chips = screen.getByRole("list", { name: "Sélection" });
    expect(
      within(chips)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Réseaux", "Linux"]);

    fireEvent.click(screen.getByRole("button", { name: "Retirer Réseaux" }));
    expect(onChange).toHaveBeenLastCalledWith(["linux"]);
  });

  it("submits each chosen value under its name, in the order chosen", () => {
    const seen: string[][] = [];
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          seen.push(new FormData(e.currentTarget).getAll("pathIds").map(String));
        }}
      >
        <MultiSelect
          options={OPTIONS}
          name="pathIds"
          defaultValue={["web"]}
          aria-label="Parcours"
        />
        <button type="submit">Envoyer</button>
      </form>,
    );
    fireEvent.click(within(open()).getByText("Linux"));
    fireEvent.click(screen.getByText("Envoyer"));
    expect(seen).toEqual([["web", "linux"]]);
  });

  it("stays shut when it is disabled", () => {
    render(<MultiSelect options={OPTIONS} value={[]} disabled aria-label="Parcours" />);
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("filterOptions", () => {
  it("keeps the options holding every word typed, in the label or the hint", () => {
    expect(filterOptions(OPTIONS, "  ").map((o) => o.value)).toEqual([
      "linux",
      "net",
      "old",
      "web",
    ]);
    expect(filterOptions(OPTIONS, "sécu 110").map((o) => o.value)).toEqual(["web"]);
    expect(filterOptions(OPTIONS, "PARCOURS 004").map((o) => o.value)).toEqual(["old"]);
  });
});
