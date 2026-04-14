"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, LayoutGrid, Medal, User } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/lessons", label: "Leçons", icon: BookOpen },
  { href: "/paths", label: "Parcours", icon: LayoutGrid },
  { href: "/badges", label: "Badges", icon: Medal },
  { href: "/profile", label: "Profil", icon: User },
] as const;

/** Client component: renders nav items with active state via usePathname. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
              <Link href={href}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
