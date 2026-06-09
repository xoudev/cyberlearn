import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LessonsBodySkeleton } from "./_components/lessons-body-skeleton";

export default function LessonsLoading(): React.ReactElement {
  return (
    <div className="page-container">
      {/* Breadcrumb placeholder */}
      <Skeleton h={13} w={240} style={{ marginBottom: 22 }} />
      <LessonsBodySkeleton />
    </div>
  );
}
