import React, { Suspense } from "react";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { cosmeticRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { NAVBAR_HEIGHT } from "@/lib/chrome";
import { cosmeticAttrs } from "@/lib/cosmetics/attrs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CosmeticsProvider } from "@/components/cosmetics-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

async function loadCosmetics(userId: string): Promise<ReturnType<typeof cosmeticAttrs>> {
  try {
    return cosmeticAttrs(await cosmeticRepository.findLoadout(userId));
  } catch (cosmeticError) {
    // Cosmetics are decorative and must never take the authenticated shell down.
    Sentry.captureException(cosmeticError, { tags: { area: "app-shell.cosmetics" } });
    return cosmeticAttrs(null);
  }
}

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
  const cosmetics = await loadCosmetics(user.id);

  return (
    // Suspense boundaries let AppSidebar, Navbar and the page render
    // concurrently; React.cache in lib/auth.ts dedupes the auth + user fetch.
    // CosmeticsProvider seeds the equipped-cosmetic attributes from the server
    // (correct first paint) and lets the casier equip them live, app-wide.
    <CosmeticsProvider initial={cosmetics}>
      <SidebarProvider defaultOpen={defaultOpen}>
        {/* First stop of the Tab key: without it, the content sat behind the
            sixteen links of the sidebar and the navbar, every page. */}
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
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
                  height: NAVBAR_HEIGHT,
                  background: "rgba(3,2,25,0.85)",
                  borderBottom: "1px solid #2A2560",
                  flexShrink: 0,
                }}
              />
            }
          >
            <Navbar />
          </Suspense>
          <main id="contenu" tabIndex={-1} className="flex flex-1 flex-col overflow-y-auto">
            {children}
          </main>
          <Footer />
        </div>
      </SidebarProvider>
    </CosmeticsProvider>
  );
}
