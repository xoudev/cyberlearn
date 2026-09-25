"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { WrappedPayload } from "@cyberlearn/lib";
import { WrappedExperience } from "./WrappedExperience";

/**
 * /wrapped, for a direct link. The app has its own story now (app/wrapped.tsx).
 *
 * The story takes the screen, so closing it has to go somewhere rather than
 * just unmount and leave a blank route behind. Back, if there is a back;
 * the dashboard otherwise, which is where somebody arriving cold belongs.
 */
export function WrappedRoute({
  payload,
  handle,
}: {
  payload: WrappedPayload | null;
  handle: string;
}): React.JSX.Element {
  const router = useRouter();

  return (
    <WrappedExperience
      payload={payload}
      handle={handle}
      onClose={() => {
        if (window.history.length > 1) router.back();
        else router.push("/dashboard");
      }}
    />
  );
}
