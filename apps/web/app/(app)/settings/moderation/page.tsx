import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { loadModerationSection } from "../_lib/load-settings";
import { ModerationSection } from "./_components/ModerationSection";

export const metadata: Metadata = { title: "Modération" };

export default async function ModerationRecordPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  return <ModerationSection data={await loadModerationSection(user.id)} />;
}
