import * as React from "react";

// Below this width the app sidebar becomes an off-canvas drawer, so the tablet
// band gets the full content width. Kept in sync with the .sidebar-wrapper drawer
// media query in globals.css and toggleSidebar's matchMedia.
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, []);

  return !!isMobile;
}
