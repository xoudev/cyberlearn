import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
}

export function Skeleton({ width, height, style, ...props }: SkeletonProps): React.ReactElement {
  return (
    <div
      className="skeleton-shimmer"
      style={{ width, height, borderRadius: 6, ...style }}
      {...props}
    />
  );
}
