import React from "react";
import type { Metadata } from "next";
import { prisma, wrappedRepository } from "@cyberlearn/db";
import { wrappedWindow } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";
import { WrappedClient } from "./_components/WrappedClient";
import { WrappedClosed } from "./_components/WrappedClosed";

export const metadata: Metadata = { title: "Ton Wrapped · CyberLearn" };
export const dynamic = "force-dynamic";

/**
 * Wrapped, once a year.
 *
 * It used to be open every day, which is what made it furniture rather than an
 * event: a recap you can read whenever is a page, and a recap that arrives once
 * is something people wait for and send to each other. The window is the rule
 * in wrappedWindow - December, plus the first week of January so that anyone
 * who spent the holidays away from a screen still gets to read it.
 */
export default async function WrappedPage(): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const window = wrappedWindow(new Date());

  if (!window.open) {
    return <WrappedClosed periodKey={window.periodKey} opensOn={window.opensOn} />;
  }

  const [payload, profile] = await Promise.all([
    wrappedRepository.buildPayload(user.id, window.periodKey),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, displayName: true },
    }),
  ]);
  const handle = profile?.username ?? profile?.displayName ?? "moi";

  return <WrappedClient payload={payload} handle={handle} />;
}
