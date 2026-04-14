import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@cyberlearn/ui";

interface NavbarProps {
  /** Page title shown in the header breadcrumb area */
  title?: string;
}

/**
 * Top navigation bar for authenticated pages.
 * Contains the sidebar toggle, page title, notification bell, and theme toggle.
 * User avatar dropdown will be added in Phase 5 (user profile).
 */
export function Navbar({ title }: NavbarProps) {
  return (
    <header
      className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b px-4"
      style={{
        backgroundColor: "var(--color-bg-base)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      {/* Sidebar collapse trigger (hamburger / chevron) */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Page title */}
      {title && (
        <h1 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h1>
      )}

      {/* Right-side controls */}
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell unreadCount={0} />
        <ThemeToggle />
      </div>
    </header>
  );
}
