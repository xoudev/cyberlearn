import { describe, expect, it } from "vitest";
import {
  TICKET_FORM_THEMES,
  isTicketFormTheme,
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
