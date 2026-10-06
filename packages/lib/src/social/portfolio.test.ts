import { describe, expect, it } from "vitest";
import {
  certificateVerifyUrl,
  lessonsFinishedLabel,
  linkedInCertificateUrl,
  skillLines,
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
