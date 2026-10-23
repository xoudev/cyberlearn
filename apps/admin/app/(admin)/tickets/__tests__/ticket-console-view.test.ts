import { describe, expect, it } from "vitest";
import { describeAppealedBan, describeBanAppeal, type AppealedBan } from "../appealed-ban";
import { adminName, ASSIGNMENT_FACET_OPTIONS, assignmentOf } from "../ticket-meta";

/**
 * What the console's ticket screens say about a ticket beyond its thread:
 * whose it is, and the ban an appeal contests.
 */

const ME = "11111111-1111-4111-8111-111111111111";
const COLLEAGUE = "22222222-2222-4222-8222-222222222222";

describe("assignmentOf", () => {
  it("reads a ticket from where the viewer sits", () => {
    expect(assignmentOf(ME, ME)).toBe("MINE");
    expect(assignmentOf(null, ME)).toBe("UNASSIGNED");
    expect(assignmentOf(COLLEAGUE, ME)).toBe("OTHERS");
  });

  it("offers « À moi » and « Non assigné », and leaves a colleague's ticket out of both", () => {
    const offered: string[] = ASSIGNMENT_FACET_OPTIONS.map((option) => option.value);
    expect(offered).toEqual(["MINE", "UNASSIGNED"]);
    expect(offered).not.toContain(assignmentOf(COLLEAGUE, ME));
  });
});

describe("adminName", () => {
  it("names an administrator by display name, then by handle", () => {
    expect(adminName({ displayName: "Camille", username: "camille" })).toBe("Camille");
    expect(adminName({ displayName: "  ", username: "camille" })).toBe("@camille");
    expect(adminName({ displayName: "", username: null })).toBe("Administrateur");
  });
});

describe("describeAppealedBan", () => {
  const NOW = new Date("2026-10-17T12:00:00.000Z");
  const stamp = (date: Date): string => date.toISOString().slice(0, 10);
  const ban = (over: Partial<AppealedBan> = {}): AppealedBan => ({
    userId: COLLEAGUE,
    reason: "Propos injurieux répétés dans le forum.",
    expiresAt: new Date("2026-10-20T12:00:00.000Z"),
    createdAt: new Date("2026-10-13T12:00:00.000Z"),
    liftedAt: null,
    liftReason: null,
    issuedBy: { displayName: "Camille" },
    liftedBy: null,
    ...over,
  });

  it("says how long is left on a ban in force, in the words the person read", () => {
    const view = describeAppealedBan(ban(), NOW, stamp);
    expect(view).toMatchObject({
      state: "ACTIVE",
      stateLabel: "En cours",
      tone: "danger",
      userId: COLLEAGUE,
      issued: "2026-10-13 · Camille",
      duration: "Il reste 3 jours.",
      lifted: null,
    });
  });

  it("calls a permanent ban in force permanent", () => {
    const view = describeAppealedBan(ban({ expiresAt: null }), NOW, stamp);
    expect(view.state).toBe("ACTIVE");
    expect(view.duration).toBe("Ce bannissement est définitif.");
  });

  it("says when a ban ran its course", () => {
    const view = describeAppealedBan(
      ban({ expiresAt: new Date("2026-10-15T12:00:00.000Z") }),
      NOW,
      stamp,
    );
    expect(view).toMatchObject({
      state: "EXPIRED",
      stateLabel: "Expiré",
      duration: "Terminé le 2026-10-15",
      lifted: null,
    });
  });

  it("says who lifted a ban, when and why, and what had been decided", () => {
    const view = describeAppealedBan(
      ban({
        liftedAt: new Date("2026-10-16T09:00:00.000Z"),
        liftedBy: { displayName: "Sacha" },
        liftReason: "Appel accepté : faux positif",
      }),
      NOW,
      stamp,
    );
    expect(view).toMatchObject({
      state: "LIFTED",
      stateLabel: "Levé",
      tone: "accent",
      duration: "Prévu jusqu'au 2026-10-20",
      lifted: { on: "2026-10-16 · Sacha", reason: "Appel accepté : faux positif" },
    });
  });

  it("keeps a lifted permanent ban lifted, with no reason when none was given", () => {
    const view = describeAppealedBan(
      ban({ expiresAt: null, liftedAt: NOW, liftReason: "  " }),
      NOW,
      stamp,
    );
    expect(view.duration).toBe("Prévu définitif");
    expect(view.lifted).toEqual({ on: "2026-10-17", reason: null });
  });

  it("names nobody for a decision whose author's account is gone", () => {
    expect(describeAppealedBan(ban({ issuedBy: null }), NOW, stamp).issued).toBe("2026-10-13");
  });
});

describe("describeBanAppeal", () => {
  it("says an appeal is open while its ticket waits for an answer", () => {
    expect(describeBanAppeal({ status: "OPEN", open: true })).toEqual({
      label: "Un appel est ouvert · lire",
      tone: "warning",
    });
    expect(describeBanAppeal({ status: "IN_PROGRESS", open: true }).tone).toBe("warning");
  });

  it("says an answered appeal is answered, whatever the ban became", () => {
    // A refused appeal is answered and its ticket closed; the ban stays in
    // force, with the link to the ticket.
    expect(describeBanAppeal({ status: "RESOLVED", open: false })).toEqual({
      label: "Appel traité (résolu) · lire",
      tone: "neutral",
    });
    expect(describeBanAppeal({ status: "CLOSED", open: false })).toEqual({
      label: "Appel traité (fermé) · lire",
      tone: "neutral",
    });
  });

  it("only says an appeal was filed when the ticket is not known", () => {
    expect(describeBanAppeal(null)).toEqual({
      label: "Un appel a été déposé · lire",
      tone: "neutral",
    });
  });

  it("never calls an answered appeal open", () => {
    for (const status of ["RESOLVED", "CLOSED"]) {
      expect(describeBanAppeal({ status, open: false }).label).not.toContain("ouvert");
    }
  });
});
