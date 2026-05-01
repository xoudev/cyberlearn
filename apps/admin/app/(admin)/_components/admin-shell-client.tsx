"use client";

import React, { createContext, useContext, useState } from "react";

interface SidebarContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarCtx = createContext<SidebarContextValue>({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function useAdminMobileSidebar(): SidebarContextValue {
  return useContext(SidebarCtx);
}

export function AdminShellClient({ children }: { children: React.ReactNode }): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <SidebarCtx.Provider
      value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}
    >
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 28,
          }}
        />
      )}
      {children}
    </SidebarCtx.Provider>
  );
}
