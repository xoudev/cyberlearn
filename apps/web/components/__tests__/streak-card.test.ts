import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StreakOverview } from "@cyberlearn/db";

const overview = vi.hoisted((): { current: StreakOverview | null } => ({ current: null }));

vi.mock("@cyberlearn/db", () => ({
  streakRepository: { getOverview: () => Promise.resolve(overview.current) },
}));

import { StreakCard } from "../streak-card";

async function render(props: { userId: string; year?: boolean }): Promise<string> {
  const element = await StreakCard(props);
  return element === null ? "" : renderToStaticMarkup(element);
}

const BASE: StreakOverview = {
  currentStreak: 7,
  longestStreak: 12,
  freezes: 1,
  active: true,
  daysThisYear: 40,
  activity: {},
};

describe("the streak card", () => {
  it("is the dashboard's card, with the week and the freezes", async () => {
    overview.current = BASE;
    const html = await render({ userId: "u" });
    expect(html).toContain('class="dash-card dash-card--streak"');
    expect(html).toContain("jours d&#x27;affilée");
    expect(html).toContain("record 12 jours");
    expect(html).toContain("dash-day");
    expect(html).toContain("<b>1 gel</b>");
    expect(html).not.toContain("dash-heat");
  });

  it("sends to the profile for the year only while there is no record to show", async () => {
    overview.current = { ...BASE, longestStreak: 0 };
    expect(await render({ userId: "u" })).toContain('href="/profile"');
    expect(await render({ userId: "u", year: true })).not.toContain('href="/profile"');
  });

  it("goes on with the year on the profile: the figures and the calendar", async () => {
    overview.current = BASE;
    const html = await render({ userId: "u", year: true });
    expect(html).toContain("Cette année");
    expect(html).toContain("40<small>j</small>");
    expect(html).toContain("Prochain palier");
    expect(html).toContain("14<small>j</small>");
    expect(html).toContain("encore 7 jours");
    expect(html).toContain("12 derniers mois");
    expect(html).toContain('aria-label="Activité des douze derniers mois"');
    // 53 weeks of 7 days, drawn as cells, past or future.
    expect(html.match(/class="dash-heat-cell/g)?.length).toBe(53 * 7 + 4);
  });

  it("says the streak is broken the same way everywhere", async () => {
    overview.current = { ...BASE, currentStreak: 0, active: false };
    const html = await render({ userId: "u", year: true });
    expect(html).toContain("dash-streak-top--off");
    expect(html).toContain("une leçon aujourd&#x27;hui la relance");
  });

  it("draws nothing for an account the repository does not know", async () => {
    overview.current = null;
    expect(await render({ userId: "ghost" })).toBe("");
  });
});
