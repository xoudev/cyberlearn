import React from "react";
import type { Metadata } from "next";
import { prisma, wrappedRepository } from "@cyberlearn/db";
import { wrappedWindow } from "@cyberlearn/lib";
import { getSharedUserProfile, requireRequestUser } from "@/lib/auth";
import { WrappedRoute } from "./_components/WrappedRoute";
import { WrappedClosed } from "./_components/WrappedClosed";

export const metadata: Metadata = { title: "Ton Wrapped" };
export const dynamic = "force-dynamic";

/**
 * Wrapped, once a year.
 *
 * It used to be open every day, which is what made it furniture rather than an
 * event: a recap you can read whenever is a page, and a recap that arrives once
 * is something people wait for and send to each other. The window is the rule
 * in wrappedWindow - December, plus the first week of January so that anyone
 * who spent the holidays away from a screen still gets to read it.
 *
 * `?apercu=1` opens it outside that window for an ADMIN, and for nobody else.
 * Eleven months of the year the only way to see whether this page still works
 * is to wait for December, which is not a way to find out - and the console's
 * test bench needs something real to point at. It reads the same data through
 * the same code path: the preview is the page, not a copy of it that can drift.
 */
export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ apercu?: string }>;
}): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const window = wrappedWindow(new Date());

  const { apercu } = await searchParams;
  // Asked for, and allowed to. The role is read from the database rather than
  // from a session claim, so a revoked admin loses this with everything else.
  const previewing = apercu === "1" && (await getSharedUserProfile())?.role === "ADMIN";

  if (!window.open && !previewing) {
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

  return (
    <>
      {!window.open && (
        <p
          style={{
            margin: "0 auto",
            maxWidth: 720,
            padding: "10px 16px",
            background: "#1a1640",
            border: "1px solid #2a2560",
            color: "#B8B5D1",
            font: "600 13px var(--font-mono)",
            textAlign: "center",
          }}
        >
          Aperçu console · Wrapped {window.periodKey} est fermé au public jusqu&apos;au 1er
          décembre.
        </p>
      )}
      <WrappedRoute payload={payload} handle={handle} />
    </>
  );
}
