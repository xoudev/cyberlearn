// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../_actions/writeup-actions", () => ({
  publishWriteupAction: vi.fn(),
  deleteWriteupAction: vi.fn(),
}));

const { WriteupEditor } = await import("../writeup-editor");

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
});
