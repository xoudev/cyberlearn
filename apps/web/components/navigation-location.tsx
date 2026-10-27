"use client";

// Client boundary: the current section follows App Router navigation without reloading the shell.
import { usePathname } from "next/navigation";
import { isActiveHref, sidebarGroups } from "@/lib/sidebar/items";

const sections = sidebarGroups({ hasClasses: true, duelInvitations: 0 }).flatMap(
  (group) => group.items,
);

/** The public pages a signed-in reader is shown in the app's shell, by name. */
function publicSectionOf(pathname: string): string | null {
  if (pathname === "/catalogue") return "Catalogue";
  if (pathname === "/glossaire") return "Glossaire";
  if (pathname === "/legal" || pathname.startsWith("/legal/") || pathname === "/privacy") {
    return "Informations";
  }
  if (pathname === "/contact") return "Contact";
  return null;
}

export function NavigationLocation(): React.JSX.Element {
  const pathname = usePathname();
  const section = sections.find((item) => isActiveHref(pathname, item.href));
  const publicSection = publicSectionOf(pathname);
  const label =
    section?.label ??
    publicSection ??
    (pathname.startsWith("/profile") || pathname.startsWith("/u/") ? "Profil" : "Ton espace");
  return (
    <div className="chrome-location" aria-label="Section actuelle">
      <span>Ton espace</span>
      <strong>{label}</strong>
    </div>
  );
}
