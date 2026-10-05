import { describe, expect, it } from "vitest";
import { parseLogHunt } from "../log-hunt.schema";

const EVENT = {
  time: "2026-01-10 03:14:02",
  source: "sshd",
  ip: "203.0.113.9",
  user: "deploy",
  action: "Accepted password",
};
const SERIES = {
  count: 20,
  from: "2026-01-10 03:09:00",
  to: "2026-01-10 03:14:00",
  source: "sshd",
  ips: ["203.0.113.9"],
  actions: ["Failed password"],
};
const QUESTION = { label: "Quelle adresse ?", answer: "203.0.113.9" };

describe("parseLogHunt", () => {
  it("accepts written events, drawn series, and several accepted answers", () => {
    const parsed = parseLogHunt({
      id: "h",
      task: "Trouve.",
      events: [EVENT],
      series: [SERIES],
      questions: [
        QUESTION,
        { label: "Quand ?", answer: ["03:14:02", "03:14"], hint: "Le succès." },
      ],
    });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.events).toHaveLength(1);
    expect(parsed.value.series[0]?.count).toBe(20);
    expect(parsed.value.questions[1]?.answer).toEqual(["03:14:02", "03:14"]);
  });

  it("wants events or series, and a question", () => {
    expect(parseLogHunt({ id: "h", task: "x", questions: [QUESTION] })).toEqual({
      ok: false,
      problem: "il faut des événements : events, series, ou les deux.",
    });
    expect(parseLogHunt({ id: "h", task: "x", events: [EVENT], questions: [] }).ok).toBe(false);
  });

  it("refuses a time, an address or a window written wrong, and names where", () => {
    expect(
      parseLogHunt({
        id: "h",
        task: "x",
        events: [{ ...EVENT, time: "10/01 03:14" }],
        questions: [QUESTION],
      }),
    ).toMatchObject({ ok: false, problem: expect.stringContaining("events.0.time : ") as string });
    expect(
      parseLogHunt({
        id: "h",
        task: "x",
        events: [{ ...EVENT, ip: "203.0.113.300" }],
        questions: [QUESTION],
      }),
    ).toMatchObject({ ok: false, problem: expect.stringContaining("events.0.ip : ") as string });
    expect(
      parseLogHunt({
        id: "h",
        task: "x",
        series: [{ ...SERIES, from: SERIES.to, to: SERIES.from }],
        questions: [QUESTION],
      }),
    ).toMatchObject({
      ok: false,
      problem: expect.stringContaining("from doit précéder to") as string,
    });
  });

  it("refuses a table too big to read", () => {
    expect(
      parseLogHunt({
        id: "h",
        task: "x",
        series: [
          { ...SERIES, count: 400 },
          { ...SERIES, count: 400 },
          { ...SERIES, count: 400 },
          { ...SERIES, count: 400 },
        ],
        questions: [QUESTION],
      }),
    ).toMatchObject({ ok: false, problem: expect.stringContaining("1600 événements") as string });
  });
});
