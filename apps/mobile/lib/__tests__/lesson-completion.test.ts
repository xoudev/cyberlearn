import { describe, expect, it } from "vitest";
import { readCompletionReply } from "../lesson-completion";

/**
 * Finishing a lesson, as the result screen reads it. A lesson still locked in
 * its path can be opened from the Lessons tab, which lists every lesson: the
 * server refuses to complete it, and the screen has to say so rather than
 * announce a completion worth 0 XP.
 */

const RESULT = {
  alreadyCompleted: false,
  xpGained: 20,
  leveledUp: false,
  newLevel: 2,
  newBadges: [],
  quizScore: { correct: 2, total: 3 },
  refusal: null,
};

describe("readCompletionReply", () => {
  it("reads a completion on record, with its reward", () => {
    expect(readCompletionReply(200, { ok: true, result: RESULT })).toEqual({
      kind: "recorded",
      result: RESULT,
    });
  });

  it("reads a refusal as one, with the reason to show", () => {
    expect(
      readCompletionReply(409, {
        ok: false,
        error: "Termine d'abord la leçon précédente du parcours.",
      }),
    ).toEqual({ kind: "refused", message: "Termine d'abord la leçon précédente du parcours." });
  });

  it("leaves anything else to a new try: an error, a session gone, a body it cannot read", () => {
    expect(readCompletionReply(500, { ok: false, error: "Enregistrement impossible." })).toEqual({
      kind: "unsynced",
    });
    expect(readCompletionReply(401, { ok: false, error: "Non authentifié." })).toEqual({
      kind: "unsynced",
    });
    expect(readCompletionReply(409, { ok: false })).toEqual({ kind: "unsynced" });
    expect(readCompletionReply(200, { ok: true })).toEqual({ kind: "unsynced" });
    expect(readCompletionReply(200, null)).toEqual({ kind: "unsynced" });
  });
});
