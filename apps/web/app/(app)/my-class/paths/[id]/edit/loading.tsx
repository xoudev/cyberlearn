import React from "react";
import { ClassHeaderSkeleton, PathBuilderSkeleton } from "../../../_components/class-skeletons";

/**
 * Reopening a class path, while the page loads: its .tle-page, the header,
 * then the path builder's fields, its two panels and the actions.
 */
export default function EditClassPathLoading(): React.ReactElement {
  return (
    // .tle-page is a flex item with auto margins: the real page reaches its
    // max-width through its text, which bars do not have, hence the width.
    <div
      className="tle-page"
      style={{ width: "100%" }}
      aria-busy="true"
      aria-label="Chargement du parcours"
    >
      <ClassHeaderSkeleton crumb={297} eyebrow={150} title="9em" ledeLines={2} ledeLast="45%" />
      <PathBuilderSkeleton mode="edit" />
    </div>
  );
}
