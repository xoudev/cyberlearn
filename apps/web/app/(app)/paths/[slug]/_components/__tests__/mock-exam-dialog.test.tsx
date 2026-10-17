// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOverview } from "@/lib/exam/mock-exam";

/**
 * "Examen blanc" on a path's page: the presentation in a window over the
 * path (what the exam covers, its rules, the attempts already made), and the
 * exam's page in place of the window once it is started.
 */

const m = vi.hoisted(() => ({
  value: null as string | null,
  open: vi.fn<(value?: string) => void>(),
  close: vi.fn<() => void>(),
  replace: vi.fn<(href: string) => void>(),
  mockOverviewAction: vi.fn<(slug: unknown) => Promise<MockOverview | null>>(),
}));

// The hook and the host are covered once (query-dialog-host.test.tsx): here,
// the address says open or closed through `m.value`.
vi.mock("@/hooks/use-query-dialog", () => ({
  useQueryDialog: (key: string) => ({
    value: key === "mock" ? m.value : null,
    open: m.open,
    close: m.close,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace }) }));
vi.mock("../../mock-exam/_actions/mock-exam-actions", () => ({
  mockOverviewAction: m.mockOverviewAction,
}));

const { MockExamDialog } = await import("../mock-exam-dialog");

const OVERVIEW: MockOverview = {
  pathId: "p1",
  pathSlug: "linux",
  pathTitle: "Linux",
  domains: [
    { domain: "Les fichiers", available: 5, drawn: 3 },
    { domain: "Les droits", available: 3, drawn: 3 },
  ],
  questionCount: 6,
  timeLimitMinutes: 10,
  ready: true,
  running: null,
  history: [
    {
      submittedAt: "2026-10-01T10:00:00.000Z",
      score: 50,
      late: false,
      domains: [{ domain: "Les droits", correct: 1, total: 3, percent: 33 }],
    },
  ],
};

function Page(): React.JSX.Element {
  return <MockExamDialog slug="linux" pathTitle="Linux" />;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.value = null;
  m.mockOverviewAction.mockResolvedValue(OVERVIEW);
});

afterEach(cleanup);

describe("MockExamDialog", () => {
  it("is a button while closed, which opens the window by its parameter", () => {
    render(<Page />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Examen blanc" }));
    expect(m.open).toHaveBeenCalledTimes(1);
    // Nothing is read until the window opens.
    expect(m.mockOverviewAction).not.toHaveBeenCalled();
  });

  it("shows what the exam covers and the attempts already made", async () => {
    m.value = "1";
    render(<Page />);
    expect(screen.getByRole("dialog", { name: "Linux" })).toBeTruthy();
    const modules = within(
      await screen.findByRole("list", { name: "Les modules couverts" }),
    ).getAllByRole("listitem");
    expect(modules.map((li) => li.textContent)).toEqual([
      "Les fichiers3 questions",
      // With the last exam's score of the module.
      "Les droits3 questionsDernier examen : 1 / 3 · à revoir",
    ]);
    expect(screen.getByRole("region", { name: "Tes examens blancs" }).textContent).toContain(
      "50 %",
    );
    expect(m.mockOverviewAction).toHaveBeenCalledWith("linux");
  });

  it("starts the exam on its page, in place of the window", async () => {
    m.value = "1";
    render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: /Commencer l'examen blanc/u }));
    expect(m.replace).toHaveBeenCalledWith("/paths/linux/mock-exam?go=1");
  });

  it("takes up an attempt still running", async () => {
    m.value = "1";
    m.mockOverviewAction.mockResolvedValue({
      ...OVERVIEW,
      running: { startedAt: "2026-10-17T10:00:00.000Z" },
    });
    render(<Page />);
    expect(await screen.findByText(/Un examen blanc est en cours/u)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Reprendre l'examen en cours/u }));
    expect(m.replace).toHaveBeenCalledWith("/paths/linux/mock-exam?go=1");
  });

  it("offers no start on a path with too few questions, and says so", async () => {
    m.value = "1";
    m.mockOverviewAction.mockResolvedValue({
      ...OVERVIEW,
      domains: [],
      questionCount: 0,
      ready: false,
    });
    render(<Page />);
    expect(
      await screen.findByText(
        "Ce parcours n'a pas encore assez de questions pour un examen blanc.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Aucun module de ce parcours n'a encore de quiz.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Commencer/u })).toBeNull();
  });

  it("says so when the overview cannot be read, and tries again on demand", async () => {
    m.value = "1";
    m.mockOverviewAction.mockRejectedValueOnce(new Error("db"));
    render(<Page />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Impossible de charger l'examen blanc",
    );
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("list", { name: "Les modules couverts" })).toBeTruthy();
    expect(m.mockOverviewAction).toHaveBeenCalledTimes(2);
  });

  it("closes on Escape and from its button", async () => {
    m.value = "1";
    render(<Page />);
    await screen.findByRole("list", { name: "Les modules couverts" });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(m.close).toHaveBeenCalledTimes(2);
  });
});
