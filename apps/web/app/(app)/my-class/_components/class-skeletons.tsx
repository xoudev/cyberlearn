import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * The class pages while they load, drawn on their own classes (globals.css:
 * .pg-*, .cls-*, .tle-*, .pb-*) so the columns, gaps and breakpoints are the
 * real ones. The lesson editor and the path builder each serve two routes
 * (new and edit), hence one component each, shared by both loading states.
 */

/**
 * PageHeader: the prompt (.pg-crumb), the eyebrow, the title (.pg-title) and
 * its lede (.pg-lede). The eyebrow is a bare bar with the eyebrow's line and
 * margin: .pg-eyebrow would print its "// " before it.
 */
export function ClassHeaderSkeleton({
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

/** Heights of the editors' controls: .cls-input on one line, on two, and the Select. */
const INPUT = 36;
const TEXTAREA_2 = 54;
const SELECT = 39;

/** A .cls-field: its label, the control at its real height, the hint when it has one. */
function FieldSkeleton({
  label,
  control,
  hint,
  hintLines = 1,
}: {
  label: number;
  control: number;
  /** Width of the hint's last line. */
  hint?: string;
  hintLines?: number;
}): React.ReactElement {
  return (
    <div className="cls-field">
      <Skeleton w={label} h={9} style={{ margin: "2.6px 0" }} />
      <Skeleton h={control} />
      {hint !== undefined && (
        <SkeletonText
          lines={hintLines}
          lastWidth={hint}
          lineHeight={9}
          gap={6}
          style={{ paddingBlock: 3 }}
        />
      )}
    </div>
  );
}

/** .tle-actions: the submit button, then the links back (and to the page, in edit mode). */
function ActionsSkeleton({
  submit,
  view,
}: {
  submit: number;
  /** The "Voir" link's width, in edit mode only. */
  view: number | null;
}): React.ReactElement {
  return (
    <div className="tle-actions">
      <Skeleton w={submit} h={34} />
      <Skeleton w={132} h={10} style={{ margin: "3px 0" }} />
      {view !== null && <Skeleton w={view} h={10} style={{ margin: "3px 0" }} />}
    </div>
  );
}

const RULE = "1px solid var(--color-border-default)";

/**
 * The shared MDX editor panel, which has no class of its own: its frame, the
 * 40px toolbar (Blocs, Code, then Guide and Split at the far end), the two 620px panes at
 * 55% and 45% (the blocks, the site's preview under its header line) and the
 * status bar.
 */
function EditorPanelSkeleton(): React.ReactElement {
  return (
    <div style={{ border: RULE, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          height: 40,
          padding: "0 10px",
          borderBottom: RULE,
        }}
      >
        <Skeleton w={46} h={26} />
        <Skeleton w={42} h={26} />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <Skeleton w={62} h={26} />
          <Skeleton w={62} h={26} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "55% 45%", height: 620 }}>
        <div
          style={{
            borderRight: RULE,
            overflow: "hidden",
            padding: "10px 16px 48px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Skeleton w="42%" h={18} style={{ marginTop: 12 }} />
          <SkeletonText lines={2} lastWidth="70%" lineHeight={12} gap={9} />
          <Skeleton h={78} />
          <Skeleton w="30%" h={18} style={{ marginTop: 12 }} />
          <Skeleton h={150} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <Skeleton w={96} h={9} />
            <Skeleton w={64} h={9} style={{ marginLeft: "auto" }} />
            <Skeleton w={74} h={20} />
            <Skeleton w={50} h={20} />
          </div>
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            <Skeleton w="58%" h={26} />
            <SkeletonText lines={4} lastWidth="52%" lineHeight={12} gap={10} />
            <Skeleton h={72} />
            <SkeletonText lines={3} lastWidth="38%" lineHeight={12} gap={10} />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "5px 14px",
          borderTop: RULE,
        }}
      >
        <Skeleton w={30} h={9} style={{ margin: "2.6px 0" }} />
        <Skeleton w={34} h={9} />
        <Skeleton w={16} h={9} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <Skeleton w={64} h={9} />
          <Skeleton w={58} h={9} />
        </div>
      </div>
    </div>
  );
}

/**
 * LessonEditor: the .tle-meta block (title, description, the .tle-grid4 of
 * category, level, duration and XP), the content editor, the actions.
 */
