import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * PageHeader while a support page loads, on its own classes: the prompt
 * (.pg-crumb), the eyebrow, the title (.pg-title) and its lede (.pg-lede).
 * The eyebrow is a bare bar with the eyebrow's line and margin: .pg-eyebrow
 * would print its "// " before it.
 */
export function SupportHeaderSkeleton({
  crumb,
  eyebrow,
  title,
  ledeLines = 0,
  ledeLast = "60%",
}: {
  /** Widths in px, the title's in em of its own clamp() so it scales with it. */
  crumb: number;
  eyebrow: number;
  title: string;
  ledeLines?: number;
  ledeLast?: string;
}): React.ReactElement {
  return (
    <div aria-hidden="true">
      <div className="pg-crumb">
        <Skeleton w={crumb} h={12} style={{ margin: "3px 0" }} />
      </div>
      <Skeleton w={eyebrow} h={11} style={{ margin: "2.75px 0 16.75px" }} />
      <div className="pg-title">
        {/* 0.8em plus 0.14em above and below: the title's 1.08 line. */}
        <Skeleton w={title} h="0.8em" style={{ maxWidth: "100%", margin: "0.14em 0" }} />
      </div>
      {ledeLines > 0 && (
        <SkeletonText
          className="pg-lede"
          lines={ledeLines}
          lastWidth={ledeLast}
          lineHeight={15}
          gap={9.75}
          style={{ paddingBlock: 4.875 }}
        />
      )}
    </div>
  );
}
