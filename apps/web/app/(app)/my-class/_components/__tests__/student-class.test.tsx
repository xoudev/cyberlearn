import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudentClass, type StudentClassMember } from "../student-class";

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
      people={[member({ id: ME, name: "Moi", username: "moi" }), ...people]}
    />,
  );
}

const marks = (html: string): number => html.split('aria-label="Ami"').length - 1;

describe("StudentClass roster", () => {
  it("marks a classmate who is a friend", () => {
    expect(marks(render([member({ id: "f1", isFriend: true })]))).toBe(1);
  });

  it("never marks an anonymous classmate", () => {
    const html = render([
      member({ id: "f2", name: "Anonyme", username: null, visible: false, isFriend: true }),
    ]);
    expect(marks(html)).toBe(0);
    expect(html).toContain("Anonyme");
  });

  it("marks nobody else, and not the reader", () => {
    expect(marks(render([member({ id: "s1" }), member({ id: "s2", name: "Sam" })]))).toBe(0);
  });
});
