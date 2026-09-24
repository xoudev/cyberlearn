import { describe, expect, it } from "vitest";
import { dbTime } from "../db-time";

describe("dbTime", () => {
  it("reads a timestamp with no offset as UTC, whatever the phone's zone", () => {
    expect(dbTime("2026-09-24T10:00:00.123").toISOString()).toBe("2026-09-24T10:00:00.123Z");
    expect(dbTime("2026-09-24T10:00:00").toISOString()).toBe("2026-09-24T10:00:00.000Z");
  });

  it("keeps an explicit offset", () => {
    expect(dbTime("2026-09-24T10:00:00Z").toISOString()).toBe("2026-09-24T10:00:00.000Z");
    expect(dbTime("2026-09-24T12:00:00+02:00").toISOString()).toBe("2026-09-24T10:00:00.000Z");
    expect(dbTime("2026-09-24T12:00:00+0200").toISOString()).toBe("2026-09-24T10:00:00.000Z");
  });
});
