import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { loadNotificationsSection } from "../_lib/load-settings";
import { NotificationsSection } from "./_components/NotificationsSection";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsSettingsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  return <NotificationsSection data={await loadNotificationsSection(user.id)} />;
}
