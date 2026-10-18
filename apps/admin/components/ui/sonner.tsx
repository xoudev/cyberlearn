"use client";

// "use client": sonner keeps its queue of toasts in the browser.

import React from "react";
import { Toaster as Sonner } from "sonner";
import { TOAST_TOP_OFFSET } from "@/lib/chrome";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * The console's toasts: dark like the console, at the top centre below the
 * top bar, where the eye already is after a click. Sonner's default is the
 * bottom right corner, the furthest point from a row action on a wide screen.
 *
 * The look lives in admin-ui.css, on sonner's own data attributes, like the
 * other floating panels of the console.
 */
export function Toaster({ theme = "dark", ...props }: ToasterProps): React.JSX.Element {
  return (
    <Sonner
      theme={theme}
      position="top-center"
      offset={{ top: TOAST_TOP_OFFSET }}
      mobileOffset={{ top: TOAST_TOP_OFFSET }}
      className="a-toaster"
      {...props}
    />
  );
}
