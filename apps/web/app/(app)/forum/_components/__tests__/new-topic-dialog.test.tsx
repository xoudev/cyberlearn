// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Nouveau sujet" on a section: the composer in a window over the list, its
 * draft kept while it is closed, and the new thread opened in place of it.
 */

const m = vi.hoisted(() => ({
  value: null as string | null,
  open: vi.fn<(value?: string) => void>(),
  close: vi.fn<() => void>(),
  replace: vi.fn<(href: string) => void>(),
  createTopicAction:
    vi.fn<
      (input: { categorySlug: string; title: string; content: string }) => Promise<{
        ok: boolean;
        error?: string;
        href?: string;
      }>
    >(),
}));

// The hook and the host are covered once (query-dialog-host.test.tsx): here,
// the address says open or closed through `m.value`.
vi.mock("@/hooks/use-query-dialog", () => ({
  useQueryDialog: (key: string) => ({
    value: key === "compose" ? m.value : null,
    open: m.open,
    close: m.close,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace }) }));
vi.mock("../../_actions/forum-actions", () => ({ createTopicAction: m.createTopicAction }));

const { NewTopicDialog } = await import("../new-topic-dialog");

function Section(): React.JSX.Element {
  return <NewTopicDialog categorySlug="reseau" categoryName="Réseau" />;
}

function write(title: string, content: string): void {
  fireEvent.change(screen.getByPlaceholderText("Ta question dans Réseau"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByPlaceholderText(/Explique le contexte/), {
    target: { value: content },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.value = null;
});

afterEach(cleanup);

describe("NewTopicDialog", () => {
  it("is a button while closed, which opens the composer by its parameter", () => {
    render(<Section />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Nouveau sujet" }));
    expect(m.open).toHaveBeenCalledTimes(1);
  });

  it("draws the composer for its section when the address asks for it", () => {
    m.value = "1";
    render(<Section />);
    const dialog = screen.getByRole("dialog", { name: "Nouveau sujet" });
    expect(dialog.textContent).toContain("Réseau");
    expect(screen.getByPlaceholderText("Ta question dans Réseau")).toBeTruthy();
  });

  it("publishes in its section and opens the thread in the window's place", async () => {
    m.value = "1";
    m.createTopicAction.mockResolvedValue({ ok: true, href: "/forum/reseau/mon-sujet" });
    render(<Section />);
    write("Masque de sous-réseau", "Comment calculer un /26 ?");
    fireEvent.click(screen.getByRole("button", { name: "Publier le sujet" }));

    await vi.waitFor(() => {
      expect(m.replace).toHaveBeenCalledWith("/forum/reseau/mon-sujet");
    });
    expect(m.createTopicAction).toHaveBeenCalledWith({
      categorySlug: "reseau",
      title: "Masque de sous-réseau",
      content: "Comment calculer un /26 ?",
    });
  });

  it("says why the server refused, and stays open", async () => {
    m.value = "1";
    m.createTopicAction.mockResolvedValue({ ok: false, error: "Cette section n'existe pas." });
    render(<Section />);
    write("Masque de sous-réseau", "Comment calculer un /26 ?");
    fireEvent.click(screen.getByRole("button", { name: "Publier le sujet" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Cette section n'existe pas.");
    expect(m.replace).not.toHaveBeenCalled();
  });

  it("says so when the call itself fails", async () => {
    m.value = "1";
    m.createTopicAction.mockRejectedValue(new Error("network"));
    render(<Section />);
    write("Masque de sous-réseau", "Comment calculer un /26 ?");
    fireEvent.click(screen.getByRole("button", { name: "Publier le sujet" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Publication impossible.");
  });

  it("closes on Escape and keeps what was written for when it opens again", () => {
    m.value = "1";
    const { rerender } = render(<Section />);
    fireEvent.change(screen.getByPlaceholderText("Ta question dans Réseau"), {
      target: { value: "Un brouillon" },
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(m.close).toHaveBeenCalledTimes(1);

    m.value = null;
    rerender(<Section />);
    expect(screen.queryByRole("dialog")).toBeNull();
    m.value = "1";
    rerender(<Section />);
    expect(screen.getByPlaceholderText<HTMLInputElement>("Ta question dans Réseau").value).toBe(
      "Un brouillon",
    );
  });
});
