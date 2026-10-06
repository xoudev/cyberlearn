import React from "react";
import { ClassHeaderSkeleton, LessonEditorSkeleton } from "../../../_components/class-skeletons";

/**
 * Reopening a class lesson, while the page loads: its .tle-page, the header,
 * then the lesson editor's fields, MDX editor and actions.
 */
export default function EditClassLessonLoading(): React.ReactElement {
  return (
    // .tle-page is a flex item with auto margins: the real page reaches its
    // max-width through its text, which bars do not have, hence the width.
    <div
      className="tle-page"
      style={{ width: "100%" }}
      aria-busy="true"
      aria-label="Chargement de la leçon"
    >
      <ClassHeaderSkeleton crumb={312} eyebrow={150} title="9em" ledeLines={2} ledeLast="36%" />
      <LessonEditorSkeleton mode="edit" />
    </div>
  );
}
