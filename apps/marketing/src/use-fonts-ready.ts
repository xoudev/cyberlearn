import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

export function useFontsReady(): void {
  const [handle] = useState(() => delayRender("Waiting for local brand fonts"));

  useEffect(() => {
    document.fonts.ready
      .then(() => continueRender(handle))
      .catch((error: unknown) => {
        cancelRender(error instanceof Error ? error : new Error("Unable to load local fonts"));
      });
  }, [handle]);
}
