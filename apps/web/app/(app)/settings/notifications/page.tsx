import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { SectionHead } from "../_components/SettingsPrimitives";
import { NotificationsForm } from "./_components/NotificationsForm";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsSettingsPage(): Promise<React.JSX.Element> {
  const authUser = await requireRequestUser();
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: authUser.id },
    select: { reviewReminders: true, weeklyDigest: true, streakReminder: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="NOTIFICATIONS" hint="par email" />
      <NotificationsForm
        initialReviewReminders={prefs?.reviewReminders ?? true}
        initialWeeklyDigest={prefs?.weeklyDigest ?? true}
        streakReminder={prefs?.streakReminder ?? true}
      />
    </div>
  );
}
