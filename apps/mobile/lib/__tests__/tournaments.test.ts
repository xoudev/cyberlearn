import { describe, expect, it } from "vitest";
import { colors, division } from "@cyberlearn/tokens";
import {
  challengeStateColor,
  flagReplyLine,
  medalColor,
  siteLink,
  TOURNAMENT_ACCENT,
} from "../tournaments";

/**
 * What the tournament screens work out on their own: the medal places, the
 * colour of a challenge's state, a challenge's file as a link, and what a
 * flag's answer says.
 */

describe("medalColor", () => {
  it("gives the first three their medal once they have scored", () => {
    expect(medalColor(1, true)).toBe(division.OR);
    expect(medalColor(2, true)).toBe(division.ARGENT);
    expect(medalColor(3, true)).toBe(division.BRONZE);
    expect(medalColor(4, true)).toBeNull();
    expect(medalColor(1, false)).toBeNull();
  });
});

describe("challengeStateColor", () => {
  it("draws the reader's finds, their team's, the others', and a call to play", () => {
    expect(challengeStateColor("mine", false)).toBe(colors.success);
    expect(challengeStateColor("team", true)).toBe(colors.info);
    expect(challengeStateColor("found", false)).toBe(colors.textMuted);
    expect(challengeStateColor("open", false)).toBe(TOURNAMENT_ACCENT);
    // Once it is over, nobody will find it any more.
    expect(challengeStateColor("open", true)).toBe(colors.textMuted);
  });
});

describe("siteLink", () => {
  const SITE = "https://cyberlearn.fr";

  it("opens an address as it is, and a path on the site", () => {
    expect(siteLink("https://files.example.org/dump.pcap", SITE)).toBe(
      "https://files.example.org/dump.pcap",
    );
    expect(siteLink("/files/dump.pcap", SITE)).toBe("https://cyberlearn.fr/files/dump.pcap");
    expect(siteLink("/files/dump.pcap", `${SITE}/`)).toBe("https://cyberlearn.fr/files/dump.pcap");
  });

  it("opens nothing else", () => {
    expect(siteLink("javascript:alert(1)", SITE)).toBeNull();
    expect(siteLink("//evil.example/x", SITE)).toBeNull();
    expect(siteLink("nc ctf.cyberlearn.fr 31337", SITE)).toBeNull();
  });
});

describe("flagReplyLine", () => {
  it("says what the server answered to a flag", () => {
    expect(flagReplyLine({ ok: true, correct: true, points: 200, already: false })).toEqual({
      ok: true,
      text: "Flag accepté : +200 points pour toi et ton équipe.",
    });
    expect(flagReplyLine({ ok: true, correct: true, points: 0, already: true }).text).toBe(
      "Tu avais déjà trouvé ce flag.",
    );
    expect(flagReplyLine({ ok: true, correct: false })).toEqual({
      ok: false,
      text: "Ce n'est pas le flag. Essaie encore.",
    });
    expect(flagReplyLine({ ok: false, error: "Le tournoi est terminé." })).toEqual({
      ok: false,
      text: "Le tournoi est terminé.",
    });
  });
});
