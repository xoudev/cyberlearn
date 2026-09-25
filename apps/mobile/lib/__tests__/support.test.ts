import { describe, expect, it } from "vitest";
import { closedNotice, speakerLine, ticketListMeta } from "../support";

describe("ticketListMeta", () => {
  const ticket = {
    id: "t",
    subject: "Vidéo muette",
    theme: "BUG" as const,
    status: "OPEN" as const,
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    replies: 0,
  };

  it("says the theme and the day, and the replies once there are some", () => {
    expect(ticketListMeta(ticket)).toBe("Bug · envoyée le 20 septembre");
    expect(ticketListMeta({ ...ticket, replies: 1 })).toBe(
      "Bug · envoyée le 20 septembre · 1 réponse",
    );
    expect(ticketListMeta({ ...ticket, theme: "ESTABLISHMENT_REQUEST", replies: 3 })).toBe(
      "Ajout d'un établissement · envoyée le 20 septembre · 3 réponses",
    );
  });
});

describe("speakerLine", () => {
  const at = "2026-09-21T08:00:00.000Z";

  it("names the team member, or the team, and calls the requester Toi", () => {
    expect(speakerLine({ fromStaff: true, authorName: "Camille", createdAt: at })).toMatch(
      /^Camille · /u,
    );
    expect(speakerLine({ fromStaff: true, authorName: null, createdAt: at })).toMatch(
      /^Équipe CyberLearn · /u,
    );
    expect(speakerLine({ fromStaff: false, authorName: "Alex", createdAt: at })).toMatch(
      /^Toi · /u,
    );
  });
});

describe("closedNotice", () => {
  it("says resolved or closed, and what to do next", () => {
    expect(closedNotice("RESOLVED")).toBe(
      "Cette demande est résolue. Si le problème revient, ouvre-en une nouvelle.",
    );
    expect(closedNotice("CLOSED")).toMatch(/^Cette demande est close\./u);
  });
});
