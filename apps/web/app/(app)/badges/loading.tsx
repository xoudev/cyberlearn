import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BadgesLoading(): React.ReactElement {
  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <Skeleton className="mb-2 h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Badges grid — hex cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 rounded-xl p-6"
            style={{ background: "#0A0826", border: "1px solid #1F1B47" }}
          >
            {/* Hexagon shape */}
            <Skeleton
              className="mt-2"
              style={{
                width: 96,
                height: 96,
                borderRadius: 0,
                clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              }}
            />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
