import { describe, expect, it } from "vitest";
import { dbIso, dbIsoOrNull, dbTime } from "../db-time";

// A phone in Paris: the case that went wrong. Each test file runs in its own
// process, so this zone stays here.
process.env.TZ = "Europe/Paris";

describe("dbTime", () => {
  it("runs in a zone that is not UTC, or it would prove nothing", () => {
    expect(new Date(2026, 8, 24).getTimezoneOffset()).toBe(-120);
    // What the app used to do: the same text read as local time.
    expect(new Date("2026-09-24T10:00:00.123").toISOString()).toBe("2026-09-24T08:00:00.123Z");
  });

  it("reads a timestamp with no offset as UTC", () => {
    expect(dbTime("2026-09-24T10:00:00.123").toISOString()).toBe("2026-09-24T10:00:00.123Z");
    expect(dbTime("2026-09-24T10:00:00").toISOString()).toBe("2026-09-24T10:00:00.000Z");
  });

  it("keeps an explicit offset", () => {
    expect(dbTime("2026-09-24T10:00:00Z").toISOString()).toBe("2026-09-24T10:00:00.000Z");
    expect(dbTime("2026-09-24T12:00:00+02:00").toISOString()).toBe("2026-09-24T10:00:00.000Z");
    expect(dbTime("2026-09-24T12:00:00+0200").toISOString()).toBe("2026-09-24T10:00:00.000Z");
  });
});

describe("dbIso / dbIsoOrNull", () => {
  it("hands the rest of the app an ISO string with its Z", () => {
    expect(dbIso("2026-09-24T10:00:00")).toBe("2026-09-24T10:00:00.000Z");
    expect(dbIsoOrNull(null)).toBeNull();
    expect(dbIsoOrNull("2026-09-24T10:00:00.5")).toBe("2026-09-24T10:00:00.500Z");
  });
});
