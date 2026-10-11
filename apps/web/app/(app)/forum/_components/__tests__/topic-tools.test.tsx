// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  moderateTopicAction:
    vi.fn<
      (input: {
        topicId: string;
        path: string;
        pinned?: boolean;
        locked?: boolean;
      }) => Promise<{ ok: boolean; error?: string }>
    >(),
}));

vi.mock("../../_actions/forum-actions", () => m);

const { TopicTools } = await import("../topic-tools");

/** Pinning and closing a thread: a refusal is said, not dropped. */

const TOPIC = "11111111-1111-4111-8111-111111111111";
const PATH = "/forum/reseau/subnetting";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.moderateTopicAction.mockResolvedValue({ ok: true });
});

describe("TopicTools", () => {
  it("pins and closes the thread it is drawn for", () => {
    render(<TopicTools topicId={TOPIC} pinned={false} locked={false} path={PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Épingler" }));
    expect(m.moderateTopicAction).toHaveBeenCalledWith({
      topicId: TOPIC,
      path: PATH,
      pinned: true,
    });
  });

  it("says why the server refused", async () => {
    m.moderateTopicAction.mockResolvedValue({ ok: false, error: "Action réservée." });
    render(<TopicTools topicId={TOPIC} pinned={false} locked={false} path={PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Action réservée.");
  });

  it("says so when the call itself fails", async () => {
    m.moderateTopicAction.mockRejectedValue(new Error("network"));
    render(<TopicTools topicId={TOPIC} pinned locked={false} path={PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Désépingler" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Action impossible/);
  });
});
