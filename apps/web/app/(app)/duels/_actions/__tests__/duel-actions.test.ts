/**
 * respondToDuelAction refreshes the shared layout once the answer is recorded,
 * so the count of pending invitations next to « Duels » in the sidebar drops
 * even though the reader lands on the duel by a soft navigation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const ALICE = "22222222-2222-4222-8222-222222222222";
const DUEL = "44444444-4444-4444-8444-444444444444";

const { respondToDuel, revalidatePath } = vi.hoisted(() => ({
  respondToDuel: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: () => Promise.resolve({ id: ALICE }) }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/social/duels", () => ({
  answerDuel: vi.fn(),
  createDuel: vi.fn(),
  duelSetupFor: vi.fn(),
  duelViewFor: vi.fn(),
  respondToDuel,
}));

import { respondToDuelAction } from "../duel-actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("respondToDuelAction", () => {
  it("refreshes the layout after an accepted invitation", async () => {
    respondToDuel.mockResolvedValue({ ok: true });
    await expect(respondToDuelAction(DUEL, true)).resolves.toEqual({ ok: true });
    expect(respondToDuel).toHaveBeenCalledWith(ALICE, DUEL, true);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("refreshes the layout after a declined invitation", async () => {
    respondToDuel.mockResolvedValue({ ok: true });
    await respondToDuelAction(DUEL, false);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("leaves the layout alone when the answer is refused", async () => {
    const refused = { ok: false, error: "Ce duel n'attend plus de réponse." };
    respondToDuel.mockResolvedValue(refused);
    await expect(respondToDuelAction(DUEL, true)).resolves.toEqual(refused);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
