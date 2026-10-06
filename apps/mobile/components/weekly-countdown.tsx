import React, { useEffect, useRef, useState } from "react";
import { colors } from "@cyberlearn/tokens";
import { remainingLabel } from "@cyberlearn/lib/challenges/weekly";
import { Text } from "@/components/ui";

/**
 * The time left on the week's challenge, as on the site: "XP ×2 encore
 * 5 j 11 h", ticking every second. When the week ends, `onEnd` reads the list
 * again: another challenge takes over, and the bonus with it.
 */
export function WeeklyCountdown({
  endsAt,
  prefix,
  onEnd,
}: {
  /** ISO 8601, the end of the week. */
  endsAt: string;
  /** What runs out: "XP ×2 encore", "Prochain défi dans". */
  prefix: string;
  onEnd?: () => void;
}): React.JSX.Element {
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const left = Date.parse(endsAt) - now;
  useEffect(() => {
    if (left <= 0 && !ended.current) {
      ended.current = true;
      onEnd?.();
    }
  }, [left, onEnd]);

  return (
    <Text
      variant="mono"
      style={{ color: colors.warning, fontSize: 12 }}
      accessibilityLabel={`${prefix} ${remainingLabel(left)}`}
    >
      {`◷ ${prefix} ${remainingLabel(left)}`}
    </Text>
  );
}
