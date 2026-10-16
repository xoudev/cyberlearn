import { describe, expect, it } from "vitest";
import type { TicketStatus, TicketTheme } from "@prisma/client";
import {
  CRITICAL_TICKET_WHERE,
  awaitsTeamReply,
  isCriticalTicket,
  needsTeam,
} from "../repositories/ticket.repository.js";

/**
 * What the console counts on a ticket, from one definition.
 *
 * A requester's reply changes no status, so "toujours bloqué" on a ticket in
 * progress used to change nothing in the console either. And the overview and
 * the tickets page disagreed on what a critical ticket was.
 */

const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

describe("awaitsTeamReply", () => {
  it("is true when the requester wrote last on a ticket in progress", () => {
    expect(awaitsTeamReply({ status: "IN_PROGRESS", lastMessageFromStaff: false })).toBe(true);
  });

  it("is false once the team has answered", () => {
    expect(awaitsTeamReply({ status: "IN_PROGRESS", lastMessageFromStaff: true })).toBe(false);
  });

  it("is false on a ticket with no reply in its thread yet", () => {
    expect(awaitsTeamReply({ status: "IN_PROGRESS", lastMessageFromStaff: null })).toBe(false);
  });

  it.each(["OPEN", "RESOLVED", "CLOSED"] as const)(
    "is false on a ticket %s, whoever wrote last",
    (status) => {
      // OPEN is already the team's to answer; a finished one takes no reply.
      expect(awaitsTeamReply({ status, lastMessageFromStaff: false })).toBe(false);
    },
  );
});

describe("needsTeam", () => {
  it("counts every new ticket, follow-up or not", () => {
    for (const lastMessageFromStaff of [null, false, true]) {
      expect(needsTeam({ status: "OPEN", lastMessageFromStaff })).toBe(true);
    }
  });

  it("counts a ticket in progress only when it was answered back", () => {
    expect(needsTeam({ status: "IN_PROGRESS", lastMessageFromStaff: false })).toBe(true);
    expect(needsTeam({ status: "IN_PROGRESS", lastMessageFromStaff: true })).toBe(false);
  });

  it.each(["RESOLVED", "CLOSED"] as const)("never counts a ticket %s", (status) => {
    expect(needsTeam({ status, lastMessageFromStaff: false })).toBe(false);
  });
});

describe("isCriticalTicket", () => {
  const critical = (status: TicketStatus, theme: TicketTheme): boolean =>
    isCriticalTicket({ status, theme });

  it("keeps a security report critical once it is taken in hand", () => {
    expect(critical("OPEN", "SECURITY")).toBe(true);
    expect(critical("IN_PROGRESS", "SECURITY")).toBe(true);
    expect(critical("IN_PROGRESS", "BUG")).toBe(true);
  });

  it("drops it once it is over, and never counts the other themes", () => {
    expect(critical("RESOLVED", "SECURITY")).toBe(false);
    expect(critical("CLOSED", "BUG")).toBe(false);
    expect(critical("OPEN", "QUESTION")).toBe(false);
  });

  it("is the rule the count's filter states", () => {
    const listed = (list: readonly string[], value: string): boolean => list.includes(value);
    for (const status of STATUSES) {
      for (const theme of ["BUG", "SECURITY", "QUESTION"] as const) {
        const filtered =
          listed(CRITICAL_TICKET_WHERE.status.in, status) &&
          listed(CRITICAL_TICKET_WHERE.theme.in, theme);
        expect(filtered, `${status} ${theme}`).toBe(critical(status, theme));
      }
    }
  });
});
