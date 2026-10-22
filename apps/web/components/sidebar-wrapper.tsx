"use client";

// Client boundary: the drawer manages responsive visibility, keyboard focus and dismissal.

import React, { useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";

interface SidebarWrapperProps {
  children: React.ReactNode;
}

export function SidebarWrapper({ children }: SidebarWrapperProps): React.ReactElement {
  const { state, openMobile, setOpenMobile } = useSidebar();
  // This streamed boundary hydrates after its provider may already know the viewport.
  // Its own server snapshot keeps the first client render identical to the HTML.
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const collapsed = !isMobile && state === "collapsed";
  const drawerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!openMobile || !isMobile) return;
    const previousFocus = document.activeElement;
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>("a[href], button")?.focus();
    function handleKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpenMobile(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const controls = Array.from(
        drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex='0']"),
      ).filter((control) => control.offsetParent !== null);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isMobile, openMobile, setOpenMobile]);

  return (
    <>
      {openMobile && (
        <div
          aria-hidden="true"
          onClick={() => {
            setOpenMobile(false);
          }}
          className="sidebar-mobile-backdrop"
        />
      )}
      <aside
        ref={drawerRef}
        data-state={collapsed ? "collapsed" : "expanded"}
        data-mobile-open={openMobile ? "true" : "false"}
        inert={isMobile && !openMobile}
        role={isMobile ? "dialog" : undefined}
        aria-modal={isMobile && openMobile ? true : undefined}
        aria-label={isMobile ? "Navigation" : undefined}
        className="sidebar-wrapper"
        style={{
          width: collapsed ? "60px" : "240px",
          minWidth: collapsed ? "60px" : "240px",
        }}
      >
        {children}
      </aside>
    </>
  );
}
