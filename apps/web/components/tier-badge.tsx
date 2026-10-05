import React from "react";
import type { Tier } from "@cyberlearn/lib";

const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

/**
 * Permanent prestige-tier chip shown next to the pseudo on the profile: a small
 * tier-colored hexagon + the tier label. Presentational; the tier is resolved
 * server-side via computeTier(level).
 */
export function TierBadge({ tier }: { tier: Tier }): React.ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px 5px 8px",
        border: `1px solid ${tier.color}`,
        background: `${tier.color}14`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 18,
          flexShrink: 0,
          clipPath: HEX,
          background: tier.color,
          boxShadow: `0 0 8px ${tier.color}66`,
        }}
      />
      <span
        className="mono-label"
        style={{
          fontWeight: 700,
          color: tier.color,
        }}
      >
        {tier.label}
      </span>
    </span>
  );
}
