import React from "react";
import { wrappedWindow } from "@cyberlearn/lib";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./_components/story/story.css";

/**
 * Wrapped while it loads, drawn on the page's own classes. The page is one of
 * two things depending on the date, so the skeleton asks the same question
 * (wrappedWindow): shut, it is the `wr-closed` page (eyebrow, year, lede, the
 * opening date, the way back); open, it is the story in its bare dialog
 * (story.css: the slide bars, the chrome, the first slide, the steps).
 */

/** The most slides a recap has (buildStorySlides). */
const SLIDE_COUNT = 9;

function ClosedSkeleton(): React.ReactElement {
  return (
    <div
      className="page-container wr-closed"
      aria-busy="true"
      aria-label="Chargement de ton Wrapped"
    >
      <Skeleton w={190} h={11} />
      <Skeleton
        w="clamp(150px, 42vw, 380px)"
        h="clamp(56px, 16vw, 140px)"
        style={{ margin: "4px 0" }}
      />
      <SkeletonText
        lines={3}
        lastWidth="50%"
        lineHeight={14}
        gap={12}
        style={{ width: "min(360px, 100%)", alignItems: "center", padding: "6px 0" }}
      />
      <div className="wr-closed__when">
        <Skeleton w={240} h={12} style={{ maxWidth: "100%", margin: "2px 0" }} />
      </div>
      <Skeleton w={330} h={11} style={{ maxWidth: "100%" }} />
      <Skeleton w={230} h={34} style={{ marginTop: 10 }} />
    </div>
  );
}

function StorySkeleton(): React.ReactElement {
  return (
    <div
      className="modal-shell modal-shell--bare"
      aria-busy="true"
      aria-label="Chargement de ton Wrapped"
    >
      <div className="ws-root" aria-hidden="true">
        <div className="ws-frame">
          <div className="ws-bars">
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <span key={i} className="ws-bar" />
            ))}
          </div>
          <div className="ws-chrome">
            <Skeleton w={96} h={11} />
            <span className="ws-chrome__actions">
              <span className="ws-icon" />
              <span className="ws-icon" />
            </span>
          </div>
          <div className="ws-surface">
            <div className="ws-stage">
              <div className="ws-slide">
                <Skeleton w={170} h={10} style={{ marginBottom: 18 }} />
                <Skeleton w="clamp(150px, 46vw, 270px)" h="clamp(56px, 17.6vw, 102px)" />
                <Skeleton w={190} h="clamp(26px, 7vw, 40px)" style={{ marginTop: 14 }} />
                <SkeletonText
                  lines={2}
                  lastWidth="62%"
                  lineHeight={14}
                  gap={10}
                  style={{ maxWidth: "20em", marginTop: 21 }}
                />
              </div>
            </div>
          </div>
          <div className="ws-steps">
            <Skeleton w={112} h={30} />
            <Skeleton w={36} h={10} />
            <Skeleton w={96} h={30} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WrappedLoading(): React.ReactElement {
  return wrappedWindow(new Date()).open ? <StorySkeleton /> : <ClosedSkeleton />;
}
