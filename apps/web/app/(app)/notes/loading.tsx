import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * The note library while it loads. NotesLibrary lays itself out with inline
 * styles rather than classes, so this repeats the layout values it uses (its
 * page-container, the search row, the folder bar, the grid of cards) and fills
 * them with bars: same columns, same gaps, same card height.
 */

/** "Toutes", "Cybersec", "Dev", "Réseau": the domain filters, at their widths. */
const FILTER_WIDTHS = [73, 102, 63, 87] as const;

const SUBTLE_RULE = "1px solid var(--color-border-subtle)";

/** A note's card: domain label, lesson title, excerpt, then date and word count. */
function NoteCardSkeleton(): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 18,
        minHeight: 150,
        background: "color-mix(in srgb, var(--color-bg-sunken) 50%, transparent)",
        border: SUBTLE_RULE,
        borderLeft: "3px solid var(--color-border-default)",
      }}
    >
      <Skeleton w={128} h={9} style={{ margin: "2.5px 0" }} />
      <Skeleton w="72%" h={15} style={{ margin: "2px 0" }} />
      <SkeletonText
        lines={3}
        lastWidth="64%"
        lineHeight={12}
        gap={7.5}
        style={{ flex: 1, paddingBlock: 3.75 }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: SUBTLE_RULE,
          paddingTop: 10,
        }}
      >
        <Skeleton w={72} h={10} style={{ margin: "3px 0" }} />
        <Skeleton w={52} h={10} style={{ margin: "3px 0" }} />
      </div>
    </div>
  );
}

export default function NotesLoading(): React.ReactElement {
  return (
    <div
      className="page-container"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "40px clamp(16px,4vw,48px)" }}
      aria-busy="true"
      aria-label="Chargement du bloc-notes"
    >
      {/* Header: the eyebrow after its rule, the title, the lede. */}
      <div aria-hidden="true">
        <div
          className="mono-label"
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}
        >
          <span style={{ width: 24, height: 1, background: "var(--color-border-default)" }} />
          <Skeleton w={210} h={10} style={{ margin: "3px 0" }} />
        </div>
        <div style={{ fontSize: "clamp(34px,5vw,52px)", margin: "0 0 10px" }}>
          {/* 0.8em plus 0.35em above and below: the heading's 1.5 line. */}
          <Skeleton w="5.3em" h="0.8em" style={{ margin: "0.35em 0" }} />
        </div>
        <SkeletonText
          lines={2}
          lastWidth="34%"
          lineHeight={14}
          gap={8.5}
          style={{ maxWidth: 620, margin: "0 0 30px", paddingBlock: 4.25 }}
        />
      </div>

      {/* Search, then the domain filters pushed to the right. */}
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Skeleton h={44} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          {FILTER_WIDTHS.map((width) => (
            <Skeleton key={width} w={width} h={34} />
          ))}
        </div>
      </div>

      {/* Folder bar: the two folder pills, "Gérer", and "Exporter tout" at the end. */}
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          paddingBottom: 16,
          marginBottom: 22,
          borderBottom: SUBTLE_RULE,
        }}
      >
        <Skeleton w={151} h={34} />
        <Skeleton w={151} h={34} />
        <Skeleton w={80} h={34} />
        <Skeleton w={138} h={34} style={{ marginLeft: "auto" }} />
      </div>

      {/* The notes, in the page's auto-fill grid. */}
      <div
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
          gap: 16,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <NoteCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
