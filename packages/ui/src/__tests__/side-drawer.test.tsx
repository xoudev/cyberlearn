import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModalShell } from "../components/modal-shell.js";
import { SideDrawer } from "../components/side-drawer.js";

/**
 * The panel against the right edge, both ways: over the page (a ModalShell,
 * whose own behaviour is tested on its own) and docked beside it, where the
 * page has to stay in use.
 */

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

/** A page with a button that opens the drawer and a field of its own. */
function Page({ modal, onClose }: { modal: boolean; onClose?: () => void }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        ouvrir
      </button>
      <input aria-label="champ de la page" />
      <SideDrawer
        open={open}
        modal={modal}
        title="Notes"
        meta="3 notes"
        closeLabel="Fermer les notes"
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      >
        <button type="button">dans le tiroir</button>
      </SideDrawer>
    </>
  );
}

function openFrom(trigger: HTMLElement): void {
  trigger.focus();
  fireEvent.click(trigger);
}

describe("SideDrawer", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <SideDrawer open={false} onClose={vi.fn()} title="Notes">
        <p>contenu</p>
      </SideDrawer>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("draws its header, its content and the Escape hint, or the footer it is given", () => {
    const { rerender } = render(
      <SideDrawer open onClose={vi.fn()} title="Notes" meta="@ada" width={400}>
        <p>contenu</p>
      </SideDrawer>,
    );
    expect(screen.getByRole("dialog", { name: "Notes" })).toBeTruthy();
    expect(screen.getByText("@ada").className).toBe("side-drawer__meta");
    expect(screen.getByText("Échap pour fermer")).toBeTruthy();
    expect(screen.getByText("contenu").parentElement?.className).toBe("side-drawer__body");
    expect(document.querySelector<HTMLElement>(".side-drawer")?.style.width).toBe(
      "min(400px, 100%)",
    );

    rerender(
      <SideDrawer open onClose={vi.fn()} title="Notes" footer={<span>2 non lues</span>}>
        <p>contenu</p>
      </SideDrawer>,
    );
    expect(screen.queryByText("Échap pour fermer")).toBeNull();
    expect(screen.getByText("2 non lues")).toBeTruthy();
    expect(document.querySelector(".side-drawer__meta")).toBeNull();

    rerender(
      <SideDrawer open onClose={vi.fn()} title="Notes" footer={null}>
        <p>contenu</p>
      </SideDrawer>,
    );
    expect(document.querySelector(".side-drawer__foot")).toBeNull();
  });

  describe("over the page", () => {
    it("is a modal dialog that locks the page, and closes on Escape, the backdrop and its button", () => {
      const onClose = vi.fn();
      render(<Page modal onClose={onClose} />);
      fireEvent.click(screen.getByText("ouvrir"));
      const dialog = screen.getByRole("dialog", { name: "Notes" });
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.click(screen.getByText("dans le tiroir"));
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(document.body.style.overflow).toBe("");

      fireEvent.click(screen.getByText("ouvrir"));
      const backdrop = document.querySelector(".side-drawer__backdrop");
      expect(backdrop).toBeTruthy();
      if (backdrop) fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByText("ouvrir"));
      fireEvent.click(screen.getByRole("button", { name: "Fermer les notes" }));
      expect(onClose).toHaveBeenCalledTimes(3);
    });

    it("keeps Tab inside, and gives the focus back to what opened it", () => {
      render(<Page modal />);
      const trigger = screen.getByText("ouvrir");
      openFrom(trigger);
      const dialog = screen.getByRole("dialog", { name: "Notes" });
      expect(dialog.contains(document.activeElement)).toBe(true);

      screen.getByText("dans le tiroir").focus();
      fireEvent.keyDown(document, { key: "Tab" });
      expect(dialog.contains(document.activeElement)).toBe(true);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe("docked beside the page", () => {
    it("has no backdrop, no lock and no trap: the page stays in use", () => {
      render(<Page modal={false} />);
      fireEvent.click(screen.getByText("ouvrir"));
      const dialog = screen.getByRole("dialog", { name: "Notes" });
      expect(dialog.getAttribute("aria-modal")).toBeNull();
      expect(dialog.className).toBe("side-drawer side-drawer--docked");
      expect(document.querySelector(".side-drawer__backdrop")).toBeNull();
      expect(document.querySelector(".modal-shell")).toBeNull();
      expect(document.body.style.overflow).toBe("");

      // Tab is left to the browser, out of the drawer and into the page.
      const last = screen.getByRole("button", { name: "Fermer les notes" });
      last.focus();
      const tab = fireEvent.keyDown(last, { key: "Tab" });
      expect(tab).toBe(true);
      const field = screen.getByLabelText("champ de la page");
      field.focus();
      expect(document.activeElement).toBe(field);
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("takes the focus when it opens and gives it back when it closes", () => {
      render(<Page modal={false} />);
      const trigger = screen.getByText("ouvrir");
      openFrom(trigger);
      const dialog = screen.getByRole("dialog", { name: "Notes" });
      expect(document.activeElement).toBe(dialog);

      fireEvent.keyDown(screen.getByText("dans le tiroir"), { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it("closes on its button, and not on an Escape meant for the page", () => {
      const onClose = vi.fn();
      render(<Page modal={false} onClose={onClose} />);
      openFrom(screen.getByText("ouvrir"));

      const field = screen.getByLabelText("champ de la page");
      field.focus();
      fireEvent.keyDown(field, { key: "Escape" });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Fermer les notes" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("leaves the focus where the reader put it in the page", () => {
      // Closed from outside it (the browser's Back, for one) while the reader
      // is typing in the page beside it.
      function Docked({ open }: { open: boolean }): React.JSX.Element {
        return (
          <>
            <button type="button">ouvrir</button>
            <input aria-label="champ de la page" />
            <SideDrawer open={open} modal={false} onClose={vi.fn()} title="Notes">
              <p>contenu</p>
            </SideDrawer>
          </>
        );
      }
      const { rerender } = render(<Docked open={false} />);
      screen.getByText("ouvrir").focus();
      rerender(<Docked open />);
      const field = screen.getByLabelText("champ de la page");
      field.focus();
      rerender(<Docked open={false} />);
      expect(document.activeElement).toBe(field);
    });

    it("gives the focus to no one when the render that closes it says so", () => {
      // The page changed under it: the opener is still there, the new page
      // is read from its start.
      function Docked({
        open,
        returnFocus,
      }: {
        open: boolean;
        returnFocus: boolean;
      }): React.JSX.Element {
        return (
          <>
            <button type="button">ouvrir</button>
            <SideDrawer
              open={open}
              modal={false}
              returnFocus={returnFocus}
              onClose={vi.fn()}
              title="Notes"
            >
              <p>contenu</p>
            </SideDrawer>
          </>
        );
      }
      const { rerender } = render(<Docked open={false} returnFocus />);
      const trigger = screen.getByText("ouvrir");
      trigger.focus();
      rerender(<Docked open returnFocus />);
      expect(document.activeElement).toBe(screen.getByRole("dialog", { name: "Notes" }));
      rerender(<Docked open={false} returnFocus={false} />);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).not.toBe(trigger);
    });

    it("leaves Escape to a dialog opened from inside it", () => {
      const closeDrawer = vi.fn();
      const closeDialog = vi.fn();
      render(
        <SideDrawer open modal={false} onClose={closeDrawer} title="Notes">
          <ModalShell open onClose={closeDialog} title="Partager">
            <button type="button">à qui</button>
          </ModalShell>
        </SideDrawer>,
      );
      const inner = screen.getByText("à qui");
      inner.focus();
      fireEvent.keyDown(inner, { key: "Escape" });
      expect(closeDialog).toHaveBeenCalledTimes(1);
      expect(closeDrawer).not.toHaveBeenCalled();
    });
  });
});
