import type { Metadata } from "next";
import React from "react";
import { requireRequestUser } from "@/lib/auth";
import { loadDataSection } from "../_lib/load-settings";
import { DataSection } from "./_components/DataSection";

export const metadata: Metadata = {
  title: "Données",
  description: "Gérez vos données personnelles conformément au RGPD.",
};

export default async function DataPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  return <DataSection data={await loadDataSection(user.id)} />;
}
