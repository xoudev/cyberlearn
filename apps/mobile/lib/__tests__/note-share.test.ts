import { describe, expect, it } from "vitest";
import {
  groupAudience,
  noteExcerpt,
  receivedCountLabel,
  shareDoneLabel,
  timeAgo,
  type ShareAudienceEntry,
} from "../note-share";

function person(
  id: string,
  groupId: string,
  groupLabel: string,
  kind: ShareAudienceEntry["kind"] = "PEER",
): ShareAudienceEntry {
  return { id, name: id, kind, groupId, groupLabel, holds: false };
}

describe("groupAudience", () => {
  it("keeps the server's order, one heading per group", () => {
    const groups = groupAudience([
      person("prof", "c1", "3A", "TEACHER"),
      person("sam", "c1", "3A"),
      person("alex", "friends", "Amis", "FRIEND"),
      person("lou", "c1", "3A"),
    ]);
    expect(groups.map((g) => [g.label, g.people.map((p) => p.id)])).toEqual([
      ["3A", ["prof", "sam", "lou"]],
      ["Amis", ["alex"]],
    ]);
  });

  it("keeps two classes with the same name apart", () => {
    const groups = groupAudience([person("a", "c1", "3A"), person("b", "c2", "3A")]);
    expect(groups).toHaveLength(2);
  });

  it("has no heading for nobody", () => {
    expect(groupAudience([])).toEqual([]);
  });
});

describe("the picker's words", () => {
  it("says how many people the note reached, as the site does", () => {
    expect(shareDoneLabel(0)).toBe("Ces personnes avaient déjà cette note.");
    expect(shareDoneLabel(1)).toBe("Note partagée à 1 personne.");
    expect(shareDoneLabel(3)).toBe("Note partagée à 3 personnes.");
  });

  it("counts the received notes", () => {
    expect(receivedCountLabel(1)).toBe("1 note partagée avec toi");
    expect(receivedCountLabel(2)).toBe("2 notes partagées avec toi");
  });
});

describe("the card", () => {
  it("previews a received note with the site's helpers", () => {
    expect(noteExcerpt("## Ports\n- 22 : **SSH**")).toBe("Ports 22 : SSH");
    const now = Date.parse("2026-09-25T12:00:00Z");
    expect(timeAgo("2026-09-25T09:00:00Z", now)).toBe("il y a 3 h");
  });
});
