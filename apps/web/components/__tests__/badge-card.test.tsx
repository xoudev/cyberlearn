import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BadgeCard } from "../badge-card";
import type { SerializedBadge } from "@/lib/badges/collection";

const BADGE: SerializedBadge = {
  id: "b1",
  refCode: "BDG-001",
  name: "Premier pas",
  description: "Première leçon terminée.",
  iconUrl: "/badges/first.png",
  rarity: "RARE",
  criterionType: "LESSONS",
  earned: true,
  earnedDateStr: "3 oct. 2026",
  progress: null,
};

describe("the badge card", () => {
  it("shows an earned badge with its day", () => {
    const html = renderToStaticMarkup(<BadgeCard badge={BADGE} />);
    expect(html).toContain("Premier pas");
    expect(html).toContain("BDG-001");
    expect(html).toContain("Rare");
    expect(html).toContain("3 oct. 2026");
    expect(html).not.toContain("3/10");
  });

  it("shows a badge still to earn with its progress", () => {
    const html = renderToStaticMarkup(
      <BadgeCard
        badge={{
          ...BADGE,
          earned: false,
          earnedDateStr: null,
          progress: { done: 3, total: 10, label: "leçons" },
        }}
      />,
    );
    expect(html).toContain("3/10");
    expect(html).toContain("leçons");
    expect(html).toContain("30%");
    expect(html).not.toContain("Obtenu le");
  });
});
