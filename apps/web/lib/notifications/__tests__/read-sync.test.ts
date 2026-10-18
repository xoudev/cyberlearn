// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationItem } from "@cyberlearn/db";
import {
  announceRead,
  markItemsRead,
  NOTIFICATIONS_READ_EVENT,
  onReadElsewhere,
  unreadAfter,
} from "../read-sync";

/**
 * The bell's panel and the history page keep their own lists: what one marks
 * read, the other is told, and follows without counting a row twice.
 */

const NOW = new Date("2026-10-18T09:00:00Z");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

function notice(id: string, readAt: Date | null = null): NotificationItem {
  return {
    id,
    type: "ANNOUNCEMENT",
    title: "Annonce",
    body: "Corps",
    actionUrl: null,
    readAt,
    createdAt: new Date("2026-10-17T09:00:00Z"),
    metadata: null,
  };
}

const unsubscribe: (() => void)[] = [];
afterEach(() => {
  for (const stop of unsubscribe.splice(0)) stop();
});

describe("markItemsRead", () => {
  it("reads the rows named, and leaves the others as they were", () => {
    const earlier = new Date("2026-10-10T00:00:00Z");
    const items = [notice(A), notice(B), notice(C, earlier)];
    const next = markItemsRead(items, { source: "history", ids: [A, C] }, NOW);
    expect(next.map((n) => n.readAt)).toEqual([NOW, null, earlier]);
  });

  it("reads every unread row when all were marked", () => {
    const next = markItemsRead([notice(A), notice(B)], { source: "panel", all: true }, NOW);
    expect(next.every((n) => n.readAt === NOW)).toBe(true);
  });
});

describe("unreadAfter", () => {
  it("takes off the rows that were still unread here, and the ones this list does not show", () => {
    const items = [notice(A), notice(B, NOW)];
    // A was unread here, B already read here (counted out already), C not shown here.
    expect(unreadAfter(5, items, { source: "history", ids: [A, B, C] })).toBe(3);
  });

  it("is zero once all were marked, and never below zero", () => {
    expect(unreadAfter(4, [], { source: "history", all: true })).toBe(0);
    expect(unreadAfter(0, [], { source: "history", ids: [A] })).toBe(0);
  });
});

describe("announceRead and onReadElsewhere", () => {
  it("tells the other list, not the one that marked them", () => {
    const panel = vi.fn();
    const history = vi.fn();
    unsubscribe.push(onReadElsewhere("panel", panel), onReadElsewhere("history", history));

    announceRead({ source: "history", ids: [A] });
    expect(panel).toHaveBeenCalledWith({ source: "history", ids: [A] });
    expect(history).not.toHaveBeenCalled();
  });

  it("ignores an event that does not say what was read", () => {
    const panel = vi.fn();
    unsubscribe.push(onReadElsewhere("panel", panel));
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT, { detail: { ids: [A] } }));
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_READ_EVENT, { detail: { source: "history", ids: [1] } }),
    );
    expect(panel).not.toHaveBeenCalled();
  });

  it("stops listening once told to", () => {
    const panel = vi.fn();
    const stop = onReadElsewhere("panel", panel);
    stop();
    announceRead({ source: "history", all: true });
    expect(panel).not.toHaveBeenCalled();
  });
});
