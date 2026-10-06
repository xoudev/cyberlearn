import React from "react";
import { ClassHeaderSkeleton, LessonEditorSkeleton } from "../../_components/class-skeletons";

/**
 * Writing a class lesson, while the page loads: its .tle-page, the header,
 * then the lesson editor's fields, MDX editor and actions.
 */
export default function NewClassLessonLoading(): React.ReactElement {
  return (
    // .tle-page is a flex item with auto margins: the real page reaches its
    // max-width through its text, which bars do not have, hence the width.
    <div
      className="tle-page"
      style={{ width: "100%" }}
      aria-busy="true"
      aria-label="Chargement de l'éditeur de leçon"
    >
      <ClassHeaderSkeleton crumb={304} eyebrow={150} title="8.4em" ledeLines={3} ledeLast="22%" />
      <LessonEditorSkeleton mode="create" />
    </div>
  );
}
