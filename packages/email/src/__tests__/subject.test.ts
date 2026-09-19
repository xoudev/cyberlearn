import { describe, expect, it } from "vitest";
import { getMagicLinkSubject } from "../templates/magic-link";
import { stampedSubject, subjectStamp } from "../subject";

/**
 * The rule the whole inbox rests on: two sends, two rows.
 *
 * Nothing here checks how a subject reads. It checks that sending the same
 * kind of mail twice does not produce the same string twice, because that
 * string is what a mail client groups on - and a grouped row shows the newest
 * message only. Six login links under one heading is five links somebody
 * cannot see.
 */

const AT_16_04 = new Date("2026-09-19T14:04:30Z"); // 16:04 in Paris
const AT_16_05 = new Date("2026-09-19T14:05:00Z");
const NEXT_DAY = new Date("2026-09-20T14:04:30Z");

describe("subjectStamp", () => {
  it("reads as a day and a time, in Paris", () => {
    expect(subjectStamp(AT_16_04)).toBe("19 sept. à 16:04");
  });

  it("follows Paris across the summer-time boundary rather than UTC", () => {
    // Same instant either side of the last Sunday in October: 02:30 UTC is
    // 04:30 in Paris in summer and 03:30 in winter.
    expect(subjectStamp(new Date("2026-10-24T02:30:00Z"))).toBe("24 oct. à 04:30");
    expect(subjectStamp(new Date("2026-10-26T02:30:00Z"))).toBe("26 oct. à 03:30");
  });

  it("changes with the minute, which is what breaks the grouping", () => {
    expect(subjectStamp(AT_16_04)).not.toBe(subjectStamp(AT_16_05));
  });

  it("changes with the day, for two sends a day apart at the same minute", () => {
    expect(subjectStamp(AT_16_04)).not.toBe(subjectStamp(NEXT_DAY));
  });

  it("keeps the base readable in front of the stamp", () => {
    expect(stampedSubject("Ton lien de connexion", AT_16_04)).toBe(
      "Ton lien de connexion · 19 sept. à 16:04",
    );
  });
});

describe("getMagicLinkSubject", () => {
  it("gives two logins two different subjects", () => {
    // The whole point. Before this, every login on the platform arrived under
    // the identical string and the client stacked them.
    expect(getMagicLinkSubject("magiclink", AT_16_04)).not.toBe(
      getMagicLinkSubject("magiclink", AT_16_05),
    );
  });

  it("still says what the mail is for", () => {
    expect(getMagicLinkSubject("magiclink", AT_16_04)).toContain("lien de connexion");
    expect(getMagicLinkSubject("recovery", AT_16_04)).toContain("Réinitialise");
    expect(getMagicLinkSubject("signup", AT_16_04)).toContain("Confirme ton compte");
  });

  it("keeps the five kinds apart from each other, not only from themselves", () => {
    const kinds = ["magiclink", "signup", "recovery", "invite", "email_change"];
    const subjects = kinds.map((kind) => getMagicLinkSubject(kind, AT_16_04));
    expect(new Set(subjects).size).toBe(kinds.length);
  });

  it("falls back to the login subject for a type Supabase invents later", () => {
    expect(getMagicLinkSubject("something_new", AT_16_04)).toContain("lien de connexion");
  });

  it("never carries the one-time code", () => {
    // A subject is shown on a locked phone. Putting the code there would also
    // break the grouping, which is exactly why it is worth saying that it is
    // not how the grouping is broken.
    const subject = getMagicLinkSubject("magiclink", AT_16_04);
    expect(subject).not.toMatch(/\d{6}/u);
  });
});
