import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LessonsBodySkeleton } from "./_components/lessons-body-skeleton";

/**
 * The lessons catalogue while it loads: the page's `.page-container` and its
 * breadcrumb, then the same body skeleton the page's `<Suspense>` shows.
 */
export default function LessonsLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement des leçons">
      <div className="pg-crumb" aria-hidden="true">
        <Skeleton w={195} h={14} />
      </div>
      <LessonsBodySkeleton />
    </div>
  );
}
