"use client";

// "use client" justification: the tabs switch in place, and the address
// follows them (?tab=), read back through useSearchParams.

import React from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_PROFILE_TAB,
  PROFILE_TABS,
  type ProfileTab,
} from "@cyberlearn/lib/social/profile-tabs";
import { Tabs } from "@/components/tabs";
import { addressWith } from "@/hooks/use-query-dialog";
import { tabFromQuery } from "@/lib/tab-query";

const LABELS: Record<ProfileTab, string> = {
  activite: "Activité",
  badges: "Badges",
  certificats: "Certificats",
};

interface Props {
  /** The figure beside each tab's label: how many things it holds, or "3/24" of them. */
  counts: Record<ProfileTab, number | string>;
  /** What each tab shows, drawn on the server. */
  panels: Record<ProfileTab, React.ReactNode>;
}

/**
 * The profile's tabs: the activity, the badge collection, the certificates.
 *
 * The tab is in the address (`/profile?tab=certificats`, the values of
 * @cyberlearn/lib/social/profile-tabs): a notice, the button after an exam
 * or the old /badges and /certificates addresses open the profile on it.
 * Every tab's content is already on the page, so a tab changes the address
 * through the History API, which Next follows in useSearchParams without a
 * request; a link to another tab of this same page is followed the same way.
 */
export function ProfileContent({ counts, panels }: Props): React.JSX.Element {
  const active = tabFromQuery(useSearchParams().get("tab"), PROFILE_TABS, DEFAULT_PROFILE_TAB);

  const choose = (tab: ProfileTab): void => {
    // Replaced rather than pushed: Back leaves the profile instead of walking
    // back through its tabs.
    window.history.replaceState(null, "", addressWith(window.location.href, "tab", tab));
  };

  return (
    <div>
      <Tabs
        label="Sections du profil"
        items={PROFILE_TABS.map((key) => ({ key, label: LABELS[key], count: counts[key] }))}
        value={active}
        onChange={choose}
      />
      <div role="tabpanel" aria-label={LABELS[active]}>
        {panels[active]}
      </div>
    </div>
  );
}
