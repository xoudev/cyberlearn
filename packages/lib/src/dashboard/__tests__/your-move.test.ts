import { describe, expect, it } from "vitest";
import { receivedInvitations, runningTournaments } from "../your-move";

const NOW = new Date("2026-10-17T12:00:00Z");

function duel(
  id: string,
  over: Partial<{ status: string; readerIsChallenger: boolean; expiresAt: string }> = {},
) {
  return {
    id,
    status: "PENDING",
    readerIsChallenger: false,
    expiresAt: "2026-10-18T09:00:00Z",
    ...over,
  };
}

describe("receivedInvitations", () => {
  it("keeps the pending duels a friend sent, the one lapsing first first", () => {
    const list = receivedInvitations(
      [
        duel("late", { expiresAt: "2026-10-18T11:00:00Z" }),
        duel("soon", { expiresAt: "2026-10-17T15:00:00Z" }),
      ],
      NOW,
    );
    expect(list.map((d) => d.id)).toEqual(["soon", "late"]);
  });

  it("leaves out what the reader sent, and what is no longer pending", () => {
    const list = receivedInvitations(
      [
        duel("sent", { readerIsChallenger: true }),
        duel("playing", { status: "ACTIVE" }),
        duel("declined", { status: "DECLINED" }),
        duel("mine"),
      ],
      NOW,
    );
    expect(list.map((d) => d.id)).toEqual(["mine"]);
  });

  it("leaves out an invitation past its time, not yet settled", () => {
    expect(
      receivedInvitations([duel("lapsed", { expiresAt: "2026-10-17T12:00:00Z" })], NOW),
    ).toEqual([]);
  });
});

describe("runningTournaments", () => {
  it("keeps the tournaments under way, the one closing first first", () => {
    const list = runningTournaments([
      { id: "a", phase: "RUNNING" as const, endsAt: "2026-10-20T18:00:00Z" },
      { id: "b", phase: "UPCOMING" as const, endsAt: "2026-10-19T18:00:00Z" },
      { id: "c", phase: "RUNNING" as const, endsAt: "2026-10-17T18:00:00Z" },
      { id: "d", phase: "FINISHED" as const, endsAt: "2026-10-16T18:00:00Z" },
    ]);
    expect(list.map((t) => t.id)).toEqual(["c", "a"]);
  });
});
