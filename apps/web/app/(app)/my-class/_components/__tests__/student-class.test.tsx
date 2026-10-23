// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StudentClassMember } from "../student-class";

// "Ajouter" imports the friendship actions, whose session check reads the
// environment; nothing here calls them.
vi.mock("@/app/(app)/_actions/friend-actions", () => ({
  sendFriendRequestAction: vi.fn(),
  sendFriendRequestByHandleAction: vi.fn(),
}));

const { StudentClass } = await import("../student-class");

/**
 * The friend mark on a class roster: beside a classmate the reader can see,
 * never beside an "Anonyme" row, whatever the flag says.
 */

const ME = "me";

function member(overrides: Partial<StudentClassMember>): StudentClassMember {
  return {
    id: "someone",
    name: "Alex",
    username: "alex",
    visible: true,
    isFriend: false,
    friendship: "none",
    level: 4,
    xpTotal: 300,
    completed: 3,
    ...overrides,
  };
}

function render(people: StudentClassMember[]): string {
  return renderToStaticMarkup(
    <StudentClass
      userId={ME}
      heading={{ id: "c1", name: "BTS SIO 1", establishment: "Lycée", promotion: "2026" }}
      teachers={[]}
      people={[member({ id: ME, name: "Moi", username: "moi", friendship: null }), ...people]}
    />,
  );
}

const marks = (html: string): number => html.split('aria-label="Ami"').length - 1;

describe("StudentClass roster", () => {
  it("marks a classmate who is a friend", () => {
    expect(marks(render([member({ id: "f1", isFriend: true, friendship: "friends" })]))).toBe(1);
  });

  it("never marks an anonymous classmate", () => {
    const html = render([
      member({
        id: "f2",
        name: "Anonyme",
        username: null,
        visible: false,
        isFriend: true,
        friendship: null,
      }),
    ]);
    expect(marks(html)).toBe(0);
    expect(html).toContain("Anonyme");
  });

  it("offers Ajouter beside a named classmate who is not a friend yet, and only there", () => {
    const html = render([
      member({ id: "s1", name: "Sam", friendship: "none" }),
      member({ id: "s2", name: "Lou", friendship: "incoming" }),
      member({ id: "f1", name: "Alex", isFriend: true, friendship: "friends" }),
      member({ id: "a1", name: "Anonyme", username: null, visible: false, friendship: null }),
    ]);
    expect(html).toContain('aria-label="Ajouter Sam en ami"');
    expect(html).toContain('aria-label="Accepter la demande de Lou"');
    expect(html).not.toContain("Ajouter Alex");
    expect(html).not.toContain("Ajouter Anonyme");
    expect(html).not.toContain("Ajouter Moi");
  });

  it("keeps the button out of the name, which is clipped to one line", () => {
    // The name has `overflow: hidden` for its ellipsis, and a clip also cuts
    // the touch area the button grows on a phone: the button sits beside it.
    const page = document.createElement("div");
    page.innerHTML = render([member({ id: "s1", name: "Sam", friendship: "none" })]);
    const button = page.querySelector(".add-friend-btn");
    expect(button).not.toBeNull();
    expect(button?.closest(".cls-person__name")).toBeNull();
    const who = button?.closest(".cls-person__who");
    expect(who).not.toBeNull();
    expect(who?.querySelector(".cls-person__name")?.textContent).toContain("Sam");
  });

  it("says a request already sent", () => {
    expect(render([member({ id: "s1", friendship: "outgoing" })])).toContain("Demande envoyée");
  });

  it("marks nobody else, and not the reader", () => {
    expect(marks(render([member({ id: "s1" }), member({ id: "s2", name: "Sam" })]))).toBe(0);
  });
});
