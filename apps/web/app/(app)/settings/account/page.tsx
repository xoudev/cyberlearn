import type React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { accountSection } from "../_lib/load-settings";
import { AccountSection } from "./_components/AccountSection";

export const metadata: Metadata = { title: "Compte et sécurité" };

export default async function AccountSettingsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  return <AccountSection data={accountSection(user)} />;
}
