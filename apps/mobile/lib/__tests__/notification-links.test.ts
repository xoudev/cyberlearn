import { describe, expect, it } from "vitest";
import { challengesTabHref } from "@cyberlearn/lib/challenges/tabs";
import { profileTabHref } from "@cyberlearn/lib/social/profile-tabs";
import { deviceNotificationData, inAppRouteFor, tapRoute } from "../notification-links";

describe("a tap on a notification in the phone's tray", () => {
  const ID = "33333333-3333-4333-8333-333333333333";
  const USER = "44444444-4444-4444-8444-444444444444";

  it("reads back the row, the account and the link the app posted", () => {
    expect(deviceNotificationData({ id: ID, userId: USER, actionUrl: "/duels" })).toEqual({
      id: ID,
      userId: USER,
      actionUrl: "/duels",
    });
    expect(deviceNotificationData({ id: ID, userId: USER, actionUrl: null })).toEqual({
      id: ID,
      userId: USER,
      actionUrl: null,
    });
  });

  it("ignores a notification the app did not post, or one posted before taps were read", () => {
    expect(deviceNotificationData(undefined)).toBeNull();
    expect(deviceNotificationData(null)).toBeNull();
    expect(deviceNotificationData({})).toBeNull();
    expect(deviceNotificationData({ id: ID })).toBeNull();
    expect(deviceNotificationData({ id: 7, userId: USER })).toBeNull();
    expect(deviceNotificationData({ id: "", userId: USER })).toBeNull();
  });

  it("drops a link that is not text rather than the whole notification", () => {
    expect(deviceNotificationData({ id: ID, userId: USER, actionUrl: 3 })).toEqual({
      id: ID,
      userId: USER,
      actionUrl: null,
    });
  });

  it("opens the screen the notification is about", () => {
    expect(tapRoute("/forum/reseau/subnetting")).toEqual({
      pathname: "/forum/[category]/[topic]",
      params: { category: "reseau", topic: "subnetting" },
    });
  });

  it("opens the inbox for a notification with no screen of its own", () => {
    expect(tapRoute(null)).toEqual({ pathname: "/notifications" });
    expect(tapRoute("/api/me/export")).toEqual({ pathname: "/notifications" });
  });

  it("opens the profile's sub-tab or the tournaments for the site's tab addresses", () => {
    expect(tapRoute(profileTabHref("certificats"))).toEqual({
      pathname: "/profile",
      params: { tab: "certificats" },
    });
    expect(tapRoute(challengesTabHref("tournois"))).toEqual({ pathname: "/tournaments" });
  });
});

