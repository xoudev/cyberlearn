import { colors } from "@cyberlearn/tokens";
import { describe, expect, it } from "vitest";
import {
  deadlineLine,
  duelDay,
  duelMeta,
  duelWhen,
  invitationMeta,
  outcomeTone,
  type DuelSummary,
} from "../duels";

/**
 * A duel as the app writes it on the phone's clock: the small print, an
 * invitation's terms, the deadline, and the tones. The words they share with
 * the site are tested in @cyberlearn/lib/social/duel.
 */

const DUEL: DuelSummary = {
  id: "d1",
  status: "ACTIVE",
  pathTitle: "Linux",
  pathSlug: "linux",
  reader: { id: "me", name: "Moi", username: "moi" },
  other: { id: "alex", name: "Alex", username: "alex" },
  readerIsChallenger: true,
  questionCount: 2,
  readerScore: { answered: 1, correct: 1 },
  otherScore: { answered: 0, correct: 0 },
  winner: null,
  createdAt: "2026-10-08T10:00:00.000Z",
  expiresAt: "2026-10-09T10:00:00.000Z",
};

/** The site's formats, on the clock the test runs on, as the app's are. */
const WHEN = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

describe("duels in the app", () => {
  it("writes the dates the way the site does, on the phone's clock", () => {
    expect(duelWhen(DUEL.expiresAt)).toBe(WHEN.format(new Date(DUEL.expiresAt)));
    expect(duelDay(DUEL.createdAt)).toBe(DAY.format(new Date(DUEL.createdAt)));
  });

  it("writes a duel's small print and an invitation's terms", () => {
    expect(duelMeta(DUEL)).toBe("Répondu : toi 1 / 2, Alex 0 / 2");
    expect(duelMeta({ ...DUEL, status: "FINISHED", winner: "reader" })).toBe(
      `Lancé par toi · ${duelDay(DUEL.createdAt)}`,
    );
    expect(duelMeta({ ...DUEL, status: "PENDING" })).toBe(`Expire ${duelWhen(DUEL.expiresAt)}`);
    expect(invitationMeta(DUEL)).toBe(`2 questions · expire ${duelWhen(DUEL.expiresAt)}`);
    expect(invitationMeta({ ...DUEL, questionCount: 1 })).toMatch(/^1 question · expire /u);
  });

  it("says until when the duel waits, and nothing once it is over", () => {
    expect(deadlineLine({ ...DUEL, status: "PENDING" })).toBe(
      `À accepter d'ici ${duelWhen(DUEL.expiresAt)}`,
    );
    expect(deadlineLine(DUEL)).toBe(`À jouer d'ici ${duelWhen(DUEL.expiresAt)}`);
    expect(deadlineLine({ ...DUEL, status: "EXPIRED" })).toBeNull();
  });

  it("draws an outcome in the site's tones, a duel going on in the reader's accent", () => {
    expect(outcomeTone("win", "#123456")).toBe(colors.success);
    expect(outcomeTone("loss", "#123456")).toBe(colors.danger);
    expect(outcomeTone("live", "#123456")).toBe("#123456");
    expect(outcomeTone("wait", "#123456")).toBe(colors.warning);
    expect(outcomeTone("expired", "#123456")).toBe(colors.textMuted);
  });
});
