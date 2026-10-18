import { describe, expect, it } from "vitest";
import {
  addableHandle,
  answerableSender,
  boardName,
  friendsBoardNotice,
  friendsCountLabel,
  handleFrom,
  joinedLabel,
  listCountLabel,
  longDay,
  profileCategory,
  profileCounts,
  profileEyebrow,
  profileRarity,
  profileTarget,
  removeLabel,
  shortDay,
  showsFriendMark,
  unfriendAlert,
  type PublicProfile,
} from "../friends";

describe("ending a friendship", () => {
  it("asks first, in the site's words, with the way out first", () => {
    let removed = 0;
    const alert = unfriendAlert("Alex", () => {
      removed++;
    });
    expect(alert.title).toBe("Retirer Alex de tes amis ?");
    expect(alert.message).toMatch(/Aucune notification/);
    expect(alert.buttons.map((b) => [b.text, b.style])).toEqual([
      ["Annuler", "cancel"],
      ["Retirer", "destructive"],
    ]);
    expect(alert.buttons[0]?.onPress).toBeUndefined();
    alert.buttons[1]?.onPress?.();
    expect(removed).toBe(1);
  });
});

describe("a name in the friends lists", () => {
  it("opens the profile only when the server says it would open", () => {
    expect(profileTarget({ username: "alex", profileOpen: true })).toBe("alex");
    // Private, and only a request between them: "Profil introuvable" behind the tap.
    expect(profileTarget({ username: "sam", profileOpen: false })).toBeNull();
    expect(profileTarget({ username: null, profileOpen: true })).toBeNull();
  });
});

describe("the friends lists", () => {
  it("words the one undo call the way the site's panel does, per list", () => {
    expect(removeLabel("incoming")).toBe("Refuser");
    expect(removeLabel("friends")).toBe("Retirer");
    expect(removeLabel("outgoing")).toBe("Annuler");
  });

  it("counts people and requests", () => {
    expect(listCountLabel("friends", 1)).toBe("1 ami");
    expect(listCountLabel("friends", 4)).toBe("4 amis");
    expect(listCountLabel("incoming", 2)).toBe("2 demandes");
    expect(listCountLabel("outgoing", 1)).toBe("1 demande");
  });
});