describe("inAppRouteFor", () => {
  it("opens a forum reply on its thread", () => {
    expect(inAppRouteFor("/forum/reseau/subnetting")).toEqual({
      pathname: "/forum/[category]/[topic]",
      params: { category: "reseau", topic: "subnetting" },
    });
  });

  it("opens a lesson or a path on its screen", () => {
    expect(inAppRouteFor("/lessons/tcp-handshake")).toEqual({
      pathname: "/lessons/[slug]",
      params: { slug: "tcp-handshake" },
    });
    expect(inAppRouteFor("/paths/reseau-bases/")).toEqual({
      pathname: "/paths/[slug]",
      params: { slug: "reseau-bases" },
    });
  });

  it("opens a duel on its screen, and the duels list", () => {
    expect(inAppRouteFor("/duels/11111111-1111-4111-8111-111111111111")).toEqual({
      pathname: "/duels/[id]",
      params: { id: "11111111-1111-4111-8111-111111111111" },
    });
    expect(inAppRouteFor("/duels")).toEqual({ pathname: "/duels" });
    expect(inAppRouteFor("/duels/pas-un-id")).toBeNull();
  });

  it("opens a tournament on its screen, and the tournaments list", () => {
    expect(inAppRouteFor("/tournaments/22222222-2222-4222-8222-222222222222")).toEqual({
      pathname: "/tournaments/[id]",
      params: { id: "22222222-2222-4222-8222-222222222222" },
    });
    expect(inAppRouteFor("/tournaments")).toEqual({ pathname: "/tournaments" });
    expect(inAppRouteFor("/tournaments/pas-un-id")).toBeNull();
  });

  it("opens the profile a friend request or an acceptance points at", () => {
    expect(inAppRouteFor("/u/alex-b")).toEqual({
      pathname: "/u/[username]",
      params: { username: "alex-b" },
    });
    expect(inAppRouteFor("/u/alex/badges")).toBeNull();
    expect(inAppRouteFor("/u/")).toBeNull();
  });

  it("maps the site's pages that have a screen here", () => {
    expect(inAppRouteFor("/friends")).toEqual({ pathname: "/friends" });
    expect(inAppRouteFor("/notes")).toEqual({ pathname: "/notes" });
    expect(inAppRouteFor("/my-class")).toEqual({ pathname: "/my-class" });
    expect(inAppRouteFor("/badges")).toEqual({ pathname: "/profile", params: { tab: "badges" } });
    expect(inAppRouteFor("/settings/moderation")).toEqual({ pathname: "/moderation" });
    expect(inAppRouteFor("/challenges")).toEqual({ pathname: "/challenges" });
  });

  it("opens the placement test the console reset on the app's own screen", () => {
    expect(inAppRouteFor("/onboarding/placement-test")).toEqual({ pathname: "/placement" });
    expect(inAppRouteFor("/onboarding/placement-test/")).toEqual({ pathname: "/placement" });
    expect(inAppRouteFor("/onboarding")).toBeNull();
  });

  it("opens the day's recall for the daily reminder, as the site opens its window", () => {
    // The Révisions screen is the app's day's recall.
    expect(inAppRouteFor("/dashboard?rappel=1")).toEqual({ pathname: "/revisions" });
    expect(inAppRouteFor("/dashboard/?rappel=1")).toEqual({ pathname: "/revisions" });
    expect(inAppRouteFor("/dashboard?tab=x&rappel=1")).toEqual({ pathname: "/revisions" });
    expect(tapRoute("/dashboard?rappel=1")).toEqual({ pathname: "/revisions" });
    // The older reminders pointed at the site's revisions page.
    expect(inAppRouteFor("/revisions")).toEqual({ pathname: "/revisions" });
    // Any other query is a window over the site's dashboard that the Home tab
    // has no counterpart of.
    expect(inAppRouteFor("/dashboard?settings=preferences")).toBeNull();
    expect(inAppRouteFor("/dashboard?nonrappel=1")).toBeNull();
  });

  it("opens the Home tab for the site's dashboard, and every screen an announcement can name", () => {
    expect(inAppRouteFor("/dashboard")).toEqual({ pathname: "/home" });
    expect(inAppRouteFor("/dashboard/")).toEqual({ pathname: "/home" });
    expect(inAppRouteFor("/paths")).toEqual({ pathname: "/paths" });
    expect(inAppRouteFor("/leaderboard")).toEqual({ pathname: "/leaderboard" });
    expect(inAppRouteFor("/forum")).toEqual({ pathname: "/forum" });
    expect(inAppRouteFor("/support")).toEqual({ pathname: "/support" });
    expect(inAppRouteFor("/locker")).toEqual({ pathname: "/locker" });
    expect(inAppRouteFor("/changelog")).toEqual({ pathname: "/changelog" });
    // The glossary's French address, the screen's English one.
    expect(inAppRouteFor("/glossaire")).toEqual({ pathname: "/glossary" });
    expect(tapRoute("/paths")).toEqual({ pathname: "/paths" });
  });

  it("opens a section of the forum, a thread and a challenge on their own screens", () => {
    expect(inAppRouteFor("/forum/reseau")).toEqual({
      pathname: "/forum/[category]",
      params: { category: "reseau" },
    });
    expect(inAppRouteFor("/forum/reseau/")).toEqual({
      pathname: "/forum/[category]",
      params: { category: "reseau" },
    });
    // A thread is still a thread, one segment further.
    expect(inAppRouteFor("/forum/reseau/subnetting")).toEqual({
      pathname: "/forum/[category]/[topic]",
      params: { category: "reseau", topic: "subnetting" },
    });
    expect(inAppRouteFor("/challenges/dossier-cache")).toEqual({
      pathname: "/challenges/[slug]",
      params: { slug: "dossier-cache" },
    });
    expect(inAppRouteFor("/challenges/dossier-cache/")).toEqual({
      pathname: "/challenges/[slug]",
      params: { slug: "dossier-cache" },
    });
    // A support request, by its id.
    expect(inAppRouteFor("/support/55555555-5555-4555-8555-555555555555")).toEqual({
      pathname: "/support/[id]",
      params: { id: "55555555-5555-4555-8555-555555555555" },
    });
  });

  it("leads nowhere for the addresses beneath these pages that the app has no screen for", () => {
    expect(inAppRouteFor("/paths/reseau-bases/modules/2")).toBeNull();
    expect(inAppRouteFor("/leaderboard/amis")).toBeNull();
    expect(inAppRouteFor("/support/7f1d")).toBeNull();
    expect(inAppRouteFor("/support/nouveau")).toBeNull();
    expect(inAppRouteFor("/locker/frames")).toBeNull();
    expect(inAppRouteFor("/forum/Reseau")).toBeNull();
    expect(inAppRouteFor("/challenges/dossier cache")).toBeNull();
    expect(inAppRouteFor("/glossaire/terme")).toBeNull();
    expect(inAppRouteFor("/changelog/3-6")).toBeNull();
  });

  it("opens the certificates sub-tab of the profile, for new notices and old ones", () => {
    expect(inAppRouteFor("/certificates")).toEqual({
      pathname: "/profile",
      params: { tab: "certificats" },
    });
    // Before the notice pointed at the list, it pointed at the PDF itself.
    expect(
      inAppRouteFor("/api/certificates/11111111-1111-4111-8111-111111111111/download"),
    ).toEqual({ pathname: "/profile", params: { tab: "certificats" } });
    expect(inAppRouteFor("/api/certificates/abc/download/extra")).toBeNull();
  });

  it("opens the sub-tab of the profile a link to one of the site's profile tabs names", () => {
    expect(inAppRouteFor(profileTabHref("certificats"))).toEqual({
      pathname: "/profile",
      params: { tab: "certificats" },
    });
    expect(inAppRouteFor(profileTabHref("badges"))).toEqual({
      pathname: "/profile",
      params: { tab: "badges" },
    });
    // The activity has no sub-tab here: the profile opens as it is.
    expect(inAppRouteFor(profileTabHref("activite"))).toEqual({ pathname: "/profile" });
    expect(inAppRouteFor("/profile")).toEqual({ pathname: "/profile" });
    expect(inAppRouteFor("/profile?tab=inconnu")).toEqual({ pathname: "/profile" });
    // The tab is read wherever it sits in the query, and a fragment is dropped.
    expect(inAppRouteFor("/profile?ref=bell&tab=certificats#top")).toEqual({
      pathname: "/profile",
      params: { tab: "certificats" },
    });
  });

  it("opens the tournaments screen for the site's Tournois tab of the challenges", () => {
    expect(inAppRouteFor(challengesTabHref("tournois"))).toEqual({ pathname: "/tournaments" });
    expect(inAppRouteFor(challengesTabHref("defis"))).toEqual({ pathname: "/challenges" });
    expect(inAppRouteFor("/challenges?tab=inconnu")).toEqual({ pathname: "/challenges" });
  });

  it("still opens the old addresses notices already stored carry", () => {
    expect(inAppRouteFor("/badges")).toEqual({ pathname: "/profile", params: { tab: "badges" } });
    expect(inAppRouteFor("/certificates")).toEqual({
      pathname: "/profile",
      params: { tab: "certificats" },
    });
    expect(inAppRouteFor("/tournaments")).toEqual({ pathname: "/tournaments" });
  });

  it("leads nowhere for what has no screen, or for no link at all", () => {
    expect(inAppRouteFor(null)).toBeNull();
    expect(inAppRouteFor("/api/me/export")).toBeNull();
    expect(inAppRouteFor("https://evil.example/lessons/x")).toBeNull();
  });
});
