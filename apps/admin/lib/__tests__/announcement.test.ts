/**
 * The announcement's pure parts: which links the bell may follow, how an
 * audience is named, and the audit row written by the send and read back by
 * the page's history.
 */

import { describe, expect, it } from "vitest";
import {
  announcementSchema,
  announcementTrace,
  audienceLabel,
  isLearnerPath,
  readAnnouncementTrace,
} from "../announcement";

const CLASS_IDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
];
const NAMES = new Map(CLASS_IDS.map((id, i) => [id, `Classe ${String(i + 1)}`]));

describe("isLearnerPath", () => {
  it.each(["/", "/paths", "/lessons/mon-slug", "/forum/general/un-sujet?page=2#fin"])(
    "accepts %s",
    (value) => {
      expect(isLearnerPath(value)).toBe(true);
    },
  );

  it.each([
    "paths",
    "https://evil.example/",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/une page",
    "javascript:alert(1)",
  ])("refuses %j", (value) => {
    expect(isLearnerPath(value)).toBe(false);
  });
});

describe("announcementSchema", () => {
  it("trims, drops an empty link and keeps each class once", () => {
    const parsed = announcementSchema.safeParse({
      title: "  Rentrée  ",
      body: " Bienvenue. ",
      actionUrl: "   ",
      audience: { kind: "CLASSES", classIds: [CLASS_IDS[0], CLASS_IDS[0]] },
    });
    expect(parsed.success && parsed.data).toEqual({
      title: "Rentrée",
      body: "Bienvenue.",
      actionUrl: undefined,
      audience: { kind: "CLASSES", classIds: [CLASS_IDS[0]] },
    });
  });
});

describe("audienceLabel", () => {
  it("names every account", () => {
    expect(audienceLabel({ kind: "ALL" }, NAMES)).toBe("Tous les comptes");
  });

  it("names the roles most privileged first, singular for one", () => {
    expect(audienceLabel({ kind: "ROLES", roles: ["STUDENT", "ADMIN"] }, NAMES)).toBe(
      "Rôles : Admin, Étudiant",
    );
    expect(audienceLabel({ kind: "ROLES", roles: ["TEACHER"] }, NAMES)).toBe("Rôle : Professeur");
  });

  it("names four classes and counts the rest", () => {
    expect(audienceLabel({ kind: "CLASSES", classIds: CLASS_IDS.slice(0, 1) }, NAMES)).toBe(
      "Classe : Classe 1",
    );
    expect(audienceLabel({ kind: "CLASSES", classIds: CLASS_IDS }, NAMES)).toBe(
      "Classes : Classe 1, Classe 2, Classe 3, Classe 4 et 2 autres",
    );
  });
});

describe("the audit trace", () => {
  it("reads back what the send wrote", () => {
    const trace = announcementTrace(
      {
        title: "Rentrée",
        body: "Bienvenue.",
        actionUrl: "/paths",
        audience: { kind: "ROLES", roles: ["STUDENT"] },
      },
      "Rôle : Étudiant",
      120,
    );
    expect(readAnnouncementTrace(JSON.parse(JSON.stringify(trace)))).toEqual({
      title: "Rentrée",
      body: "Bienvenue.",
      actionUrl: "/paths",
      audienceLabel: "Rôle : Étudiant",
      recipients: 120,
    });
  });

  it("is null for metadata that is not an announcement's", () => {
    expect(readAnnouncementTrace(null)).toBeNull();
    expect(readAnnouncementTrace({ rows: 12 })).toBeNull();
  });

  it("fills in what an older or damaged row lacks", () => {
    expect(readAnnouncementTrace({ title: "Ancienne", recipients: 4 })).toEqual({
      title: "Ancienne",
      body: "",
      actionUrl: null,
      audienceLabel: "Audience inconnue",
      recipients: 4,
    });
  });
});
