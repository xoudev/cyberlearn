// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SerializedFolder, SerializedIncomingNote, SerializedNote } from "../notes-shared";

/** The right-click menu reaches the same actions as the buttons it stands in for. */

const moveNoteAction = vi.fn();
const recolorFolderAction = vi.fn();
vi.mock("../../_actions/folder-actions", () => ({
  createFolderAction: vi.fn(),
  deleteFolderAction: vi.fn(),
  moveNoteAction: (...args: unknown[]) => moveNoteAction(...args) as unknown,
  recolorFolderAction: (...args: unknown[]) => recolorFolderAction(...args) as unknown,
  reiconFolderAction: vi.fn(),
  renameFolderAction: vi.fn(),
}));
const saveNoteAction = vi.fn();
vi.mock("../../_actions/note-actions", () => ({
  saveNoteAction: (...args: unknown[]) => saveNoteAction(...args) as unknown,
}));
const dismissSharedNoteAction = vi.fn();
vi.mock("../../_actions/share-actions", () => ({
  dismissSharedNoteAction: (...args: unknown[]) => dismissSharedNoteAction(...args) as unknown,
  reportSharedNoteAction: vi.fn(),
  loadShareAudienceAction: vi.fn(() => new Promise(() => undefined)),
  shareNoteAction: vi.fn(),
  unshareNoteAction: vi.fn(),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { NotesLibrary } = await import("../notes-library");

const FOLDER: SerializedFolder = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Réseau",
  color: null,
  icon: null,
  position: 0,
};

const NOTE: SerializedNote = {
  id: "22222222-2222-4222-8222-222222222222",
  lessonId: "33333333-3333-4333-8333-333333333333",
  lessonSlug: "les-variables",
  lessonTitle: "Les variables",
  lessonCategory: "DEV",
  pathSlug: null,
  pathTitle: null,
  folderId: null,
  content: "Une variable nomme une valeur.",
  wordCount: 5,
  updatedAt: "2026-09-20T10:00:00.000Z",
};

const RECEIVED: SerializedIncomingNote = {
  ...NOTE,
  id: "44444444-4444-4444-8444-444444444444",
  lessonTitle: "Le chiffrement",
  authorName: "camille",
  sharedAt: "2026-09-21T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  moveNoteAction.mockResolvedValue({ ok: true });
  recolorFolderAction.mockResolvedValue({ ok: true });
  saveNoteAction.mockResolvedValue({ ok: true, wordCount: 0 });
  dismissSharedNoteAction.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
});

function renderLibrary(): void {
  render(<NotesLibrary notes={[NOTE]} folders={[FOLDER]} incoming={[RECEIVED]} />);
}

function rightClick(element: Element): void {
  fireEvent.contextMenu(element, { clientX: 200, clientY: 200 });
}

describe("NotesLibrary right-click menu", () => {
  it("moves a note to a folder", async () => {
    renderLibrary();
    rightClick(screen.getByText("Les variables"));
    expect(screen.getByRole("menu", { name: "Note : Les variables" })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Réseau" }));
      await Promise.resolve();
    });
    expect(moveNoteAction).toHaveBeenCalledWith({ noteId: NOTE.id, folderId: FOLDER.id });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the reader straight into editing", () => {
    renderLibrary();
    rightClick(screen.getByText("Les variables"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Modifier" }));
    expect(screen.getByRole("dialog", { name: "Note : Les variables" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeTruthy();
  });

  it("deletes a note by saving it empty, once confirmed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderLibrary();
    rightClick(screen.getByText("Les variables"));
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "Supprimer la note" }));
      await Promise.resolve();
    });
    expect(confirm).toHaveBeenCalled();
    expect(saveNoteAction).toHaveBeenCalledWith({ lessonId: NOTE.lessonId, content: "" });
    expect(screen.queryByText("Les variables")).toBeNull();
    confirm.mockRestore();
  });

  it("keeps the note when the deletion is not confirmed", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderLibrary();
    rightClick(screen.getByText("Les variables"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Supprimer la note" }));
    expect(saveNoteAction).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("offers a received note no editing, sharing or filing", () => {
    renderLibrary();
    rightClick(screen.getByText("Le chiffrement"));
    expect(screen.getByRole("menu", { name: "Note reçue : Le chiffrement" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Modifier" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Partager…" })).toBeNull();
    expect(screen.queryByText("Déplacer vers")).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Signaler…" })).toBeTruthy();
  });

  it("recolours a folder", async () => {
    renderLibrary();
    rightClick(screen.getByRole("button", { name: "Ouvrir le dossier Réseau" }));
    const swatches = screen.getAllByRole("menuitemradio");
    const first = swatches[0];
    if (!first) throw new Error("no colour offered");
    await act(async () => {
      fireEvent.click(first);
      await Promise.resolve();
    });
    expect(recolorFolderAction).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: FOLDER.id }),
    );
  });

  it("leaves the search field to the browser", () => {
    renderLibrary();
    const search = screen.getByRole("searchbox", { name: "Chercher dans mes notes" });
    rightClick(search);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
