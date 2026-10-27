import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { activityMonths } from "../activity-months";
import { ActivityHeatmap } from "../activity-heatmap";

describe("monthly activity history", () => {
  it("keeps twelve calendar months across a year boundary", () => {
    const months = activityMonths({}, "2026-01-04");
    expect(months).toHaveLength(12);
    expect(months[0]?.key).toBe("2025-02");
    expect(months[11]?.key).toBe("2026-01");
  });

  it("counts active days rather than treating several activities as several days", () => {
    const months = activityMonths(
      {
        "2026-10-01": 8,
        "2026-10-24": 1,
        "2026-10-25": 5,
        "2026-10-03": 0,
        "2026-09-30": 3,
        "2025-10-31": 2,
      },
      "2026-10-24",
    );
    expect(months.find((month) => month.key === "2026-10")?.days).toBe(2);
    expect(months.find((month) => month.key === "2026-09")?.days).toBe(1);
    expect(months.reduce((total, month) => total + month.days, 0)).toBe(3);
  });

  it("includes leap day in its proper month", () => {
    expect(activityMonths({ "2024-02-29": 1 }, "2024-03-01")[10]?.days).toBe(1);
  });

  it("shows a useful empty state without hundreds of empty squares", () => {
    const html = renderToStaticMarkup(<ActivityHeatmap activity={{}} today="2026-10-24" />);
    expect(html).toContain("Une leçon. Le début d’un rythme.");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<ol");
  });

  it("keeps the daily counts accessible in a folded table, including older available days", () => {
    const html = renderToStaticMarkup(
      <ActivityHeatmap
        activity={{ "2026-10-24": 8, "2025-10-28": 3, "2026-10-25": 7 }}
        today="2026-10-24"
      />,
    );
    expect(html).toContain('aria-label="Jours actifs par mois"');
    expect(html).toContain("octobre 2026 : 1 jour actif");
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toMatch(/dateTime="2025-10-28"/i);
    expect(html).toContain("<td>8</td>");
    expect(html).not.toMatch(/dateTime="2026-10-25"/i);
  });

  it("does not address a visitor as the owner of someone else's profile", () => {
    const html = renderToStaticMarkup(
      <ActivityHeatmap activity={{}} today="2026-10-24" personal={false} />,
    );
    expect(html).toContain("Son rythme, mois après mois.");
    expect(html).toContain("Aucun jour actif pour l’instant.");
    expect(html).not.toContain("Les jours où tu apprends");
  });
});
