import { describe, expect, it } from "vitest";
import { inAppRouteFor } from "../notification-links";

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
    expect(inAppRouteFor("/badges")).toEqual({ pathname: "/profile" });
  });

  it("leads nowhere for what has no screen, or for no link at all", () => {
    expect(inAppRouteFor(null)).toBeNull();
    expect(inAppRouteFor("/challenges")).toBeNull();
    expect(inAppRouteFor("/api/certificates/abc/download")).toBeNull();
    expect(inAppRouteFor("https://evil.example/lessons/x")).toBeNull();
  });
});
