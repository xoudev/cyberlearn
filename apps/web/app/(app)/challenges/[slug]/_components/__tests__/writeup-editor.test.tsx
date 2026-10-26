// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../_actions/writeup-actions", () => ({
  publishWriteupAction: vi.fn(),
  deleteWriteupAction: vi.fn(),
}));

const { WriteupEditor } = await import("../writeup-editor");
const { publishWriteupAction, deleteWriteupAction } = await import(
  "../../_actions/writeup-actions"
);

/**
 * The reader's own solution, as the editor presents it once nobody else sees
 * it: waiting for the screen's review, or hidden by a moderator, which is not
 * the same thing and is not worded the same way.
 */

const CHALLENGE = "11111111-1111-4111-8111-111111111111";

afterEach(cleanup);

describe("WriteupEditor", () => {
  it("says a held solution waits for a review, and lets it be updated", () => {
    render(
      <WriteupEditor
        challengeId={CHALLENGE}
        initial={{ content: "Ma solution.", isHidden: true, hiddenByModeration: false }}
      />,
    );
    expect(screen.getByText(/attend une relecture/u)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mettre à jour" })).toHaveProperty("disabled", false);
  });

  it("says a moderator hid it, and leaves only removing it", () => {
    render(
      <WriteupEditor
        challengeId={CHALLENGE}
        initial={{ content: "Ma solution.", isHidden: true, hiddenByModeration: true }}
      />,
    );
    expect(screen.getByText(/masquée par la modération/u)).toBeTruthy();
    expect(screen.queryByText(/attend une relecture/u)).toBeNull();
    expect(screen.getByRole("button", { name: "Mettre à jour" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("textbox")).toHaveProperty("readOnly", true);
    expect(screen.getByRole("button", { name: "Retirer" })).toHaveProperty("disabled", false);
  });

  it("says the solution was not sent, and keeps the text, when the call fails", async () => {
    vi.mocked(publishWriteupAction).mockRejectedValueOnce(new Error("network"));
    render(<WriteupEditor challengeId={CHALLENGE} initial={null} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "nmap puis netcat." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publier ma solution" }));
      await Promise.resolve();
    });
    expect(await screen.findByText("Solution non envoyée, réessaie.")).toBeTruthy();
    expect(screen.getByRole("textbox")).toHaveProperty("value", "nmap puis netcat.");
  });

  it("says the solution was not removed when that call fails", async () => {
    vi.mocked(deleteWriteupAction).mockRejectedValueOnce(new Error("network"));
    render(
      <WriteupEditor
        challengeId={CHALLENGE}
        initial={{ content: "Ma solution.", isHidden: false, hiddenByModeration: false }}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
      await Promise.resolve();
    });
    expect(await screen.findByText("Solution non retirée, réessaie.")).toBeTruthy();
    expect(screen.getByRole("textbox")).toHaveProperty("value", "Ma solution.");
  });
});
