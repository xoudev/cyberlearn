/**
 * The "Garder mon compte" button: a link that holds keeps the account, any
 * other lands on the same page with the other message, and a malformed one
 * never reaches the database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockKeep, mockRedirect } = vi.hoisted(() => ({
  mockKeep: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

vi.mock("@cyberlearn/db", () => ({ keepAccountByToken: mockKeep }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

import { hashKeepToken, newKeepToken } from "@/lib/rgpd/keep-token";
import { keepAccountAction } from "../actions";

function form(token?: string): FormData {
  const fd = new FormData();
  if (token !== undefined) fd.set("token", token);
  return fd;
}

beforeEach(() => vi.clearAllMocks());

describe("keepAccountAction", () => {
  it("keeps the account the link belongs to", async () => {
    const token = newKeepToken();
    mockKeep.mockResolvedValue("user-id");

    await expect(keepAccountAction(form(token))).rejects.toThrow(
      "REDIRECT /account/keep/done?kept=1",
    );
    expect(mockKeep).toHaveBeenCalledWith(hashKeepToken(token), expect.any(Date));
  });

  it("says so when the link no longer holds", async () => {
    mockKeep.mockResolvedValue(null);
    await expect(keepAccountAction(form(newKeepToken()))).rejects.toThrow(
      "REDIRECT /account/keep/done?kept=0",
    );
  });

  it.each([undefined, "", "trop-court", `${newKeepToken()}x`, "a".repeat(42) + "!"])(
    "never asks the database about %j",
    async (token) => {
      await expect(keepAccountAction(form(token))).rejects.toThrow(
        "REDIRECT /account/keep/done?kept=0",
      );
      expect(mockKeep).not.toHaveBeenCalled();
    },
  );
});
