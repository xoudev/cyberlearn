"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

interface SidebarWrapperProps {
  children: React.ReactNode;
}

export function SidebarWrapper({ children }: SidebarWrapperProps): React.ReactElement {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  // Folded is a desktop state (the cookie, the focus mode): the drawer of a
  // phone or a tablet is always unfolded, or it would be a column of icons with
  // no name on them (the stylesheet's `data-state="collapsed"` rules hide the
  // labels).
  const folded = !isMobile && state === "collapsed";

  // The drawer lives in the layout, which a navigation does not remount: left
  // to itself it stays open over the page a link has just opened, and the reader
  // has to dismiss it to see what they asked for. A new address closes it.
  React.useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  // A link to the page already open changes no address, and the drawer would
  // stay all the same: any link in it closes it.
  function closeOnLink(event: React.MouseEvent<HTMLElement>): void {
    if (event.target instanceof Element && event.target.closest("a[href]") !== null) {
      setOpenMobile(false);
    }
  }

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
        data-state={folded ? "collapsed" : "expanded"}
        data-mobile-open={openMobile ? "true" : "false"}
        className="sidebar-wrapper"
        onClick={closeOnLink}
        style={{
          width: folded ? "60px" : "240px",
          minWidth: folded ? "60px" : "240px",
        }}
      >
        {children}
      </aside>
    </>
  );
}
