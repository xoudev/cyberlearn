import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie !== "false";

  return (
    /*
     * Suspense boundaries let AppSidebar, Navbar, and the page render
     * concurrently instead of sequentially. React.cache in lib/auth.ts
     * ensures the Supabase auth call and DB user fetch happen only once
     * across all three components.
     */
    <SidebarProvider defaultOpen={defaultOpen}>
      <Suspense
        fallback={
          <div
            style={{
              width: 240,
              background: "#030219",
              borderRight: "1px solid #1F1B47",
              flexShrink: 0,
            }}
          />
        }
      >
        <AppSidebar />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <div
              style={{
                height: 56,
                background: "rgba(3,2,25,0.85)",
                borderBottom: "1px solid #2A2560",
                flexShrink: 0,
              }}
            />
          }
        >
          <Navbar />
        </Suspense>
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
        <Footer />
      </div>
    </SidebarProvider>
  );
}
