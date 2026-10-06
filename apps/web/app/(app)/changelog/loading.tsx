import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * The release notes while they load, drawn on the page's own layout
 * (changelog/page.tsx): the `page-container`, the 720px header (eyebrow,
 * title, lede), then the timeline of entries, each with its rail, version
 * chip and date, title, and the rows of typed changes.
 */

const ENTRIES = [
  { latest: true, title: "58%", changes: [2, 1, 2, 1] },
  { latest: false, title: "46%", changes: [1, 2, 1] },
  { latest: false, title: "52%", changes: [2, 1, 1] },
];

function EntrySkeleton({
  latest,
  title,
  changes,
}: {
  latest: boolean;
  title: string;
  /** How many lines each change's text runs to. */
  changes: number[];
}): React.ReactElement {
  return (
    <div style={{ position: "relative", paddingLeft: 34, paddingBottom: 40 }}>
      <Skeleton w={11} h={11} radius="circle" style={{ position: "absolute", left: 6, top: 6 }} />
      <Skeleton w={1} style={{ position: "absolute", left: 11, top: 20, bottom: 0 }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <Skeleton w={66} h={26} />
        {latest && <Skeleton w={112} h={9} />}
        <Skeleton w={110} h={11} style={{ marginLeft: "auto" }} />
      </div>

      <Skeleton w={title} h={22} style={{ margin: "3px 0 19px" }} />

      <div style={{ display: "grid", gap: 10 }}>
        {changes.map((lines, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Skeleton w={96} h={21} style={{ flexShrink: 0, marginTop: 1 }} />
            <SkeletonText
              lines={lines}
              lastWidth={lines > 1 ? "48%" : "82%"}
              lineHeight={14}
              gap={9}
              style={{ flex: 1, margin: "4px 0" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChangelogLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement des nouveautés">
      <div aria-hidden="true" style={{ marginBottom: 40, maxWidth: 720 }}>
        <Skeleton w={210} h={10} style={{ margin: "3px 0 17px" }} />
        <Skeleton w={250} h={40} style={{ margin: "5px 0 17px" }} />
        <SkeletonText lines={2} lastWidth="38%" lineHeight={14} gap={10} />
      </div>

      <div aria-hidden="true" style={{ maxWidth: 720 }}>
        {ENTRIES.map((entry, i) => (
          <EntrySkeleton key={i} {...entry} />
        ))}
      </div>
    </div>
  );
}
