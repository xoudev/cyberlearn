import { describe, expect, it } from "vitest";
import {
  canChallenge,
  FRIENDS_LABEL,
  FRIENDSHIP_ACTION_LABEL,
  friendshipActionAsksFirst,
  friendshipActions,
  friendshipAfter,
  friendshipMove,
  friendshipView,
  orderPair,
  otherSide,
  UNFRIEND_PROMPT,
  unfriendQuestion,
} from "./friendship.js";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

describe("orderPair", () => {
  it("gives the same pair whichever way round it is asked", () => {
    // The whole point: two people opening each other's profile at the same
    // moment must produce one row, not two.
    expect(orderPair(ALICE, BOB)).toEqual(orderPair(BOB, ALICE));
  });

  it("puts the smaller id first", () => {
    expect(orderPair(BOB, ALICE)).toEqual({ userAId: ALICE, userBId: BOB });
  });

  it("refuses to pair somebody with themselves", () => {
    // Null rather than a throw: the caller is a form handler, and it has
    // something to say about this.
    expect(orderPair(ALICE, ALICE)).toBeNull();
  });
});

describe("otherSide", () => {
  it("names the other person from either seat", () => {
    const pair = orderPair(ALICE, BOB);
    if (pair === null) throw new Error("unreachable");
    expect(otherSide(pair, ALICE)).toBe(BOB);
    expect(otherSide(pair, BOB)).toBe(ALICE);
  });
});

describe("friendshipView", () => {
  it("says none when there is nothing between them", () => {
    expect(friendshipView(null, ALICE)).toBe("none");
    expect(friendshipView(undefined, ALICE)).toBe("none");
  });

  it("tells the two sides of one pending request apart", () => {
    // One row, two meanings: the person who asked can only cancel, and the
    // person who was asked is the only one who can accept.
    const pending = { status: "PENDING", requestedById: ALICE } as const;
    expect(friendshipView(pending, ALICE)).toBe("outgoing");
    expect(friendshipView(pending, BOB)).toBe("incoming");
  });

  it("says friends to both, once it is accepted", () => {
    const accepted = { status: "ACCEPTED", requestedById: ALICE } as const;
    expect(friendshipView(accepted, ALICE)).toBe("friends");
    expect(friendshipView(accepted, BOB)).toBe("friends");
  });
});

describe("the buttons on a profile", () => {
  it("offers one way forward in each state, and both answers to a request", () => {
    expect(friendshipActions("none")).toEqual(["request"]);
    expect(friendshipActions("outgoing")).toEqual(["cancel"]);
    // A request received is answered either way: accepting leads.
    expect(friendshipActions("incoming")).toEqual(["accept", "decline"]);
    // Behind "Ami ✓", not in plain sight.
    expect(friendshipActions("friends")).toEqual(["unfriend"]);
    expect(FRIENDS_LABEL).toBe("Ami ✓");
  });

  it("says what pressing each one does", () => {
    // The label is the action, not the state: somebody who has asked sees how
    // to take it back, not a reminder that they asked.
    expect(FRIENDSHIP_ACTION_LABEL).toEqual({
      request: "Ajouter en ami",
      cancel: "Annuler la demande",
      accept: "Accepter",
      decline: "Refuser",
      unfriend: "Retirer des amis",
    });
  });

  it("asks to add or to accept, and deletes the row for the other three", () => {
    expect(friendshipMove("request")).toBe("request");
    expect(friendshipMove("accept")).toBe("request");
    expect(friendshipMove("cancel")).toBe("remove");
    expect(friendshipMove("decline")).toBe("remove");
    expect(friendshipMove("unfriend")).toBe("remove");
  });

  it("lands on friends when asking turned out to be agreeing", () => {
    expect(friendshipAfter("request", false)).toBe("outgoing");
    expect(friendshipAfter("request", true)).toBe("friends");
    expect(friendshipAfter("remove", false)).toBe("none");
  });

  it("asks before ending a friendship, and only then", () => {
    expect(friendshipActionAsksFirst("unfriend")).toBe(true);
    expect(friendshipActionAsksFirst("decline")).toBe(false);
    expect(friendshipActionAsksFirst("cancel")).toBe(false);
    expect(friendshipActionAsksFirst("accept")).toBe(false);
    expect(friendshipActionAsksFirst("request")).toBe(false);
    expect(unfriendQuestion("Alex")).toBe("Retirer Alex de tes amis ?");
    expect(UNFRIEND_PROMPT).toBe("Retirer de tes amis ?");
  });

  it("offers a duel to a friend, and to nobody else", () => {
    expect(canChallenge("friends")).toBe(true);
    expect(canChallenge("incoming")).toBe(false);
    expect(canChallenge("outgoing")).toBe(false);
    expect(canChallenge("none")).toBe(false);
  });
});
