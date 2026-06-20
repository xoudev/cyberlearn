import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { cosmeticRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { cosmeticAttrs } from "@/lib/cosmetics/attrs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default async function AppLayout({
  children,
}: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const cookieStore = await cookies();

  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie !== "false";

  // Equipped cosmetics → data-attributes on a display:contents wrapper. They
  // drive var(--cosmetic-*) across the authenticated app without affecting
  // layout. (requireRequestUser + the loadout fetch are deduped per request.)
  const user = await requireRequestUser();
  const cosmetics = cosmeticAttrs(await cosmeticRepository.findLoadout(user.id));

  return (
    // Suspense boundaries let AppSidebar, Navbar and the page render
    // concurrently; React.cache in lib/auth.ts dedupes the auth + user fetch.
    <div {...cosmetics} style={{ display: "contents" }}>
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
    </div>
  );
}
