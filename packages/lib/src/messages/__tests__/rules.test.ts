import { describe, expect, it } from "vitest";
import {
  directPairKey,
  effectiveStatus,
  firstMessageOutcome,
  nextMessageOutcome,
  teamPairKey,
} from "../rules";

/**
 * Who may write to whom: friends at once, anybody else through one request,
 * nobody through a block, and the recipient's setting first.
 */

const base = { self: false, blocked: false, friends: false, recipientPrivacy: "EVERYONE" as const };

describe("firstMessageOutcome", () => {
  it("opens a conversation between friends at once", () => {
    expect(firstMessageOutcome({ ...base, friends: true })).toEqual({
      ok: true,
      status: "ACCEPTED",
    });
  });

  it("makes a stranger's first message a request", () => {
    expect(firstMessageOutcome(base)).toEqual({ ok: true, status: "REQUESTED" });
  });

  it("follows the recipient's setting", () => {
    expect(firstMessageOutcome({ ...base, recipientPrivacy: "FRIENDS" })).toEqual({
      ok: false,
      refusal: "friendsOnly",
    });
    expect(firstMessageOutcome({ ...base, friends: true, recipientPrivacy: "FRIENDS" })).toEqual({
      ok: true,
      status: "ACCEPTED",
    });
    expect(firstMessageOutcome({ ...base, friends: true, recipientPrivacy: "NOBODY" })).toEqual({
      ok: false,
      refusal: "nobody",
    });
  });

  it("lets nothing through a block, nor to oneself", () => {
    expect(firstMessageOutcome({ ...base, friends: true, blocked: true })).toEqual({
      ok: false,
      refusal: "blocked",
    });
    expect(firstMessageOutcome({ ...base, self: true })).toEqual({ ok: false, refusal: "self" });
  });
});

describe("nextMessageOutcome", () => {
  const facts = { requestedById: "a", senderId: "a", blocked: false };

  it("lets either side write once accepted", () => {
    expect(nextMessageOutcome({ ...facts, status: "ACCEPTED" })).toEqual({ ok: true });
    expect(nextMessageOutcome({ ...facts, status: "ACCEPTED", senderId: "b" })).toEqual({
      ok: true,
    });
  });

  it("holds the requester to one message, declined or not, without telling which", () => {
    expect(nextMessageOutcome({ ...facts, status: "REQUESTED" })).toEqual({
      ok: false,
      refusal: "pending",
    });
    expect(nextMessageOutcome({ ...facts, status: "DECLINED" })).toEqual({
      ok: false,
      refusal: "pending",
    });
  });

  it("asks the recipient to accept before answering", () => {
    expect(nextMessageOutcome({ ...facts, status: "REQUESTED", senderId: "b" })).toEqual({
      ok: false,
      refusal: "mustAccept",
    });
  });

  it("stops at a block", () => {
    expect(nextMessageOutcome({ ...facts, status: "ACCEPTED", blocked: true })).toEqual({
      ok: false,
      refusal: "blocked",
    });
  });
});

describe("effectiveStatus", () => {
  it("accepts a waiting request between accounts that became friends", () => {
    expect(effectiveStatus("REQUESTED", true)).toBe("ACCEPTED");
    expect(effectiveStatus("REQUESTED", false)).toBe("REQUESTED");
    expect(effectiveStatus("DECLINED", true)).toBe("DECLINED");
  });
});

describe("pair keys", () => {
  it("names a pair the same whoever wrote first", () => {
    expect(directPairKey("b", "a")).toBe(directPairKey("a", "b"));
    expect(directPairKey("a", "b")).toBe("direct:a:b");
    expect(teamPairKey("a")).toBe("team:a");
  });
});
