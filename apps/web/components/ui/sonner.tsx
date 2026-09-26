"use client";

import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { TOAST_TOP_OFFSET } from "@/lib/chrome";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Dark-only app (see RootLayout forcedTheme): toasts are always dark and never
// keyed off the stored/OS theme, so a light-styled toast can't slip through.
const Toaster = ({ theme = "dark", ...props }: ToasterProps): React.JSX.Element => {
  return (
    <Sonner
      theme={theme}
      // Top centre, below the navbar. Sonner's own default is the bottom right
      // corner, which on a wide screen is the furthest point from whatever the
      // person just clicked - a confirmation nobody sees is a confirmation that
      // did not happen. Only the top is moved; the side and bottom gaps keep
      // sonner's defaults, on desktop and on mobile alike.
      position="top-center"
      offset={{ top: TOAST_TOP_OFFSET }}
      mobileOffset={{ top: TOAST_TOP_OFFSET }}
      // The look lives in globals.css, on sonner's own data attributes, rather
      // than in shadcn utility classes: the toast is a floating panel like the
      // others here and is styled from the same place they are.
      className="toaster"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
