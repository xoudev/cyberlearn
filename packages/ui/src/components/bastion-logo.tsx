import React from "react";

// The const assertion preserves the read-only path contract used by web and Remotion.
export const BASTION_MARK_PATHS = {
  top: "M 128 16 L 228 74 L 188 98 L 128 63 L 68 98 L 28 74 Z",
  left: "M 28 98 L 68 122 V 174 L 116 202 V 244 L 28 192 Z",
  right: "M 228 98 V 192 L 140 244 V 202 L 188 174 V 122 Z",
  core: "M 128 92 L 168 116 V 162 L 128 186 L 88 162 V 116 Z",
} as const;

export function BastionLogo({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={BASTION_MARK_PATHS.top} fill="var(--color-brand-blue)" />
      <path d={BASTION_MARK_PATHS.left} fill="currentColor" />
      <path d={BASTION_MARK_PATHS.right} fill="currentColor" />
      <path d={BASTION_MARK_PATHS.core} fill="var(--color-brand-blue)" />
    </svg>
  );
}
