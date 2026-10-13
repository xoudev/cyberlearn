import { describe, expect, it } from "vitest";
import { auditActorName, auditExportFilename, csvCell, csvLine } from "../audit-export";

describe("the audit export's cells", () => {
  it("quotes every cell and doubles the quotes inside", () => {
    expect(csvCell("plain")).toBe('"plain"');
    expect(csvCell('say "hi"; then go')).toBe('"say ""hi""; then go"');
    expect(csvLine(["a", "b"])).toBe('"a";"b"\r\n');
  });

  it("defuses a value a spreadsheet would run as a formula", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+1")).toBe('"\'+1"');
    expect(csvCell("-2")).toBe('"\'-2"');
    expect(csvCell("@SUM(A1)")).toBe('"\'@SUM(A1)"');
    expect(csvCell("\tcmd")).toBe('"\'\tcmd"');
    // A date or an id is left as it is.
    expect(csvCell("2026-10-12T08:30:00.000Z")).toBe('"2026-10-12T08:30:00.000Z"');
  });

  it("names the actor by handle, else by address, else by what is left of them", () => {
    const actor = { username: null, displayName: "A", email: "a@x.fr" };
    expect(auditActorName({ actor: { ...actor, username: "amelie" }, anonymized: false })).toBe(
      "amelie",
    );
    expect(auditActorName({ actor, anonymized: false })).toBe("a@x.fr");
    expect(auditActorName({ actor: null, anonymized: true })).toBe("compte supprimé");
    expect(auditActorName({ actor: null, anonymized: false })).toBe("système");
  });

  it("dates the file in Paris", () => {
    // 23:30 UTC on the 12th is already the 13th in Paris.
    expect(auditExportFilename(new Date("2026-10-12T23:30:00Z"))).toBe("audit-log-2026-10-13.csv");
  });
});
