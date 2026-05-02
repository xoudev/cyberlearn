import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LessonDetailLoading(): React.ReactElement {
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* Title + tags */}
        <Skeleton className="h-8 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Description */}
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2" />

        {/* Intro paragraph */}
        <div className="flex flex-col gap-2 pt-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>

        {/* Timeline stepper */}
        <div className="my-2 flex items-start justify-between px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-4 rotate-45 rounded-sm" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>

        {/* Section heading */}
        <Skeleton className="mt-2 h-6 w-2/5" />

        {/* Content paragraphs */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Code block */}
        <div
          className="mt-1 overflow-hidden rounded-lg"
          style={{ border: "1px solid #1F1B47", background: "#0A0826" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{ borderBottom: "1px solid #1F1B47" }}
          >
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-28" />
            <div className="ml-auto">
              <Skeleton className="h-5 w-14 rounded" />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {([80, 60, 92, 50, 72, 38] as const).map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: `${String(w)}%` }} />
            ))}
          </div>
        </div>

        {/* More paragraphs */}
        <div className="flex flex-col gap-2 mt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>

        {/* Second code block (playground) */}
        <div
          className="mt-1 overflow-hidden rounded-lg"
          style={{ border: "1px solid #1F1B47", background: "#0A0826" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{ borderBottom: "1px solid #1F1B47" }}
          >
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-36" />
            <div className="ml-auto">
              <Skeleton className="h-5 w-14 rounded" />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {([65, 45, 80, 55] as const).map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: `${String(w)}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right sidebar — meta card ── */}
      <div className="w-72 shrink-0">
        <div
          className="sticky top-6 flex flex-col gap-3 rounded-xl p-5"
          style={{ background: "#0A0826", border: "1px solid #1F1B47" }}
        >
          <Skeleton className="mb-1 h-9 w-full rounded-lg" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
          <Skeleton className="my-1 h-px w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    </div>
  );
}
