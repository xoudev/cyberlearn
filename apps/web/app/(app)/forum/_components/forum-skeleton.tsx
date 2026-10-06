import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * The forum's pieces while one of its pages loads, drawn on the forum's own
 * classes (forum.css) so that widths, gaps and breakpoints are the real ones.
 * Shared by the four loading states the way forum-bits.tsx is by the pages.
 */

/** An inline bar: it sits in its element's line box, which keeps that line's height. */
const INLINE: React.CSSProperties = { display: "inline-block", verticalAlign: "middle" };

/** Crumbs (.fo-crumb): a bar per step, a short one per separator. */
export function CrumbsSkeleton({ steps }: { steps: readonly number[] }): React.ReactElement {
  return (
    <div className="fo-crumb" aria-hidden="true">
      {steps.map((width, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Skeleton w={6} h={11} />}
          <Skeleton w={width} h={11} style={{ margin: "2px 0" }} />
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * ForumHeader: the eyebrow after its rule, the title row with its action at
 * the far end when the page has one, then the lede.
 */
export function ForumHeaderSkeleton({
  eyebrow,
  title,
  ledeLines = 0,
  ledeLast = "60%",
  action,
}: {
  /** Width of the eyebrow's text, in px. */
  eyebrow: number;
  /** Width of the title: in em it scales with the title's own clamp(). */
  title: string;
  ledeLines?: number;
  ledeLast?: string;
  /** Width of the button closing the title row, in px. */
  action?: number;
}): React.ReactElement {
  return (
    <div aria-hidden="true">
      <div className="fo-eyebrow">
        <Skeleton w={eyebrow} h={11} style={{ margin: "2px 0" }} />
      </div>
      {/* The title row of ForumHeader, with its own inline layout. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div className="fo-title" style={{ flex: "1 1 0%", minWidth: 0 }}>
          {/* 0.8em plus 0.15em above and below: the title's 1.1 line. */}
          <Skeleton w={title} h="0.8em" style={{ maxWidth: "100%", margin: "0.15em 0" }} />
        </div>
        {action !== undefined && (
          <div style={{ marginLeft: "auto" }}>
            <Skeleton w={action} h={34} />
          </div>
        )}
      </div>
      {ledeLines > 0 && (
        <SkeletonText
          className="fo-lede"
          lines={ledeLines}
          lastWidth={ledeLast}
          lineHeight={15}
          gap={9}
          style={{ paddingBlock: 4.5 }}
        />
      )}
    </div>
  );
}

/** TopicRow: title, one line of preview, the meta line, the reply count at the end. */
export function TopicRowSkeleton({ title }: { title: string }): React.ReactElement {
  return (
    <li>
      <div className="fo-topic">
        <div style={{ minWidth: 0 }}>
          <div className="fo-topic-title">
            <Skeleton w={title} h={15} style={{ margin: "2px 0" }} />
          </div>
          <div className="fo-topic-preview">
            <Skeleton w="88%" h={12} style={{ margin: "3px 0" }} />
          </div>
          <div className="fo-topic-meta">
            <Skeleton w={290} h={10} style={{ maxWidth: "100%", margin: "2px 0" }} />
          </div>
        </div>
        {/* The count and its word keep their own elements, which the phone
            layout turns into one row. */}
        <div className="fo-topic-count">
          <strong>
            <Skeleton w={20} h={16} style={INLINE} />
          </strong>
          <span>
            <Skeleton w={54} h={9} style={INLINE} />
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * A composer field, laid out as its <label> is: the .fo-label on its own line,
 * then the control and the hint as inline boxes. The control fills the line
 * but is never narrower than the empty control would be, and the hint follows
 * it on that line, so the page measures itself on this field as the real one
 * does. A textarea sits on the baseline (with the gap under it); an input does
 * not.
 */
export function FieldSkeleton({
  label,
  control,
  minControl,
  multiline = false,
  hint,
}: {
  label: number;
  /** The control's height, in px. */
  control: number;
  /** The empty control's own width (20 characters), in px. */
  minControl: number;
  multiline?: boolean;
  /** The hint's width, in px. */
  hint: number;
}): React.ReactElement {
  return (
    <div>
      <div className="fo-label">
        <Skeleton w={label} h={10} style={{ margin: "1.5px 0" }} />
      </div>
      <Skeleton
        w="100%"
        h={control}
        style={{
          display: "inline-block",
          verticalAlign: multiline ? "baseline" : "top",
          minWidth: minControl,
        }}
      />
      <Skeleton w={hint} h={11} style={{ ...INLINE, maxWidth: "100%" }} />
    </div>
  );
}
