import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { SettingsDrawer } from "@/app/(app)/settings/_components/SettingsDrawer";
import { settingsSection } from "@/app/(app)/settings/_components/sections";
import AccountSettingsPage from "@/app/(app)/settings/account/page";
import DataPage from "@/app/(app)/settings/data/page";
import ModerationRecordPage from "@/app/(app)/settings/moderation/page";
import NotificationsSettingsPage from "@/app/(app)/settings/notifications/page";
import PreferencesSettingsPage from "@/app/(app)/settings/preferences/page";
import PrivacySettingsPage from "@/app/(app)/settings/privacy/page";
import ProfileSettingsPage from "@/app/(app)/settings/profile/page";

export const metadata: Metadata = { title: "Paramètres" };

/**
 * /settings/<section>, reached from inside the site: the section's own page,
 * rendered in the drawer over the page the reader was on, instead of the
 * full settings page. A reload or a direct link still gets the full page.
 * The forms are the pages' own, imported as they are, so the drawer and the
 * page cannot drift apart.
 */
const PAGES: Record<string, () => Promise<React.JSX.Element>> = {
  profile: ProfileSettingsPage,
  privacy: PrivacySettingsPage,
  preferences: PreferencesSettingsPage,
  notifications: NotificationsSettingsPage,
  moderation: ModerationRecordPage,
  account: AccountSettingsPage,
  data: DataPage,
};

export default async function SettingsPanelPage({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<React.JSX.Element> {
  const { section } = await params;
  const Page = PAGES[section];
  if (!Page || settingsSection(section) === undefined) notFound();

  const authUser = await requireRequestUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { username: true },
  });

  return (
    <SettingsDrawer section={section} username={dbUser?.username ?? "agent"}>
      <Page />
    </SettingsDrawer>
  );
}