export function LessonEditorSkeleton({ mode }: { mode: "create" | "edit" }): React.ReactElement {
  return (
    <div className="tle-form" aria-hidden="true">
      <div className="tle-meta">
        <FieldSkeleton label={34} control={INPUT} />
        <FieldSkeleton label={75} control={TEXTAREA_2} hint="32%" />
        <div className="tle-grid4">
          <FieldSkeleton label={62} control={SELECT} />
          <FieldSkeleton label={41} control={SELECT} />
          <FieldSkeleton label={75} control={INPUT} />
          <FieldSkeleton label={14} control={INPUT} hint="30%" hintLines={2} />
        </div>
      </div>

      <div className="tle-editor">
        <div className="tle-editor__head">
          <Skeleton w={48} h={9} style={{ margin: "2.6px 0" }} />
          <Skeleton w={432} h={10} style={{ maxWidth: "100%", margin: "2.5px 0" }} />
        </div>
        <EditorPanelSkeleton />
      </div>

      <ActionsSkeleton submit={mode === "create" ? 152 : 109} view={mode === "edit" ? 96 : null} />
    </div>
  );
}

const CHOSEN_TITLES = ["58%", "46%", "64%", "40%", "52%"] as const;
const POOL_TITLES = ["62%", "48%", "70%", "44%", "56%", "38%", "66%", "50%", "60%", "42%"] as const;

/**
 * PathBuilder: the .tle-meta block (title, description, the .tle-grid3 of
 * category, level and duration), the two .pb-panel columns (the path in
 * order, the lessons to pick from), the actions.
 */
export function PathBuilderSkeleton({ mode }: { mode: "create" | "edit" }): React.ReactElement {
  return (
    <div className="tle-form" aria-hidden="true">
      <div className="tle-meta">
        <FieldSkeleton label={34} control={INPUT} />
        <FieldSkeleton label={75} control={TEXTAREA_2} hint="26%" />
        <div className="tle-grid3">
          <FieldSkeleton label={62} control={SELECT} />
          <FieldSkeleton label={41} control={SELECT} />
          <FieldSkeleton label={68} control={INPUT} />
        </div>
      </div>

      <div className="pb-cols">
        <div className="pb-panel">
          <div className="pb-panel__head">
            <Skeleton w={75} h={9} style={{ margin: "2.6px 0" }} />
            <Skeleton w={54} h={10} style={{ margin: "2.5px 0" }} />
          </div>
          {/* A new path starts empty, and says so; a reopened one lists its lessons. */}
          {mode === "create" ? (
            <SkeletonText
              lines={2}
              lastWidth="30%"
              lineHeight={10}
              gap={6.5}
              style={{ paddingBlock: 3.25 }}
            />
          ) : (
            <ol className="pb-chosen">
              {CHOSEN_TITLES.map((title) => (
                <li key={title} className="pb-chosen__row">
                  <Skeleton w={15} h={11} />
                  <span className="pb-chosen__title">
                    <Skeleton w={title} h={12} style={{ margin: "3.75px 0" }} />
                  </span>
                  <span className="pb-chosen__tools">
                    <Skeleton w={24} h={24} />
                    <Skeleton w={24} h={24} />
                    <Skeleton w={24} h={24} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="pb-panel">
          <div className="pb-panel__head">
            <Skeleton w={123} h={9} style={{ margin: "2.6px 0" }} />
            <Skeleton w={60} h={10} style={{ margin: "2.5px 0" }} />
          </div>
          <Skeleton h={INPUT} />
          <ul className="pb-pool">
            {POOL_TITLES.map((title) => (
              <li key={title}>
                <div className="pb-pool__row">
                  <Skeleton w={9} h={9} />
                  <span className="pb-pool__title">
                    <Skeleton w={title} h={12} style={{ margin: "3.75px 0" }} />
                  </span>
                  <Skeleton w={54} h={9} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ActionsSkeleton submit={mode === "create" ? 152 : 109} view={mode === "edit" ? 118 : null} />
      {/* Under the actions while the path is empty: "Un parcours sans leçon…". */}
      {mode === "create" && <Skeleton w={252} h={10} style={{ margin: "2.5px 0" }} />}
    </div>
  );
}
