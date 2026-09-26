import React, { Suspense } from "react";
import type { Metadata } from "next";
import { BadgesCollection } from "./_components/badges-collection";
import { BadgesSkeleton } from "./_components/badges-skeleton";
import { requireRequestUser } from "@/lib/auth";
import { buildBadgeCollection } from "@/lib/badges/collection";

export const metadata: Metadata = { title: "Badges" };

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BadgesPage(): React.ReactElement {
  return (
    <Suspense fallback={<BadgesSkeleton />}>
      <BadgesContent />
    </Suspense>
  );
}

async function BadgesContent(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();
  // The same collection the app's Collection tab reads (/api/mobile/badges).
  const collection = await buildBadgeCollection(authUser.id);

  return (
    <BadgesCollection
      groups={collection.groups}
      earnedCount={collection.earnedCount}
      totalCount={collection.totalCount}
      rarityTotals={collection.rarityTotals}
      rarityEarned={collection.rarityEarned}
    />
  );
}
