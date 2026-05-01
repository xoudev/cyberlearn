"use client";

import React from "react";
import { useSidebar } from "@/components/ui/sidebar";

interface SidebarWrapperProps {
  children: React.ReactNode;
}

export function SidebarWrapper({ children }: SidebarWrapperProps): React.ReactElement {
  const { state, openMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

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
        data-state={state}
        data-mobile-open={openMobile ? "true" : "false"}
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
