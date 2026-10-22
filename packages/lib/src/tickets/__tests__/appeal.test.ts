import { describe, expect, it } from "vitest";
import {
  appealStageOf,
  appealView,
  isBanAppeal,
  ticketReplyEmailWanted,
  type AppealReply,
} from "../appeal";
import type { TicketStatusKey, TicketThemeKey } from "../tickets";

const REPLY: AppealReply = {
  body: "Après relecture, le bannissement est maintenu.",
  createdAt: "2026-10-20T09:30:00.000Z",
};

describe("ticketReplyEmailWanted", () => {
  it("always writes to somebody contesting a ban, whatever they chose", () => {
    // They cannot open the bell or the ticket's page until the ban is over.
    expect(ticketReplyEmailWanted({ theme: "BAN_APPEAL", emailNotifications: false })).toBe(true);
    expect(ticketReplyEmailWanted({ theme: "BAN_APPEAL", emailNotifications: true })).toBe(true);
    expect(ticketReplyEmailWanted({ theme: "BAN_APPEAL", emailNotifications: null })).toBe(true);
  });

  it("keeps the choice on every other ticket, whose reply is also on its page", () => {
    const themes: TicketThemeKey[] = [
      "BUG",
      "QUESTION",
      "FEATURE_REQUEST",
      "SECURITY",
      "CONTENT_ERROR",
      "ESTABLISHMENT_REQUEST",
      "OTHER",
    ];
    for (const theme of themes) {
      expect(ticketReplyEmailWanted({ theme, emailNotifications: false })).toBe(false);
      expect(ticketReplyEmailWanted({ theme, emailNotifications: true })).toBe(true);
    }
  });

  it("writes to a guest or an account with no preferences row", () => {
    expect(ticketReplyEmailWanted({ theme: "QUESTION", emailNotifications: null })).toBe(true);
  });
});

describe("isBanAppeal", () => {
  it("recognises the appeal theme and nothing else", () => {
    expect(isBanAppeal("BAN_APPEAL")).toBe(true);
    expect(isBanAppeal("OTHER")).toBe(false);
  });
});

describe("appealStageOf", () => {
  it.each<[TicketStatusKey, string]>([
    ["OPEN", "RECEIVED"],
    ["IN_PROGRESS", "IN_REVIEW"],
    ["RESOLVED", "DECIDED"],
    ["CLOSED", "DECIDED"],
  ])("puts %s at %s", (status, stage) => {
    expect(appealStageOf(status)).toBe(stage);
  });
});

describe("appealView", () => {
  it("says an appeal nobody has touched is received, and where the answer will be", () => {
    const view = appealView({ status: "OPEN", reply: null });
    expect(view).toMatchObject({ stage: "RECEIVED", title: "Appel transmis", reply: null });
    expect(view.text).toMatch(/arrivera par e-mail et s'affichera ici/u);
  });

  it("shows the team's answer while the appeal is still being examined", () => {
    const view = appealView({ status: "IN_PROGRESS", reply: REPLY });
    expect(view.stage).toBe("IN_REVIEW");
    expect(view.reply).toEqual(REPLY);
    expect(view.text).toMatch(/t'a répondu ci-dessous/u);
  });

  it("does not point at an answer that was not written on an appeal taken in hand", () => {
    const view = appealView({ status: "IN_PROGRESS", reply: null });
    expect(view.text).toMatch(/pris ton appel en charge/u);
    expect(view.text).not.toMatch(/ci-dessous/u);
  });

  it.each<TicketStatusKey>(["RESOLVED", "CLOSED"])(
    "stops saying the answer is on its way once the appeal is %s",
    (status) => {
      const view = appealView({ status, reply: REPLY });
      expect(view.stage).toBe("DECIDED");
      expect(view.title).toBe("Appel examiné");
      expect(view.text).toMatch(/le bannissement est maintenu/u);
      expect(view.text).not.toMatch(/arrivera/u);
      expect(view.reply).toEqual(REPLY);
    },
  );

  it("says so when a finished appeal was closed without a written answer", () => {
    const view = appealView({ status: "CLOSED", reply: null });
    expect(view.text).toMatch(/pas laissé de réponse écrite/u);
    expect(view.reply).toBeNull();
  });
});
