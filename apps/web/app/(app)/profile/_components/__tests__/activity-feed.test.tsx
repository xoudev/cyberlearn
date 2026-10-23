// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ActivityFeed, type SerializedLesson } from "../activity-feed";

/**
 * The profile's Activité tab lists the latest lessons only; its counter is the
 * total. A list that stops short of the total says how many it leaves out.
 */

function lesson(n: number): SerializedLesson {
  return {
    lessonId: `lesson-${String(n)}`,
    slug: `lesson-${String(n)}`,
    title: `Leçon ${String(n)}`,
    category: "CYBERSEC",
    xpReward: 20,
    completedDateStr: "3 oct.",
  };
}

afterEach(() => {
  cleanup();
});

describe("ActivityFeed", () => {
  it("says how many lessons the list leaves out when the learner finished more than it shows", () => {
    render(<ActivityFeed lessons={[lesson(1), lesson(2)]} total={35} />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByText("// et 33 autres")).toBeTruthy();
  });

  it("says nothing more when the list is the whole activity", () => {
    render(<ActivityFeed lessons={[lesson(1), lesson(2)]} total={2} />);

    expect(screen.queryByText(/autre/)).toBeNull();
  });

  it("reads the list as the whole activity when no total is given", () => {
    render(<ActivityFeed lessons={[lesson(1)]} />);

    expect(screen.queryByText(/autre/)).toBeNull();
  });

  it("keeps its empty state", () => {
    render(<ActivityFeed lessons={[]} total={0} />);

    expect(screen.getByText("// Aucune activité pour l'instant")).toBeTruthy();
  });
});
