import React from "react";
import type { Tier } from "@cyberlearn/lib";

/**
 * Permanent prestige-tier chip shown next to the pseudo on the profile: a small
 * tier-coloured square + the tier label. Presentational; the tier is resolved
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
        background: `color-mix(in srgb, ${tier.color} 8%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          flexShrink: 0,
          background: tier.color,
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