describe("the friends board", () => {
  it("counts the others, as the site's heading does", () => {
    expect(friendsCountLabel(0)).toBe("personne pour l'instant");
    expect(friendsCountLabel(1)).toBe("1 ami");
    expect(friendsCountLabel(3)).toBe("3 amis");
  });

  it("says whether the reader is on their friends' boards, in the site's words", () => {
    expect(friendsBoardNotice(true)).toBe("Tes amis te voient dans leur propre classement.");
    expect(friendsBoardNotice(false)).toMatch(/^Tu n'apparais pas dans le classement de tes amis/);
  });

  it("marks a named friend only, never an anonymous row nor the reader", () => {
    const named = { isCurrentUser: false, displayName: "Alex", username: "alex" };
    const anonymous = { isCurrentUser: false, displayName: null, username: null };
    expect(showsFriendMark({ ...named, isFriend: true })).toBe(true);
    expect(showsFriendMark({ ...named, isFriend: false })).toBe(false);
    expect(showsFriendMark({ ...anonymous, isFriend: true })).toBe(false);
    expect(showsFriendMark({ ...named, isFriend: true, isCurrentUser: true })).toBe(false);
    // A server from before the marks sends no flag.
    expect(showsFriendMark(named)).toBe(false);
  });

  it("puts a chip beside a public row as the site does: not on the reader, a friend, nor a nameless row", () => {
    const row = { isCurrentUser: false, username: "alex" };
    expect(addableHandle({ ...row, friendship: "none" })).toBe("alex");
    expect(addableHandle({ ...row, friendship: "incoming" })).toBe("alex");
    // A request on its way keeps the chip, which says it was sent.
    expect(addableHandle({ ...row, friendship: "outgoing" })).toBe("alex");
    expect(addableHandle({ ...row, friendship: "friends" })).toBeNull();
    expect(addableHandle({ ...row, friendship: "none", isCurrentUser: true })).toBeNull();
    expect(addableHandle({ ...row, friendship: "none", username: null })).toBeNull();
    // A private row, or a server from before the chip, says nothing.
    expect(addableHandle({ ...row, friendship: null })).toBeNull();
    expect(addableHandle(row)).toBeNull();
  });

  it("names everybody: nobody on it is anonymous", () => {
    expect(boardName({ displayName: "Alex", username: "alex" })).toBe("Alex");
    expect(boardName({ displayName: "", username: "alex" })).toBe("@alex");
    expect(boardName({ displayName: null, username: null })).toBe("?");
  });
});

describe("answering a request from its notification", () => {
  const SAM = "22222222-2222-4222-8222-222222222222";
  const request = { type: "FRIEND_REQUEST", metadata: { fromUserId: SAM } };

  it("answers for a sender still waiting on the reader", () => {
    expect(answerableSender(request, new Set([SAM]))).toBe(SAM);
  });

  it("offers nothing once the request is no longer waiting", () => {
    expect(answerableSender(request, new Set())).toBeNull();
  });

  it("offers nothing on another notification, nor one without its sender", () => {
    const waiting = new Set([SAM]);
    expect(answerableSender({ ...request, type: "DUEL_INVITE" }, waiting)).toBeNull();
    expect(answerableSender({ type: "FRIEND_REQUEST" }, waiting)).toBeNull();
    expect(answerableSender({ type: "FRIEND_REQUEST", metadata: null }, waiting)).toBeNull();
  });
});

describe("a profile page", () => {
  it("carries the site's eyebrow", () => {
    expect(profileEyebrow(false)).toBe("profil public");
    expect(profileEyebrow(true)).toBe("profil privé · visible par ses amis");
  });

  it("writes months the way the site's Intl formatting does, all twelve", () => {
    const long = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
    const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
    for (let month = 0; month < 12; month++) {
      const date = new Date(2026, month, 3, 12);
      expect(joinedLabel(date.toISOString())).toBe(`Membre depuis ${long.format(date)}`);
      expect(shortDay(date.toISOString())).toBe(short.format(date));
    }
  });

  it("has a dash for a lesson with no completion date", () => {
    expect(shortDay(null)).toBe("-");
  });
});

describe("finding somebody by handle", () => {
  it("reads a handle the way it is usually typed", () => {
    expect(handleFrom("@Alex ")).toBe("alex");
    expect(handleFrom("cyber-learn")).toBe("cyber-learn");
    expect(handleFrom("42user")).toBe("42user");
  });

  it("refuses what sign-up would never have accepted", () => {
    expect(handleFrom("")).toBeNull();
    expect(handleFrom("@")).toBeNull();
    expect(handleFrom("ab")).toBeNull();
    expect(handleFrom("-alex")).toBeNull();
    expect(handleFrom("alex-")).toBeNull();
    expect(handleFrom("al ex")).toBeNull();
    expect(handleFrom("a".repeat(33))).toBeNull();
    expect(handleFrom("../admin")).toBeNull();
  });
});

describe("what a profile sends", () => {
  it("draws an unknown rarity as common and leaves an unknown category unlabelled", () => {
    expect(profileRarity("EPIC")).toBe("EPIC");
    expect(profileRarity("MYTHIC")).toBe("COMMON");
    expect(profileCategory("NETWORK")).toBe("NETWORK");
    expect(profileCategory("CLOUD")).toBeNull();
  });

  const PROFILE: PublicProfile = {
    id: "u1",
    username: "alex",
    displayName: "Alex",
    bio: null,
    avatar: null,
    joinedAt: "2026-01-15T09:00:00.000Z",
    xpTotal: 0,
    streakDays: 0,
    level: { level: 1, current: 0, needed: 100 },
    isPrivate: false,
    isSelf: false,
    friendship: "none",
    badges: [{ id: "b1", name: "Premier pas", rarity: "COMMON", iconUrl: null }],
    recentLessons: [],
    skills: [],
    certificates: [],
    challenges: [],
  };

  it("prints the server's counts, not the lengths of the bounded lists", () => {
    const counts = { badges: 17, lessons: 48, challenges: 35, certificates: 2, paths: 3 };
    expect(profileCounts({ ...PROFILE, counts })).toEqual(counts);
  });

  it("falls back on the lists from a server that sends no counts", () => {
    expect(profileCounts(PROFILE)).toEqual({
      badges: 1,
      lessons: 0,
      challenges: 0,
      certificates: 0,
      paths: 0,
    });
  });

  it("writes a timeline's day in full, as the site does", () => {
    const full = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    for (let month = 0; month < 12; month++) {
      const date = new Date(2026, month, 12, 12);
      expect(longDay(date.toISOString())).toBe(full.format(date));
    }
  });
});
