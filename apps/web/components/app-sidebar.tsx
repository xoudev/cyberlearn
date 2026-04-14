import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";

/**
 * Application sidebar with main navigation.
 * Rendered server-side — active link state is handled client-side by SidebarNav.
 * The collapsible state is managed by <SidebarProvider> via cookie.
 */
export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      {/* Logo / brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-10 font-bold" tooltip="Cyber Learn">
              <Link href="/dashboard" aria-label="Accueil Cyber Learn">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-black"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-turquoise))",
                    color: "#ffffff",
                  }}
                  aria-hidden="true"
                >
                  CL
                </span>
                <span className="font-bold tracking-tight">Cyber Learn</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation — client component for usePathname active state */}
      <SidebarContent>
        <SidebarNav />
      </SidebarContent>

      {/* Footer — reserved for user info (Phase 5) */}
      <SidebarFooter />

      {/* Narrow rail visible when sidebar is collapsed */}
      <SidebarRail />
    </Sidebar>
  );
}
