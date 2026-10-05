import { type LogHunt, logHuntSchema } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import { buildLog, clockOf, countBy, filterEvents, isLogAnswer } from "./hunt";

/**
 * The incident of the blue-team project (287 failures from one address, then
 * a success) drawn as an exercise: the table is the same every time, the
 * filters and counts find the attacker the way the lesson does, and an answer
 * is read as a learner types it.
 */

function hunt(spec: unknown): LogHunt {
  const parsed = logHuntSchema.safeParse(spec);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "bad hunt");
  return parsed.data;
}

const INCIDENT = hunt({
  id: "web01",
  task: "Trouve l'attaquant.",
  events: [
    {
      time: "2026-01-10 03:14:02",
      source: "sshd",
      host: "web01",
      ip: "203.0.113.9",
      user: "deploy",
      action: "Accepted password",
    },
  ],
  series: [
    {
      count: 287,
      from: "2026-01-10 03:09:00",
      to: "2026-01-10 03:14:00",
      source: "sshd",
      hosts: ["web01"],
      ips: ["203.0.113.9"],
      users: ["deploy"],
      actions: ["Failed password"],
    },
    {
      count: 120,
      from: "2026-01-10 02:00:00",
      to: "2026-01-10 04:00:00",
      source: "nginx",
      hosts: ["web01"],
      ips: ["198.51.100.23", "198.51.100.77", "192.0.2.44"],
      actions: ["GET / 200", "GET /contact 200", "GET /favicon.ico 304"],
    },
    {
      count: 6,
      from: "2026-01-10 02:30:00",
      to: "2026-01-10 02:31:00",
      source: "sshd",
      hosts: ["web01"],
      ips: ["10.0.0.5"],
      users: ["alice"],
      actions: ["Failed password"],
    },
  ],
  questions: [{ label: "Quelle adresse ?", answer: "203.0.113.9" }],
});

describe("buildLog", () => {
  const log = buildLog(INCIDENT);

  it("draws the same table every time, in time order, with every event asked for", () => {
    expect(log).toHaveLength(1 + 287 + 120 + 6);
    expect(buildLog(INCIDENT)).toEqual(log);
    for (let i = 1; i < log.length; i++) {
      expect((log[i - 1]?.time ?? "") <= (log[i]?.time ?? "")).toBe(true);
    }
    expect(log.every((e) => e.time.startsWith("2026-01-10 0"))).toBe(true);
  });

  it("keeps each series within its window and its values", () => {
    const failures = log.filter((e) => e.action === "Failed password" && e.ip === "203.0.113.9");
    expect(failures).toHaveLength(287);
    expect(
      failures.every((e) => e.time >= "2026-01-10 03:09:00" && e.time < "2026-01-10 03:14:00"),
    ).toBe(true);
    expect(failures.every((e) => e.user === "deploy" && e.host === "web01")).toBe(true);
    const web = log.filter((e) => e.source === "nginx");
    expect(web).toHaveLength(120);
    expect(web.every((e) => e.user === undefined)).toBe(true);
    expect(new Set(web.map((e) => e.ip)).size).toBe(3);
  });

  it("draws another table for another exercise", () => {
    expect(buildLog({ ...INCIDENT, id: "web02" })).not.toEqual(log);
  });
});

describe("finding the attacker", () => {
  const log = buildLog(INCIDENT);

  it("counts failures by address: the attacker stands out, the colleague does not", () => {
    const failures = filterEvents(log, "", [{ field: "action", value: "Failed password" }]);
    expect(countBy(failures, "ip")).toEqual([
      { value: "203.0.113.9", count: 287 },
      { value: "10.0.0.5", count: 6 },
    ]);
  });

  it("filters by free text across the fields, case aside", () => {
    expect(filterEvents(log, "accepted", [])).toHaveLength(1);
    expect(filterEvents(log, "DEPLOY", [])).toHaveLength(288);
    expect(filterEvents(log, "contact", [])).toEqual(
      log.filter((e) => e.action === "GET /contact 200"),
    );
    expect(filterEvents(log, "203.0.113.9", [{ field: "source", value: "nginx" }])).toEqual([]);
  });

  it("counts the most frequent first, and leaves an absent field out", () => {
    const sources = countBy(log, "source");
    expect(sources[0]).toEqual({ value: "sshd", count: 294 });
    expect(sources[1]).toEqual({ value: "nginx", count: 120 });
    expect(
      countBy(
        log.filter((e) => e.source === "nginx"),
        "user",
      ),
    ).toEqual([]);
  });

  it("shows the hour without the date", () => {
    expect(clockOf("2026-01-10 03:14:02")).toBe("03:14:02");
  });
});

describe("isLogAnswer", () => {
  it("reads an address, a name, a number, spaces and case aside", () => {
    expect(isLogAnswer("203.0.113.9", " 203.0.113.9 ")).toBe(true);
    expect(isLogAnswer("deploy", "Deploy")).toBe(true);
    expect(isLogAnswer("287", "288")).toBe(false);
    expect(isLogAnswer(["287", "287 échecs"], "287 échecs")).toBe(true);
  });

  it("reads an hour with or without its seconds and its date", () => {
    expect(isLogAnswer("2026-01-10 03:14:02", "03:14:02")).toBe(true);
    expect(isLogAnswer("2026-01-10 03:14:02", "03:14")).toBe(true);
    expect(isLogAnswer("2026-01-10 03:14:02", "2026-01-10 03:14:02")).toBe(true);
    expect(isLogAnswer("03:14:02", "3:14")).toBe(false);
    expect(isLogAnswer("2026-01-10 03:14:02", "03:15")).toBe(false);
  });
});
