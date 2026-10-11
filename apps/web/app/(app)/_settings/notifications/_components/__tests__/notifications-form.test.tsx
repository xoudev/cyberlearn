// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  update: vi.fn<(prev: unknown, fd: FormData) => Promise<{ success?: boolean; error?: string }>>(),
}));

vi.mock("../../_actions/update-notifications", () => ({ updateNotificationsAction: m.update }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { NotificationsForm } = await import("../NotificationsForm");

/**
 * The notification switches: only the ones something sends are shown, and
 * product news, which has no row, goes back exactly as it was stored.
 */

afterEach(cleanup);

beforeEach(() => {
  m.update.mockReset();
  m.update.mockResolvedValue({ success: true });
});

function renderForm(): void {
  render(
    <NotificationsForm
      initialReviewReminders={true}
      initialWeeklyDigest={false}
      initialEmailNotifications={true}
    />,
  );
}

describe("NotificationsForm", () => {
  it("shows the switches something sends, and no dead one", () => {
    renderForm();
    expect(screen.getByRole("switch", { name: "Rappels de révision" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Avis par email" })).toBeTruthy();
    // Nothing sends a streak alert or product news: no greyed-out switch.
    expect(screen.queryByRole("switch", { name: "Alerte de série" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Nouveautés produit" })).toBeNull();
    expect(screen.queryByText(/Email quand une mission/)).toBeNull();
  });

  it("saves the flipped switch and hands product news back untouched", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("switch", { name: "Rappels de révision" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(m.update).toHaveBeenCalledTimes(1);
    });
    const fd = m.update.mock.calls[0]?.[1];
    expect(fd?.get("reviewReminders")).toBe("false");
    expect(fd?.get("emailNotifications")).toBe("true");
    expect(fd?.get("weeklyDigest")).toBe("false");
  });
});
