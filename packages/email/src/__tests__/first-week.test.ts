import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { FirstWeekEmail, firstWeekSubject } from "../templates/first-week";

/** The first week's three e-mails: what each says, and that no two subjects match. */

const SITE = "https://cyberlearn.fr";
const LESSON = {
  title: "Introduction aux injections SQL",
  minutes: 30,
  xp: 100,
  url: `${SITE}/lessons/introduction-injections-sql`,
};

describe("firstWeekSubject", () => {
  it("names the lesson of days 1 and 3, and the week's count on day 7", () => {
    expect(firstWeekSubject("FIRST_MISSION", LESSON)).toBe(
      "Ta première mission : Introduction aux injections SQL",
    );
    expect(firstWeekSubject("COME_BACK", LESSON)).toBe(
      "Ta prochaine mission : Introduction aux injections SQL",
    );
    expect(firstWeekSubject("FIRST_WEEK", LESSON, { lessons: 1, xp: 100, streakDays: 1 })).toBe(
      "Ta première semaine sur CyberLearn : 1 leçon terminée",
    );
    expect(firstWeekSubject("FIRST_WEEK", LESSON, { lessons: 3, xp: 320, streakDays: 0 })).toBe(
      "Ta première semaine sur CyberLearn : 3 leçons terminées",
    );
  });

  it("gives the three steps three subjects", () => {
    const tally = { lessons: 2, xp: 200, streakDays: 1 };
    const subjects = new Set([
      firstWeekSubject("FIRST_MISSION", LESSON),
      firstWeekSubject("COME_BACK", LESSON),
      firstWeekSubject("FIRST_WEEK", LESSON, tally),
    ]);
    expect(subjects.size).toBe(3);
  });
});

describe("FirstWeekEmail", () => {
  it("sends day 1 to the lesson, and says what it starts", async () => {
    const html = await render(
      FirstWeekEmail({
        step: "FIRST_MISSION",
        displayName: "Amélie",
        lesson: LESSON,
        siteUrl: SITE,
      }),
    );
    expect(html).toContain("Introduction aux injections SQL");
    expect(html).toContain(LESSON.url);
    expect(html).toContain("Commencer la leçon");
    expect(html).toContain(`${SITE}/settings/notifications`);
  });

  it("sends to the paths when there is no lesson to offer", async () => {
    const html = await render(
      FirstWeekEmail({ step: "COME_BACK", displayName: "Amélie", lesson: null, siteUrl: SITE }),
    );
    expect(html).toContain(`${SITE}/paths`);
    expect(html).toContain("Choisir un parcours");
  });

  it("tells the week back on day 7, and keeps the place of a week without a lesson", async () => {
    const busy = await render(
      FirstWeekEmail({
        step: "FIRST_WEEK",
        displayName: "Amélie",
        lesson: LESSON,
        tally: { lessons: 3, xp: 320, streakDays: 2 },
        siteUrl: SITE,
      }),
    );
    expect(busy).toContain("3 leçons terminées");
    expect(busy).toContain("320 XP");
    expect(busy).toContain("Série en cours : 2 jours");

    const quiet = await render(
      FirstWeekEmail({
        step: "FIRST_WEEK",
        displayName: "Amélie",
        lesson: LESSON,
        tally: { lessons: 0, xp: 0, streakDays: 0 },
        siteUrl: SITE,
      }),
    );
    expect(quiet).toContain("ta place est gardée");
    expect(quiet).not.toContain("leçons terminées");
  });
});
