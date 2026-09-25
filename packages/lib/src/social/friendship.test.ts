import { describe, expect, it } from "vitest";
import {
  FRIENDSHIP_ACTION_LABEL,
  friendshipAfter,
  friendshipMove,
  friendshipView,
  orderPair,
  otherSide,
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

describe("the button on a profile", () => {
  it("says what pressing it does, in each state", () => {
    // The label is the action, not the state: somebody who has asked sees how
    // to take it back, not a reminder that they asked.
    expect(FRIENDSHIP_ACTION_LABEL).toEqual({
      none: "Ajouter en ami",
      outgoing: "Annuler la demande",
      incoming: "Accepter la demande",
      friends: "Retirer des amis",
    });
  });

  it("asks from nothing or from their request, and undoes from the other two", () => {
    expect(friendshipMove("none")).toBe("request");
    expect(friendshipMove("incoming")).toBe("request");
    expect(friendshipMove("outgoing")).toBe("remove");
    expect(friendshipMove("friends")).toBe("remove");
  });

  it("lands on friends when asking turned out to be agreeing", () => {
    expect(friendshipAfter("request", false)).toBe("outgoing");
    expect(friendshipAfter("request", true)).toBe("friends");
    expect(friendshipAfter("remove", false)).toBe("none");
  });
});
