import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Hero + stats row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Welcome hero */}
        <div
          className="col-span-1 rounded-xl p-6 lg:col-span-2"
          style={{ background: "#0A0826", border: "1px solid #1F1B47" }}
        >
          <Skeleton className="mb-3 h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* XP / stats card */}
        <div
          className="rounded-xl p-5"
          style={{ background: "#0A0826", border: "1px solid #1F1B47" }}
        >
          <Skeleton className="mb-4 h-3 w-1/2" />
          <Skeleton className="mb-2 h-9 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>

      {/* Continue learning card */}
      <div
        className="flex gap-4 rounded-xl p-5"
        style={{ background: "#0A0826", border: "1px solid #1F1B47" }}
      >
        <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-9 w-24 shrink-0 self-center rounded-lg" />
      </div>

      {/* Section label */}
      <Skeleton className="h-4 w-44" />

      {/* Lesson cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl"
            style={{ background: "#0A0826", border: "1px solid #1F1B47" }}
          >
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
              <div className="mt-1 flex gap-3">
                <Skeleton className="h-3 w-12 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
