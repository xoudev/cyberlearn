import React from "react";
import type { Metadata } from "next";
import { prisma, wrappedRepository } from "@cyberlearn/db";
import { monthKey } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";
import { WrappedClient } from "./_components/WrappedClient";

export const metadata: Metadata = { title: "Ton Wrapped · CyberLearn" };
export const dynamic = "force-dynamic";

export default async function WrappedPage(): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  // The current Europe/Paris month, computed once on the server.
  const periodKey = monthKey(new Date());

  const [payload, profile] = await Promise.all([
    wrappedRepository.buildPayload(user.id, periodKey),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, displayName: true },
    }),
  ]);
  const handle = profile?.username ?? profile?.displayName ?? "moi";

  return <WrappedClient payload={payload} handle={handle} />;
}
