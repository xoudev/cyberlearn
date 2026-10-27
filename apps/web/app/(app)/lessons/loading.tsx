import React from "react";
import { LessonsBodySkeleton } from "./_components/lessons-body-skeleton";
import "./lessons-catalogue.css";

/**
 * The route and Suspense share the catalogue's loading composition.
 */
export default function LessonsLoading(): React.ReactElement {
  return (
    <div
      className="page-container lessons-catalogue learning-catalogue"
      aria-busy="true"
      aria-label="Chargement des leçons"
    >
      <LessonsBodySkeleton />
    </div>
  );
}
