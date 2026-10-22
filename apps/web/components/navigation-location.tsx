"use client";

// Client boundary: the current section follows App Router navigation without reloading the shell.
import { usePathname } from "next/navigation";
import { isActiveHref, sidebarGroups } from "@/lib/sidebar/items";

const sections = sidebarGroups({ hasClasses: true, showRevisions: true, dueReviews: 0 }).flatMap(
  (group) => group.items,
);

export function NavigationLocation(): React.JSX.Element {
  const pathname = usePathname();
  const section = sections.find((item) => isActiveHref(pathname, item.href));
  const label =
    section?.label ??
    (pathname.startsWith("/profile") || pathname.startsWith("/u/") ? "Profil" : "Ton espace");
  return (
    <div className="chrome-location" aria-label="Section actuelle">
      <span>Ton espace</span>
      <strong>{label}</strong>
    </div>
  );
}
