import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

/**
 * Layout for all authenticated app pages: dashboard, lessons, paths, etc.
 *
 * Reads the sidebar state cookie server-side so the sidebar renders in the
 * correct position on first paint — no layout flash.
 * Cookie name matches the default used by shadcn's SidebarProvider ("sidebar_state").
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  // Default: open on first visit. After that, persisted in "sidebar_state" cookie.
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <Navbar />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
