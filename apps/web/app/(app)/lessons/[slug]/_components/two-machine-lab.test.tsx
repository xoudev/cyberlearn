// @vitest-environment jsdom
import React, { useContext } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetworkMachineContext } from "@/lib/linux-terminal/network-context";

vi.mock("./linux-terminal", () => ({
  LinuxTerminal: (props: { id?: string; title?: string }) => {
    const machine = useContext(NetworkMachineContext);
    return (
      <div
        data-testid={`terminal-${machine?.role ?? "none"}`}
        data-id={props.id ?? ""}
        data-title={props.title ?? ""}
      />
    );
  },
}));

import { TwoMachineLab } from "./two-machine-lab";

describe("TwoMachineLab", () => {
  it("renders an alert when id prop is missing or invalid", () => {
    render(<TwoMachineLab />);
    expect(screen.getByRole("alert").textContent).toContain("identifiant invalide");
  });

  it("draws its reset as a button of the site, and sets the machines out by the lesson block", () => {
    render(<TwoMachineLab id="blueteam-13-two-machine-lab" />);

    // Unstyled, under Tailwind's reset, it was a line of text.
    const reset = screen.getByRole("button", { name: "Réinitialiser les deux machines" });
    expect(reset.classList.contains("btn")).toBe(true);
    // The grid answers to the block's width (two-machine-lab.css), not the window's.
    const machines = screen.getByTestId("terminal-attacker").parentElement;
    expect(machines?.classList.contains("two-machine-lab__machines")).toBe(true);
    expect(machines?.contains(screen.getByTestId("terminal-target"))).toBe(true);
    expect(machines?.className).not.toMatch(/\bxl:/u);
  });

  it("mounts attacker and target terminals sharing the same isolated network and resets both", () => {
    render(<TwoMachineLab id="blueteam-13-two-machine-lab" />);

    const attacker = screen.getByTestId("terminal-attacker");
    const target = screen.getByTestId("terminal-target");

    expect(attacker.getAttribute("data-title")).toBe("Attackbox · 10.77.0.1");
    expect(target.getAttribute("data-title")).toBe("app01 · 10.77.0.2");
    expect(target.getAttribute("data-id")).toBe("blueteam-13-two-machine-lab");

    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser les deux machines" }));
    expect(screen.getByTestId("terminal-attacker")).toBeDefined();
    expect(screen.getByTestId("terminal-target")).toBeDefined();
  });
});
