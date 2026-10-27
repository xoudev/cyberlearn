"use client";

import React, { createContext, useContext, useState, useEffect, useSyncExternalStore } from "react";
import { AdminConfirmationProvider } from "./admin-confirmation";

interface SidebarContextValue {
  open: boolean;
  mobile: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarCtx = createContext<SidebarContextValue>({
  open: false,
  mobile: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggle: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  close: () => {},
});

export function useAdminMobileSidebar(): SidebarContextValue {
  return useContext(SidebarCtx);
}

function subscribeMobile(listener: () => void): () => void {
  const media = window.matchMedia("(max-width: 1023px)");
  media.addEventListener("change", listener);
  return () => {
    media.removeEventListener("change", listener);
  };
}

function isMobile(): boolean {
  return window.matchMedia("(max-width: 1023px)").matches;
}

export function AdminShellClient({ children }: { children: React.ReactNode }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const mobile = useSyncExternalStore(subscribeMobile, isMobile, () => false);

  useEffect(() => {
    if (!open || !mobile) return;
    const navigation = document.getElementById("admin-navigation");
    const workspace = document.querySelector<HTMLElement>(".admin-content-area");
    const topbar = document.querySelector<HTMLElement>(".a-topbar");
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (workspace) workspace.inert = true;
    if (topbar) topbar.inert = true;
    navigation?.querySelector<HTMLElement>("button, a[href]")?.focus();

    function onKey(event: KeyboardEvent): void {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !navigation) return;
      const controls = navigation.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (workspace) workspace.inert = false;
      if (topbar) topbar.inert = false;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open, mobile]);

  return (
    <SidebarCtx.Provider
      value={{
        open: open && mobile,
        mobile,
        toggle: () => {
          setOpen((v) => !v);
        },
        close: () => {
          setOpen(false);
        },
      }}
    >
      {open && mobile && (
        <div
          aria-hidden="true"
          onClick={() => {
            setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "color-mix(in srgb, var(--a-bg) 65%, transparent)",
            zIndex: 28,
          }}
        />
      )}
      <AdminConfirmationProvider>{children}</AdminConfirmationProvider>
    </SidebarCtx.Provider>
  );
}
