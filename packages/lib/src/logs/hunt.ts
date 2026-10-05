import type { LogEvent, LogHunt, LogSeries } from "@cyberlearn/types";
import { randomFromText } from "../exercises/arrange";

/**
 * <LogHunt>: the events of an exercise, drawn once and the same for everyone;
 * the filters and the counts an analyst applies to them; the reading of an
 * answer. A SIEM in the small: no rule engine, the learner is the rule.
 *
 * Pure and dependency-free: the site and the mobile app both import it.
 */

export const LOG_FIELDS = ["time", "source", "host", "ip", "user", "action"] as const;
export type LogField = (typeof LOG_FIELDS)[number];

export const FIELD_NAMES: Record<LogField, string> = {
  time: "Heure",
  source: "Source",
  host: "Hôte",
  ip: "Adresse IP",
  user: "Utilisateur",
  action: "Action",
};

/** A filter on one field: the event must carry exactly this value. */
export interface FieldFilter {
  readonly field: LogField;
  readonly value: string;
}

/** What the time of an event is, as a number, for drawing and sorting. */
function msOf(time: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/u.exec(time);
  if (!m) return 0;
  return Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
  );
}

function timeOf(ms: number): string {
  const d = new Date(ms);
  const two = (n: number): string => String(n).padStart(2, "0");
  return `${String(d.getUTCFullYear())}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}`;
}

function pick<T>(items: readonly T[] | undefined, random: () => number): T | undefined {
  if (items === undefined || items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}

/** The events of a series, drawn from the generator. */
function drawSeries(series: LogSeries, random: () => number): LogEvent[] {
  const from = msOf(series.from);
  const span = msOf(series.to) - from;
  const events: LogEvent[] = [];
  for (let i = 0; i < series.count; i++) {
    const host = pick(series.hosts, random);
    const ip = pick(series.ips, random);
    const user = pick(series.users, random);
    const action = pick(series.actions, random) ?? "";
    events.push({
      time: timeOf(from + Math.floor(random() * span)),
      source: series.source,
      ...(host === undefined ? {} : { host }),
      ...(ip === undefined ? {} : { ip }),
      ...(user === undefined ? {} : { user }),
      action,
    });
  }
  return events;
}

/**
 * Every event of the exercise, the written ones and the drawn ones together,
 * in time order. Drawn from the exercise's id: the same table for every
 * learner, on the site and in the app, and known to the tests.
 */
export function buildLog(hunt: Pick<LogHunt, "id" | "events" | "series">): LogEvent[] {
  const random = randomFromText(`log-hunt:${hunt.id}`);
  const all = [...hunt.events];
  for (const series of hunt.series) all.push(...drawSeries(series, random));
  return all.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

const fold = (text: string): string => text.trim().toLowerCase();

/**
 * The events that match: every field filter exactly, and the free text as a
 * part of any field, case aside.
 */
export function filterEvents(
  events: readonly LogEvent[],
  text: string,
  filters: readonly FieldFilter[],
): LogEvent[] {
  const needle = fold(text);
  return events.filter((event) => {
    for (const filter of filters) {
      if ((event[filter.field] ?? "") !== filter.value) return false;
    }
    if (needle === "") return true;
    return LOG_FIELDS.some((field) => fold(event[field] ?? "").includes(needle));
  });
}

export interface ValueCount {
  readonly value: string;
  readonly count: number;
}

/** How many events carry each value of the field, the most frequent first; an empty field is not counted. */
export function countBy(events: readonly LogEvent[], field: LogField): ValueCount[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const value = event[field];
    if (value === undefined || value === "") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : 1));
}

/** The hour of an event as the table shows it: without the date. */
export function clockOf(time: string): string {
  return time.slice(11);
}

/**
 * Whether the learner's answer is one of those accepted, spaces and case
 * aside. An hour is accepted with or without its seconds, with or without
 * its date.
 */
export function isLogAnswer(expected: string | readonly string[], proposed: string): boolean {
  const accepted = typeof expected === "string" ? [expected] : expected;
  const given = fold(proposed).replace(/\s+/gu, " ");
  return accepted.some((answer) => {
    const wanted = fold(answer).replace(/\s+/gu, " ");
    if (given === wanted) return true;
    const clock = /(\d{2}:\d{2}(?::\d{2})?)$/u.exec(wanted)?.[1];
    if (clock === undefined) return false;
    return given === clock || given === clock.slice(0, 5) || given.endsWith(` ${clock}`);
  });
}
