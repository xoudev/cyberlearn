import { describe, expect, it } from "vitest";
import { describeSchedule } from "@/lib/cron-status";
import { CRON_COLUMNS, CRONS_HEADER } from "../crons-head";

/**
 * A job's row carries two zones: its schedule in UTC, as Vercel reads it, and
 * its runs in Paris, as the rest of the console does. "Tous les jours à 03:30
 * UTC" beside "Prochain passage : 05:30" read as a job running two hours off
 * its schedule, when it was the same moment in two zones.
 */
describe("the scheduled jobs' time zones", () => {
  it("says UTC in the schedule", () => {
    expect(describeSchedule("30 3 * * *")).toContain("UTC");
  });

  it("names Paris on each column that shows an instant", () => {
    const labels = CRON_COLUMNS.map((column) => column.label);
    expect(labels).toContain("Dernier passage (Paris)");
    expect(labels).toContain("Prochain passage (Paris)");
  });

  it("tells both zones in the description", () => {
    expect(CRONS_HEADER.description).toContain("UTC");
    expect(CRONS_HEADER.description).toContain("heure de Paris");
  });
});
