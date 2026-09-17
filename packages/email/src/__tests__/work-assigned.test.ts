/**
 * Tests for WorkAssignedEmail.
 *
 * The claim this template makes is that a learner who reads nothing but this
 * e-mail knows what to do and by when. So the assertions are about what is
 * present in the rendered HTML rather than about how it looks: the title, the
 * deadline, the class, who set it, and a link that goes to the work itself
 * rather than to a dashboard the reader then has to search.
 */

import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { WorkAssignedEmail } from "../templates/work-assigned.js";

const BASE = {
  displayName: "Jordan",
  kind: "lesson" as const,
  workTitle: "Les injections SQL, en pratique",
  className: "2A SIO",
  teacherName: "Marie Delcourt",
  dueLabel: "24 septembre 2026",
  instructions: "Faire les exercices 1 à 4.",
  workUrl: "https://cyberlearn.fr/lessons/injections-sql",
  siteUrl: "https://cyberlearn.fr",
};

describe("WorkAssignedEmail - rendered HTML", () => {
  it("names the work, the class and who set it", async () => {
    const html = await render(WorkAssignedEmail(BASE));
    expect(html).toContain("Les injections SQL, en pratique");
    expect(html).toContain("2A SIO");
    expect(html).toContain("Marie Delcourt");
    expect(html).toContain("Jordan");
  });

  it("carries the deadline, which is the line that can be missed", async () => {
    const html = await render(WorkAssignedEmail(BASE));
    expect(html).toContain("24 septembre 2026");
    expect(html).toContain("À rendre avant le");
  });

  it("says so plainly when there is no deadline, rather than leaving a gap", async () => {
    const html = await render(WorkAssignedEmail({ ...BASE, dueLabel: null }));
    expect(html).toContain("Sans date limite");
    expect(html).not.toContain("À rendre avant le");
  });

  it("carries the teacher's instructions when there are any", async () => {
    const html = await render(WorkAssignedEmail(BASE));
    expect(html).toContain("Faire les exercices 1 à 4.");
  });

  it("drops the instructions line entirely when there are none", async () => {
    const html = await render(WorkAssignedEmail({ ...BASE, instructions: null }));
    expect(html).not.toContain("Faire les exercices");
  });

  it("links to the work itself, not to a page the reader has to search", async () => {
    const html = await render(WorkAssignedEmail(BASE));
    expect(html).toContain("https://cyberlearn.fr/lessons/injections-sql");
  });

  it("changes its nouns for a path without changing anything else", async () => {
    const html = await render(
      WorkAssignedEmail({
        ...BASE,
        kind: "path",
        workTitle: "Le réseau, du câble au paquet",
        workUrl: "https://cyberlearn.fr/paths/le-reseau",
      }),
    );
    expect(html).toContain("Un parcours t&#x27;attend");
    expect(html).toContain("Ouvrir le parcours");
    expect(html).not.toContain("Ouvrir la leçon");
    expect(html).toContain("Le réseau, du câble au paquet");
  });

  it("always offers the way out of these e-mails", async () => {
    // An unsolicited e-mail is the thing people object to, so the switch that
    // stops them is in every one of them.
    const html = await render(WorkAssignedEmail(BASE));
    expect(html).toContain("https://cyberlearn.fr/settings/notifications");
  });
});
