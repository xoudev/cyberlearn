// @vitest-environment jsdom
import React, { useRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSlashFocus } from "../use-slash-focus";

afterEach(cleanup);

function SearchPage({ disabled = false }: { disabled?: boolean }): React.ReactElement {
  const ref = useRef<HTMLInputElement | null>(null);
  useSlashFocus(ref);
  return (
    <div>
      <button type="button">Un bouton</button>
      <input aria-label="Recherche" ref={ref} defaultValue="sql" disabled={disabled} />
      <textarea aria-label="Note" />
      <div contentEditable suppressContentEditableWarning data-testid="editable">
        texte
      </div>
      <div role="dialog" aria-label="Fenêtre">
        <button type="button">Dans la fenêtre</button>
      </div>
      <button type="button" role="combobox" aria-expanded="true" aria-controls="none">
        Niveau
      </button>
    </div>
  );
}

function search(): HTMLInputElement {
  return screen.getByLabelText<HTMLInputElement>("Recherche");
}

describe("useSlashFocus", () => {
  it("puts the cursor in the search box, its text selected, on '/' from the page", () => {
    render(<SearchPage />);
    const button = screen.getByRole("button", { name: "Un bouton" });
    button.focus();
    const event = fireEvent.keyDown(button, { key: "/" });
    expect(document.activeElement).toBe(search());
    expect(search().selectionStart).toBe(0);
    expect(search().selectionEnd).toBe(3);
    // The "/" itself is not typed into the box it just focused.
    expect(event).toBe(false);
  });

  it("answers to '/' with Shift, as an AZERTY keyboard sends it", () => {
    render(<SearchPage />);
    fireEvent.keyDown(document.body, { key: "/", shiftKey: true });
    expect(document.activeElement).toBe(search());
  });

  it("leaves a '/' typed in another field as text", () => {
    render(<SearchPage />);
    const note = screen.getByLabelText("Note");
    note.focus();
    expect(fireEvent.keyDown(note, { key: "/" })).toBe(true);
    expect(document.activeElement).toBe(note);
  });

  it("leaves a '/' typed in editable text alone", () => {
    render(<SearchPage />);
    fireEvent.keyDown(screen.getByTestId("editable"), { key: "/" });
    expect(document.activeElement).not.toBe(search());
  });

  it("leaves a dialog and a dropdown their own keys", () => {
    render(<SearchPage />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Dans la fenêtre" }), { key: "/" });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "/" });
    expect(document.activeElement).not.toBe(search());
  });

  it("does nothing while a modal covers the page, wherever the focus is", () => {
    render(
      <>
        <SearchPage />
        <div role="dialog" aria-modal="true" aria-label="Note" />
      </>,
    );
    fireEvent.keyDown(document.body, { key: "/" });
    expect(document.activeElement).not.toBe(search());
  });

  it("does not take a chord, nor another key", () => {
    render(<SearchPage />);
    fireEvent.keyDown(document.body, { key: "/", ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "/", metaKey: true });
    fireEvent.keyDown(document.body, { key: "k" });
    expect(document.activeElement).not.toBe(search());
  });

  it("does nothing for a disabled box", () => {
    render(<SearchPage disabled />);
    fireEvent.keyDown(document.body, { key: "/" });
    expect(document.activeElement).not.toBe(search());
  });

  it("stops listening once the page is gone", () => {
    const { unmount } = render(<SearchPage />);
    unmount();
    expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(true);
  });
});
