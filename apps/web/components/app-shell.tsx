import React, { Suspense } from "react";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { cosmeticRepository } from "@cyberlearn/db";
import { NAVBAR_HEIGHT } from "@/lib/chrome";
import { cosmeticAttrs } from "@/lib/cosmetics/attrs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CosmeticsProvider } from "@/components/cosmetics-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { QueryDialogHost } from "@/components/query-dialog-host";
import { SettingsDrawerProvider } from "@/app/(app)/_settings/_components/SettingsDrawer";
import { brandTypeface } from "@/components/brand-typeface";
import "./app-chrome.css";

async function loadCosmetics(userId: string): Promise<ReturnType<typeof cosmeticAttrs>> {
  try {
    return cosmeticAttrs(await cosmeticRepository.findLoadout(userId));
  } catch (cosmeticError) {
    // Cosmetics are decorative and must never take the authenticated shell down.
    Sentry.captureException(cosmeticError, { tags: { area: "app-shell.cosmetics" } });
    return cosmeticAttrs(null);
  }
}

/**
 * The signed-in site around a page: the sidebar, the navbar, the footer, and
 * the providers they and the page share.
 *
 * The (app) layout draws every page of the signed-in site in it. A public
 * profile draws itself in it too when a session reads it (app/u/[username]),
 * which the layout cannot do: it sends anybody signed out to the login, and
 * a profile is a page a stranger can open from a link. Whoever renders it has
 * checked the session; `userId` is that session's account.
 */
export async function AppShell({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const cookieStore = await cookies();

  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie !== "false";

  // Equipped cosmetics → data-attributes on a display:contents wrapper. They
  // drive var(--cosmetic-*) across the authenticated app without affecting
  // layout. (The session read and the loadout fetch are deduped per request.)
  const cosmetics = await loadCosmetics(userId);

  return (
    // Suspense boundaries let AppSidebar, Navbar and the page render
    // concurrently; React.cache in lib/auth.ts dedupes the auth + user fetch.
    // CosmeticsProvider seeds the equipped-cosmetic attributes from the server
    // (correct first paint) and lets the casier equip them live, app-wide.
    // SettingsDrawerProvider opens the settings over whatever page is shown,
    // from the navbar's gear or any link to them, without a navigation.
    // QueryDialogHost opens the windows an address asks for (?settings=,
    // components/query-dialogs.ts), inside the provider the settings' entry
    // hands its request to.
    <CosmeticsProvider initial={cosmetics}>
      <SettingsDrawerProvider>
        <SidebarProvider defaultOpen={defaultOpen} className={`app-frame ${brandTypeface}`}>
          {/* First stop of the Tab key: without it, the content sat behind the
            sixteen links of the sidebar and the navbar, every page. */}
          <a href="#contenu" className="skip-link">
            Aller au contenu
          </a>
          {/* The placeholder holds the sidebar's column only where the sidebar is
            one (.sidebar-fallback, globals.css): on a phone it is a drawer and
            holds no room, so the page keeps the whole width while it streams. */}
          <Suspense fallback={<div className="sidebar-fallback" />}>
            <AppSidebar />
          </Suspense>

          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense
              fallback={
                <div
                  style={{
                    height: NAVBAR_HEIGHT,
                    background: "var(--color-bg-base)",
                    borderBottom: "1px solid var(--color-border-default)",
                    flexShrink: 0,
                  }}
                />
              }
            >
              <Navbar />
            </Suspense>
            {/* The window scrolls, not <main>: nothing bounds its height. It
              clips what a page lets out sideways (the dashboard's 760px glow)
              with overflow-x: clip, which is not a scroll container. It was
              overflow-y: auto, which made <main> the box every sticky element
              of a page measured itself against, and since that box never
              scrolled, nothing ever stuck. */}
            <main id="contenu" tabIndex={-1} className="flex flex-1 flex-col overflow-x-clip">
              {children}
            </main>
            <Footer signedIn />
          </div>
        </SidebarProvider>
        <QueryDialogHost />
      </SettingsDrawerProvider>
    </CosmeticsProvider>
  );
}
