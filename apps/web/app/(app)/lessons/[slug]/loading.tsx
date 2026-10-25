import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { LESSON_TOOLBAR_HEIGHT, NAVBAR_HEIGHT } from "@/lib/chrome";
import { LESSON_ARTICLE_CLASS } from "./_components/lesson-article";
import "./lesson-detail.css";

/**
 * A lesson while it loads, drawn on the page's own classes (`.lesson-page`,
 * `.lesson-head`, `.lesson-toolbar`, the article's, `.lesson-next-bar`,
 * `.lesson-rating-qa-grid`) and on the spacings its components set inline:
 * the header in the prose's column, the toolbar, the first section (its
 * prose in the measure, a code block at the article's width), the
 * next-lesson bar, then the rating and the questions.
 */

/** A chip of the header, at its height. */
function ChipSkeleton({ w }: { w: number }): React.ReactElement {
  return <Skeleton w={w} h={26} />;
}

/** A button of the toolbar, icon only as on a phone: its words come with the page. */
function ToolSkeleton(): React.ReactElement {
  return <Skeleton w={44} h={44} />;
}

export default function LessonDetailLoading(): React.ReactElement {
  return (
    <div
      className="lesson-page learning-catalogue learning-workspace lesson-workspace"
      aria-busy="true"
      aria-label="Chargement de la leçon"
    >
      <div className="lesson-head" aria-hidden="true">
        <div className="pg-crumb">
          <Skeleton w={260} h={12} style={{ maxWidth: "100%", margin: "3px 0" }} />
        </div>
        <div className="lesson-head__domain">
          <Skeleton w={140} h={12} />
        </div>
        <div className="lesson-head__title">
          <Skeleton w="88%" h="0.8em" style={{ margin: "0.14em 0" }} />
          <Skeleton w="52%" h="0.8em" style={{ margin: "0.14em 0" }} />
        </div>
        <SkeletonText
          className="lesson-head__lede"
          lines={2}
          lastWidth="64%"
          lineHeight={15}
          gap={10.6}
        />
        <div className="lesson-head__chips">
          <ChipSkeleton w={82} />
          <ChipSkeleton w={74} />
          <ChipSkeleton w={118} />
          <ChipSkeleton w={96} />
        </div>
      </div>

      <div
        className="lesson-toolbar"
        aria-hidden="true"
        style={{ top: NAVBAR_HEIGHT, height: LESSON_TOOLBAR_HEIGHT }}
      >
        <div className="lesson-toolbar__where">
          <Skeleton w={96} h={11} />
          <Skeleton w={120} h={3} style={{ flexShrink: 1, minWidth: 24 }} />
        </div>
        <div className="lesson-toolbar__group">
          <ToolSkeleton />
          <ToolSkeleton />
        </div>
        <span className="lesson-toolbar__sep" />
        <div className="lesson-toolbar__group">
          <ToolSkeleton />
          <ToolSkeleton />
        </div>
      </div>

      {/* The first section: its numbered h2, prose, a code block, prose. The
          prose sits in the measure, centred; the code block is a component
          and takes the article's width. */}
      <article className={LESSON_ARTICLE_CLASS} aria-hidden="true">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Skeleton w="58%" h="clamp(28px, 2.8vw, 36px)" style={{ marginBottom: 26 }} />
          <SkeletonText lines={4} lastWidth="66%" lineHeight={15} gap={13} />
        </div>
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 16px",
            marginTop: 24,
          }}
        >
          <Skeleton w={110} h={11} />
          <Skeleton w={48} h={9} />
        </div>
        <div className="card card--sunken" style={{ padding: "16px 20px", marginBottom: 24 }}>
          <SkeletonText lines={5} lastWidth="38%" lineHeight={12} gap={10} />
        </div>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <SkeletonText lines={3} lastWidth="52%" lineHeight={15} gap={13} />
        </div>
      </article>

      {/* The next-lesson bar: the preview, then the two actions. */}
      <div
        className="card lesson-next-bar"
        aria-hidden="true"
        style={{ marginTop: 88, position: "relative" }}
      >
        <div
          className="lesson-next-bar__preview"
          style={{
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 0,
          }}
        >
          <Skeleton w={130} h={10} />
          <Skeleton w={200} h={10} style={{ maxWidth: "100%" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Skeleton w={64} h={17} />
            <Skeleton w={80} h={17} />
            <Skeleton w={92} h={9} />
          </div>
          <Skeleton w="54%" h={18} />
        </div>
        <div className="lesson-next-bar__actions">
          <Skeleton w={150} h={34} />
        </div>
      </div>

      <div className="lesson-rating-qa-grid" aria-hidden="true">
        <div className="card card--sunken" style={{ padding: "28px 32px" }}>
          <Skeleton w={96} h={10} style={{ marginBottom: 9 }} />
          <Skeleton w={190} h={15} style={{ marginBottom: 22 }} />
          {/* Locked until the lesson is finished: the notice that says so. */}
          <Skeleton h={44} />
        </div>

        <div>
          <Skeleton w={170} h={10} style={{ marginBottom: 9 }} />
          <Skeleton w={210} h={17} style={{ marginBottom: 18 }} />
          <Skeleton w={210} h={44} style={{ marginBottom: 24 }} />
          <Skeleton h={150} />
        </div>
      </div>
    </div>
  );
}
