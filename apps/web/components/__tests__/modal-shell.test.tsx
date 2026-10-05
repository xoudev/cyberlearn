// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModalShell } from "../modal-shell";

/**
 * The behaviour every pop-up shares, exercised once: Escape, the backdrop,
 * the scroll lock, where focus lands, Tab staying inside, and two dialogs one
 * over the other.
 */

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("ModalShell", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <ModalShell open={false} onClose={vi.fn()}>
        <p>contenu</p>
      </ModalShell>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("names itself after its title, or after the label it is given", () => {
    const { rerender } = render(
      <ModalShell open onClose={vi.fn()} title="Partager">
        <p>contenu</p>
      </ModalShell>,
    );
    expect(screen.getByRole("dialog", { name: "Partager" })).toBeTruthy();
    rerender(
      <ModalShell open onClose={vi.fn()} title="Partager" ariaLabel="Partager la note">
        <p>contenu</p>
      </ModalShell>,
    );
    expect(screen.getByRole("dialog", { name: "Partager la note" })).toBeTruthy();
    rerender(
      <ModalShell open onClose={vi.fn()} labelledBy="t">
        <h2 id="t">Suppression</h2>
      </ModalShell>,
    );
    expect(screen.getByRole("dialog", { name: "Suppression" })).toBeTruthy();
  });

  it("closes on Escape, on the backdrop and on its close button, not on a click inside", () => {
    const onClose = vi.fn();
    render(
      <ModalShell open onClose={onClose} title="Fenêtre">
        <button type="button">dedans</button>
      </ModalShell>,
    );
    fireEvent.click(screen.getByText("dedans"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("keeps Escape and the backdrop out of it when not dismissable", () => {
    const onClose = vi.fn();
    render(
      <ModalShell open onClose={onClose} title="Banni" dismissable={false}>
        <p>contenu</p>
      </ModalShell>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks the page behind it and gives it back", () => {
    const { unmount } = render(
      <ModalShell open onClose={vi.fn()} title="Fenêtre">
        <p>contenu</p>
      </ModalShell>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("focuses the close button, or the frame when there is none", () => {
    const { unmount } = render(
      <ModalShell open onClose={vi.fn()} title="Fenêtre">
        <p>contenu</p>
      </ModalShell>,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fermer" }));
    unmount();
    render(
      <ModalShell open onClose={vi.fn()} chrome="plain" ariaLabel="Niveau 3 atteint">
        <p>contenu</p>
      </ModalShell>,
    );
    expect(document.activeElement?.classList.contains("modal-shell__frame")).toBe(true);
  });

  it("draws the chrome it is asked for", () => {
    const { rerender, container } = render(
      <ModalShell
        open
        onClose={vi.fn()}
        eyebrow="Partager"
        title="La leçon"
        meta="maj hier"
        accent="#ff4757"
        actions={<button type="button">Envoyer</button>}
      >
        <p>contenu</p>
      </ModalShell>,
    );
    expect(screen.getByText("Partager").className).toBe("modal-shell__eyebrow");
    expect(screen.getByText("maj hier").className).toBe("modal-shell__meta");
    expect(screen.getByRole("button", { name: "Envoyer" }).parentElement?.className).toBe(
      "modal-shell__actions",
    );
    const frame = container.querySelector<HTMLElement>(".modal-shell__frame");
    expect(frame?.style.borderTop).toBe("3px solid rgb(255, 71, 87)");

    rerender(
      <ModalShell open onClose={vi.fn()} chrome="plain" actions={<button type="button">x</button>}>
        <p>contenu</p>
      </ModalShell>,
    );
    expect(screen.queryByRole("button", { name: "Fermer" })).toBeNull();
    expect(container.querySelector(".modal-shell__actions")).toBeNull();
    expect(container.querySelector(".modal-shell__frame")).toBeTruthy();

    rerender(
      <ModalShell open onClose={vi.fn()} chrome="none" ariaLabel="Ton Wrapped">
        <p>contenu</p>
      </ModalShell>,
    );
    expect(container.querySelector(".modal-shell__frame")).toBeNull();
    expect(screen.getByRole("dialog").className).toBe("modal-shell modal-shell--bare");
  });

  it("does not close on a click when there is no frame: the content is the whole thing", () => {
    const onClose = vi.fn();
    render(
      <ModalShell open onClose={onClose} chrome="none" ariaLabel="Ton Wrapped">
        <button type="button">suivant</button>
      </ModalShell>,
    );
    fireEvent.click(screen.getByText("suivant"));
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab inside, wrapping at both ends", () => {
    render(
      <ModalShell open onClose={vi.fn()} title="Fenêtre">
        <button type="button">premier</button>
        <button type="button">dernier</button>
      </ModalShell>,
    );
    const close = screen.getByRole("button", { name: "Fermer" });
    const last = screen.getByText("dernier");
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    document.body.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
  });

  it("hands the keyboard to the dialog on top, and back when it closes", () => {
    const closeReader = vi.fn();
    const closeShare = vi.fn();
    function Nested({ sharing }: { sharing: boolean }): React.JSX.Element {
      return (
        <>
          <ModalShell open onClose={closeReader} title="Note">
            <p>la note</p>
          </ModalShell>
          {sharing && (
            <ModalShell open onClose={closeShare} title="Partager">
              <p>à qui</p>
            </ModalShell>
          )}
        </>
      );
    }
    const { rerender } = render(<Nested sharing />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeShare).toHaveBeenCalledTimes(1);
    expect(closeReader).not.toHaveBeenCalled();

    rerender(<Nested sharing={false} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeReader).toHaveBeenCalledTimes(1);
    expect(closeShare).toHaveBeenCalledTimes(1);
  });

  it("reads the latest onClose without reopening: the dialog underneath stays underneath", () => {
    const first = vi.fn();
    const second = vi.fn();
    const closeShare = vi.fn();
    function Nested({ onClose }: { onClose: () => void }): React.JSX.Element {
      return (
        <>
          <ModalShell open onClose={onClose} title="Note">
            <p>la note</p>
          </ModalShell>
          <ModalShell open onClose={closeShare} title="Partager">
            <p>à qui</p>
          </ModalShell>
        </>
      );
    }
    const { rerender } = render(<Nested onClose={first} />);
    rerender(<Nested onClose={second} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeShare).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });
});
