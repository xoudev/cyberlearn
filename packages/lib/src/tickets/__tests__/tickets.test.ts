import { describe, expect, it } from "vitest";
import {
  TICKET_FORM_THEMES,
  isTicketFormTheme,
  ticketConclusion,
  ticketDraftProblem,
  ticketReplyProblem,
} from "../tickets";

describe("TICKET_FORM_THEMES", () => {
  it("never offers an appeal: it is filed from the ban notice only", () => {
    expect(TICKET_FORM_THEMES.map((t) => t.value)).not.toContain("BAN_APPEAL");
    expect(isTicketFormTheme("BAN_APPEAL")).toBe(false);
    expect(isTicketFormTheme("BUG")).toBe(true);
  });
});

describe("ticketDraftProblem", () => {
  const ok = {
    theme: "BUG",
    subject: "Vidéo muette",
    message: "La vidéo de la leçon 3 n'a pas de son.",
  };

  it("accepts a complete request", () => {
    expect(ticketDraftProblem(ok)).toBeNull();
  });

  it("asks for a theme, and refuses one the form does not offer", () => {
    expect(ticketDraftProblem({ ...ok, theme: null })).toBe("Choisis un thème.");
    expect(ticketDraftProblem({ ...ok, theme: "BAN_APPEAL" })).toBe("Choisis un thème.");
  });

  it("holds the subject and the message to the server's limits, without margins", () => {
    expect(ticketDraftProblem({ ...ok, subject: "  Bug  " })).not.toBeNull();
    expect(ticketDraftProblem({ ...ok, subject: "x".repeat(201) })).not.toBeNull();
    expect(ticketDraftProblem({ ...ok, message: "Trop court." })).not.toBeNull();
    expect(ticketDraftProblem({ ...ok, message: "m".repeat(5001) })).not.toBeNull();
    expect(
      ticketDraftProblem({ ...ok, subject: "x".repeat(5), message: "m".repeat(20) }),
    ).toBeNull();
  });
});

describe("ticketReplyProblem", () => {
  it("uses the server's words for an empty reply", () => {
    expect(ticketReplyProblem(" ")).toBe("Écris un message avant d'envoyer.");
    expect(ticketReplyProblem("ok")).toBeNull();
    expect(ticketReplyProblem("m".repeat(5001))).not.toBeNull();
  });
});

describe("ticketConclusion", () => {
  const closedAt = "2026-06-18T10:00:00.000Z";

  it("dates a resolved ticket and points at the answer above", () => {
    expect(ticketConclusion({ status: "RESOLVED", closedAt, staffReplied: true })).toBe(
      "Cette demande a été marquée comme résolue le 18 juin 2026. La dernière réponse de l'équipe, ci-dessus, en donne la conclusion.",
    );
  });

  it("says so when the team closed it without writing", () => {
    expect(ticketConclusion({ status: "CLOSED", closedAt, staffReplied: false })).toBe(
      "Cette demande a été close le 18 juin 2026. L'équipe l'a fermée sans réponse écrite.",
    );
  });

  it("leaves the date out rather than inventing one", () => {
    expect(ticketConclusion({ status: "CLOSED", closedAt: null, staffReplied: false })).toMatch(
      /^Cette demande a été close\. /u,
    );
  });
});
