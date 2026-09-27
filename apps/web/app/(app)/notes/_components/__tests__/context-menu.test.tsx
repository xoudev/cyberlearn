// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextMenu, keepsNativeMenu, placeMenu, type MenuState } from "../context-menu";

afterEach(() => {
  cleanup();
});

const VIEWPORT = { width: 1000, height: 800 };
const SIZE = { width: 240, height: 300 };

describe("placeMenu", () => {
  it("opens at the pointer when there is room", () => {
    expect(placeMenu({ x: 100, y: 120 }, SIZE, VIEWPORT)).toEqual({ left: 100, top: 120 });
  });

  it("opens to the left of the pointer near the right edge", () => {
    expect(placeMenu({ x: 900, y: 120 }, SIZE, VIEWPORT).left).toBe(660);
  });

  it("moves up near the bottom edge and never leaves the screen", () => {
    const { top } = placeMenu({ x: 100, y: 780 }, SIZE, VIEWPORT);
    expect(top + SIZE.height).toBeLessThanOrEqual(VIEWPORT.height - 8);
    const tall = placeMenu({ x: 100, y: 780 }, { width: 240, height: 2000 }, VIEWPORT);
    expect(tall.top).toBe(8);
  });
});

describe("keepsNativeMenu", () => {
  it("leaves fields, links and Shift-clicks to the browser", () => {
    const input = document.createElement("input");
    const link = document.createElement("a");
    link.href = "/lessons/x";
    const card = document.createElement("button");
    document.body.append(input, link, card);
    expect(keepsNativeMenu({ target: input, shiftKey: false })).toBe(true);
    expect(keepsNativeMenu({ target: link, shiftKey: false })).toBe(true);
    expect(keepsNativeMenu({ target: card, shiftKey: true })).toBe(true);
    expect(keepsNativeMenu({ target: card, shiftKey: false })).toBe(false);
    document.body.replaceChildren();
  });
});

function renderMenu(onClose = vi.fn()): {
  onClose: ReturnType<typeof vi.fn>;
  open: ReturnType<typeof vi.fn>;
  move: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
} {
  const open = vi.fn();
  const move = vi.fn();
  const remove = vi.fn();
  const menu: MenuState = {
    x: 10,
    y: 10,
    label: "Note : Les variables",
    returnFocus: null,
    entries: [
      { kind: "item", id: "open", label: "Ouvrir", onSelect: open },
      { kind: "label", id: "l", label: "Déplacer vers" },
      {
        kind: "item",
        id: "here",
        label: "Réseau",
        checked: true,
        disabled: true,
        onSelect: move,
      },
      { kind: "item", id: "there", label: "Crypto", checked: false, onSelect: move },
      { kind: "separator", id: "s" },
      { kind: "item", id: "delete", label: "Supprimer la note", danger: true, onSelect: remove },
    ],
  };
  render(<ContextMenu menu={menu} onClose={onClose} />);
  return { onClose, open, move, remove };
}

describe("ContextMenu", () => {
  it("is a named menu whose first item takes the focus", async () => {
    renderMenu();
    const menu = screen.getByRole("menu", { name: "Note : Les variables" });
    expect(menu).toBeTruthy();
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Ouvrir" }));
  });

  it("skips what cannot be picked when moving with the arrows", async () => {
    renderMenu();
    await act(async () => {
      await Promise.resolve();
    });
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    // The current folder is shown, ticked, and passed over.
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Crypto" }));
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitem", { name: "Supprimer la note" }),
    );
  });

  it("runs the item and closes", () => {
    const { onClose, move } = renderMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Crypto" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(move).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a disabled item", () => {
    const { onClose, move } = renderMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Réseau" }));
    expect(move).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape and on a click elsewhere", () => {
    const { onClose } = renderMenu();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
