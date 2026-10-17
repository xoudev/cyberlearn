import { describe, expect, it } from "vitest";
import {
  certificateVerifyUrl,
  contributionLines,
  type HeldBadge,
  holdersLabel,
  lessonsFinishedLabel,
  linkedInCertificateUrl,
  listedBadges,
  missionsLabel,
  moreLabel,
  pathPercent,
  pathProgressLines,
  type PathProgressRow,
  PROFILE_BADGES,
  profileTimeline,
  publicProfileUrl,
  rarestBadges,
  rarityLabel,
  sectionNumbers,
  skillLines,
  TIMELINE_LABEL,
} from "./portfolio";

/**
 * The portfolio of a public profile: skills read off what is finished, and the
 * link that adds a certificate to LinkedIn, with every field LinkedIn reads.
 */

describe("skillLines", () => {
  it("writes one line per category with something finished, in the catalogue's order", () => {
    const lines = skillLines(
      [
        { category: "NETWORK", count: 4 },
        { category: "CYBERSEC", count: 12 },
        { category: "CYBERSEC", count: 3 },
        { category: "MYSTERY", count: 9 },
      ],
      [
        { title: "Réseaux", category: "NETWORK" },
        { title: "Linux", category: "DEV" },
      ],
    );
    expect(lines.map((line) => [line.category, line.lessons, line.paths])).toEqual([
      ["CYBERSEC", 15, []],
      ["DEV", 0, ["Linux"]],
      ["NETWORK", 4, ["Réseaux"]],
    ]);
    expect(lines[0]?.label).toBe("Cybersécurité");
    expect(lines[0]?.short).toBe("Cybersec");
    expect(lines[0]?.color).toMatch(/^#/u);
  });

  it("says nothing for a profile with nothing finished", () => {
    expect(skillLines([], [])).toEqual([]);
    expect(skillLines([{ category: "DEV", count: 0 }], [])).toEqual([]);
  });

  it("counts lessons in French", () => {
    expect(lessonsFinishedLabel(1)).toBe("1 leçon terminée");
    expect(lessonsFinishedLabel(12)).toBe("12 leçons terminées");
  });
});

describe("the profile's own link", () => {
  it("points at the profile from the site's origin, whatever its trailing slash", () => {
    expect(publicProfileUrl("https://cyberlearn.fr/", "alex")).toBe("https://cyberlearn.fr/u/alex");
    expect(publicProfileUrl("https://cyberlearn.fr", "alex")).toBe("https://cyberlearn.fr/u/alex");
  });
});

describe("certificates", () => {
  it("points at the public verification page", () => {
    expect(certificateVerifyUrl("https://cyberlearn.fr/", "abc-123")).toBe(
      "https://cyberlearn.fr/verify/abc-123",
    );
  });

  it("builds the LinkedIn link with the name, the issuer, the month and the proof", () => {
    const url = new URL(
      linkedInCertificateUrl({
        name: "Fondamentaux de l'informatique",
        issuedAt: "2026-03-07T10:00:00.000Z",
        publicId: "abc-123",
        verifyUrl: "https://cyberlearn.fr/verify/abc-123",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      startTask: "CERTIFICATION_NAME",
      name: "Fondamentaux de l'informatique",
      organizationName: "CyberLearn",
      issueYear: "2026",
      issueMonth: "3",
      certUrl: "https://cyberlearn.fr/verify/abc-123",
      certId: "abc-123",
    });
  });
});

describe("sectionNumbers", () => {
  it("numbers the sections shown, leaving no gap for the ones left out", () => {
    const no = sectionNumbers(["activity", false, "badges", false, "timeline"]);
    expect([no("activity"), no("badges"), no("timeline")]).toEqual(["01", "02", "03"]);
  });
});

describe("moreLabel", () => {
  it("names what a bounded list leaves out, and nothing when it shows all", () => {
    expect(moreLabel(12, 16)).toBe("et 4 autres");
    expect(moreLabel(12, 13)).toBe("et 1 autre");
    expect(moreLabel(5, 5)).toBeNull();
    expect(moreLabel(5, 3)).toBeNull();
  });
});

describe("listedBadges", () => {
  it("lists the first dozen of every badge held, in the order given", () => {
    const held = Array.from({ length: 17 }, (_, i) => `b${String(i)}`);
    const listed = listedBadges(held);
    expect(listed).toHaveLength(PROFILE_BADGES);
    expect(listed[0]).toBe("b0");
    expect(moreLabel(listed.length, held.length)).toBe("et 5 autres");
    expect(listedBadges(["b0", "b1"])).toEqual(["b0", "b1"]);
  });
});

describe("rarestBadges", () => {
  const badge = (
    id: string,
    rarity: string,
    holders: number,
    earnedAt = "2026-05-01T00:00:00Z",
  ): HeldBadge => ({ id, name: id, rarity, iconUrl: null, earnedAt, holders });

  it("puts the highest rarity first, then the fewest holders, then the most recent", () => {
    const held = [
      badge("common", "COMMON", 1),
      badge("epic-many", "EPIC", 40),
      badge("legendary", "LEGENDARY", 90),
      badge("epic-few", "EPIC", 3),
      badge("rare", "RARE", 2),
      badge("epic-few-older", "EPIC", 3, "2026-01-01T00:00:00Z"),
    ];
    expect(rarestBadges(held).map((b) => b.id)).toEqual([
      "legendary",
      "epic-few",
      "epic-few-older",
    ]);
  });

  it("ranks an unknown rarity as common, and never returns more than it holds", () => {
    const held = [badge("odd", "MYTHIC", 1), badge("rare", "RARE", 50)];
    expect(rarestBadges(held, 3).map((b) => b.id)).toEqual(["rare", "odd"]);
    expect(rarestBadges([], 3)).toEqual([]);
  });

  it("words how many hold a badge, and its rarity", () => {
    expect(holdersLabel(1)).toBe("Détenu par une seule personne");
    expect(holdersLabel(7)).toBe("Détenu par 7 personnes");
    expect(rarityLabel("LEGENDARY")).toBe("Légendaire");
    expect(rarityLabel("EPIC")).toBe("Épique");
    expect(rarityLabel("MYTHIC")).toBe("Commun");
  });
});

describe("profileTimeline", () => {
  it("merges the four sources on their dates, most recent first, and stops at its length", () => {
    const events = profileTimeline(
      {
        badges: [{ id: "b1", name: "Premier pas", earnedAt: new Date("2026-03-02T00:00:00Z") }],
        certificates: [
          { publicId: "c1", pathTitle: "Linux", issuedAt: new Date("2026-04-10T00:00:00Z") },
        ],
        paths: [
          { slug: "linux", title: "Linux", completedAt: "2026-04-09T00:00:00Z" },
          { slug: "reseau", title: "Réseau", completedAt: null },
        ],
        challenges: [
          { slug: "flag", title: "Premier flag", completedAt: new Date("2026-05-01T00:00:00Z") },
          { slug: "open", title: "Encore ouvert", completedAt: null },
        ],
      },
      3,
    );
    expect(events.map((e) => [e.kind, e.title])).toEqual([
      ["challenge", "Premier flag"],
      ["certificate", "Linux"],
      ["path", "Linux"],
    ]);
    expect(events[0]).toMatchObject({ at: "2026-05-01T00:00:00.000Z", key: "challenge:flag" });
    expect(TIMELINE_LABEL.certificate).toBe("Certificat obtenu");
  });

  it("is empty for somebody who has done nothing yet", () => {
    expect(profileTimeline({ badges: [], certificates: [], paths: [], challenges: [] })).toEqual(
      [],
    );
  });
});

describe("paths and their progress", () => {
  it("never shows 100 % for a path still going, always for one completed", () => {
    expect(pathPercent(12, 12, false)).toBe(99);
    expect(pathPercent(3, 12, false)).toBe(25);
    expect(pathPercent(0, 0, false)).toBe(0);
    expect(pathPercent(3, 12, true)).toBe(100);
  });

  it("lists the paths going on first, furthest along first, then the finished ones", () => {
    const row = (
      slug: string,
      completed: boolean,
      done: number,
      total: number,
      completedAt: Date | string | null = null,
    ): PathProgressRow => ({
      slug,
      title: slug.toUpperCase(),
      category: "DEV",
      completed,
      done,
      total,
      completedAt,
    });
    const lines = pathProgressLines([
      row("a", false, 2, 10),
      row("b", true, 8, 9, new Date("2026-02-01T00:00:00Z")),
      row("c", false, 7, 10),
      row("d", true, 4, 4, "2026-06-01T00:00:00Z"),
    ]);
    expect(lines.map((l) => [l.slug, l.percent])).toEqual([
      ["c", 70],
      ["a", 20],
      ["d", 100],
      ["b", 100],
    ]);
    expect(lines[2]?.completedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(lines[0]?.completedAt).toBeNull();
  });

  it("counts missions in French", () => {
    expect(missionsLabel(1, 1)).toBe("1 / 1 mission");
    expect(missionsLabel(7, 12)).toBe("7 / 12 missions");
  });
});

describe("contributionLines", () => {
  it("writes a line per kind of contribution, with its detail, in French", () => {
    expect(
      contributionLines({ posts: 12, topics: 1, answers: 3, acceptedAnswers: 2, writeups: 1 }),
    ).toEqual([
      { key: "posts", n: 12, label: "messages au forum", detail: "dont 1 sujet ouvert" },
      { key: "answers", n: 3, label: "réponses sous les leçons", detail: "dont 2 acceptées" },
      { key: "writeups", n: 1, label: "solution de défi partagée", detail: null },
    ]);
  });

  it("leaves out what is empty", () => {
    const none = { posts: 0, topics: 0, answers: 0, acceptedAnswers: 0, writeups: 0 };
    expect(contributionLines({ ...none, answers: 1 })).toEqual([
      { key: "answers", n: 1, label: "réponse sous les leçons", detail: null },
    ]);
    expect(contributionLines(none)).toEqual([]);
  });
});
