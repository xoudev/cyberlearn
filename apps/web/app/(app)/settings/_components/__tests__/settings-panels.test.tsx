// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsData } from "../../_lib/settings-data";

/**
 * The drawer's seven sections stay mounted, the others hidden: a section
 * shown again is as it was left, half-typed field included.
 */

function stand(name: string): () => React.JSX.Element {
  return function Section(): React.JSX.Element {
    const [value, setValue] = React.useState("");
    return (
      <label>
        {name}
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      </label>
    );
  };
}

vi.mock("../../profile/_components/ProfileSection", () => ({ ProfileSection: stand("profil") }));
vi.mock("../../privacy/_components/PrivacySection", () => ({
  PrivacySection: stand("vie privée"),
}));
vi.mock("../../preferences/_components/PreferencesSection", () => ({
  PreferencesSection: stand("préférences"),
}));
vi.mock("../../notifications/_components/NotificationsSection", () => ({
  NotificationsSection: stand("notifications"),
}));
vi.mock("../../moderation/_components/ModerationSection", () => ({
  ModerationSection: stand("modération"),
}));
vi.mock("../../account/_components/AccountSection", () => ({ AccountSection: stand("compte") }));
vi.mock("../../data/_components/DataSection", () => ({ DataSection: stand("données") }));

import SettingsPanels from "../SettingsPanels";

// The stand-ins ignore it: any value of the right shape will do.
const DATA: SettingsData = {
  profile: { username: "ada", displayName: "", bio: "", avatarUrl: "", avatarPreview: null },
  privacy: { visibility: "HIDDEN", publicProfile: false, friendsLeaderboard: false },
  preferences: { spacedRepetition: true },
  notifications: {
    reviewReminders: true,
    weeklyDigest: true,
    streakReminder: true,
    emailNotifications: true,
  },
  moderation: { events: [] },
  account: { email: null, emailConfirmed: false },
  data: { pendingExpiresAt: null, certificateCount: 0 },
};

afterEach(cleanup);

describe("the drawer's sections", () => {
  it("show the current one alone, each as a named region", () => {
    render(<SettingsPanels data={DATA} section="privacy" />);
    expect(screen.getByRole("region", { name: "Confidentialité" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Profil" })).toBeNull();
    expect(screen.getByLabelText("vie privée")).toBeTruthy();
  });

  it("keep what was typed in a section while another is shown", () => {
    const view = render(<SettingsPanels data={DATA} section="profile" />);
    fireEvent.change(screen.getByLabelText("profil"), { target: { value: "Ada L." } });
    view.rerender(<SettingsPanels data={DATA} section="data" />);
    expect(screen.queryByRole("region", { name: "Profil" })).toBeNull();
    view.rerender(<SettingsPanels data={DATA} section="profile" />);
    const field = screen.getByLabelText("profil");
    expect(field instanceof HTMLInputElement && field.value).toBe("Ada L.");
  });
});
