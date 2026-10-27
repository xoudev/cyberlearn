// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModalShell } from "@cyberlearn/ui";
import { InfoTip } from "../info-tip";

afterEach(cleanup);
describe("InfoTip", () => {
  it("closes its explanation with Escape without closing the surrounding dialog", () => {
    const close = vi.fn();
    render(
      <ModalShell open title="Paramètres" onClose={close}>
        <InfoTip title="Visibilité">
          <p>Qui peut lire ce profil.</p>
        </InfoTip>
      </ModalShell>,
    );
    const trigger = screen.getByRole("button", { name: "Plus d'informations" });
    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("dismisses on an outside click and removes the description reference", () => {
    render(
      <>
        <button type="button">Dehors</button>
        <InfoTip title="Explication">Une information.</InfoTip>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Plus d'informations" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("button", { name: "Dehors" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(trigger.getAttribute("aria-describedby")).toBeNull();
  });
});
